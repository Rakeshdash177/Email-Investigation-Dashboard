import { NextRequest, NextResponse } from "next/server";
import { classifyAuditRecords, flagSuspiciousRules, type ClassifiedAudit } from "@/lib/audit";
import { generateNarrativeReport } from "@/lib/claude";
import {
  getRiskyUser,
  GraphError,
  listAuditRecords,
  listDirectoryAudits,
  listInboxRules,
  listSignIns,
} from "@/lib/graph";
import { deriveBaseline, resolveRange, scoreSignin, type SignInEvent, type TimelineRange } from "@/lib/risk";
import { getTenant } from "@/lib/tenants";

const VALID_RANGES: TimelineRange[] = ["24h", "7d", "30d", "90d", "custom"];

const RANGE_LABELS: Record<TimelineRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  custom: "Custom range",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId: recordId } = await params;
  const record = await getTenant(recordId);
  if (!record || record.status !== "active" || !record.tenantId) {
    return NextResponse.json({ error: "Tenant not found or not yet active" }, { status: 404 });
  }

  const url = new URL(req.url);
  const upn = url.searchParams.get("upn");
  const rangeParam = (url.searchParams.get("range") ?? "7d") as TimelineRange;
  const wantNarrative = url.searchParams.get("narrative") === "true";
  const displayName = url.searchParams.get("displayName") ?? upn ?? "";
  const accountEnabled = url.searchParams.get("accountEnabled") === "true";
  const lastPwdChange = url.searchParams.get("lastPasswordChangeDateTime");

  if (!upn) return NextResponse.json({ error: "upn is required" }, { status: 400 });
  if (!VALID_RANGES.includes(rangeParam)) {
    return NextResponse.json(
      { error: `range must be one of ${VALID_RANGES.join(", ")}` },
      { status: 400 },
    );
  }

  let startISO: string;
  let endISO: string;
  try {
    const custom =
      rangeParam === "custom"
        ? { start: url.searchParams.get("start") ?? "", end: url.searchParams.get("end") ?? "" }
        : undefined;
    ({ startISO, endISO } = resolveRange(rangeParam, custom));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  // When the client has a completed deep-audit query, it passes the query id
  // so the narrative can incorporate mailbox/file findings — re-fetching the
  // records of a succeeded Purview query is fast (results are materialized).
  const auditQueryId = url.searchParams.get("auditQueryId");

  try {
    const [rawSignins, audits, riskyUser, inboxRulesResult] = await Promise.all([
      listSignIns(record.tenantId, { upn, startISO, endISO }),
      listDirectoryAudits(record.tenantId, { upn, startISO, endISO }),
      getRiskyUser(record.tenantId, upn),
      listInboxRules(record.tenantId, upn),
    ]);

    const tenantDomains = [record.defaultDomain, record.domainOrId.includes(".") ? record.domainOrId : null]
      .filter((d): d is string => !!d);
    const inboxRules =
      inboxRulesResult.available
        ? { available: true as const, rules: flagSuspiciousRules(inboxRulesResult.rules, tenantDomains) }
        : inboxRulesResult;

    let auditFindings: ClassifiedAudit | null = null;
    if (wantNarrative && auditQueryId) {
      try {
        auditFindings = classifyAuditRecords(await listAuditRecords(record.tenantId, auditQueryId));
      } catch {
        // Narrative degrades to identity-plane evidence only.
      }
    }

    const signinEvents: SignInEvent[] = rawSignins.map((s) => ({
      id: s.id,
      t: s.createdDateTime,
      app: s.appDisplayName,
      ip: s.ipAddress,
      city: s.location?.city ?? "",
      state: s.location?.state ?? "",
      country: s.location?.countryOrRegion ?? "",
      os: s.deviceDetail?.operatingSystem ?? "",
      browser: s.deviceDetail?.browser ?? "",
      device: s.deviceDetail?.displayName ?? "",
      compliant: !!s.deviceDetail?.isCompliant,
      managed: !!s.deviceDetail?.isManaged,
      auth: s.authenticationRequirement,
      ca: s.conditionalAccessStatus,
      risk: s.riskLevelAggregated,
      err: s.status?.errorCode ?? 0,
    }));

    const baseline = deriveBaseline(signinEvents);
    const scored = signinEvents.map((s) => scoreSignin(s, baseline));

    let narrative: string | null = null;
    let narrativeError: string | null = null;
    if (wantNarrative) {
      try {
        narrative = await generateNarrativeReport({
          tenantDisplayName: record.displayName ?? record.domainOrId,
          userDisplayName: displayName,
          userPrincipalName: upn,
          accountEnabled,
          lastPasswordChangeDateTime: lastPwdChange,
          rangeLabel: rangeParam === "custom" ? `${startISO} to ${endISO}` : RANGE_LABELS[rangeParam],
          signins: scored,
          audits,
          riskyUser,
          inboxRules: inboxRules.available ? inboxRules.rules : null,
          auditFindings,
        });
      } catch (err) {
        narrativeError = (err as Error).message;
      }
    }

    return NextResponse.json({
      range: { range: rangeParam, startISO, endISO },
      signins: scored,
      audits,
      riskyUser,
      inboxRules,
      narrative,
      narrativeError,
    });
  } catch (err) {
    if (err instanceof GraphError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
