"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Download,
  Globe,
  Key,
  Loader2,
  MapPin,
  Monitor,
  Shield,
  Smartphone,
  Sparkles,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuditFeed from "./AuditFeed";
import DeepAuditSection, { type DeepAuditState } from "./DeepAuditSection";
import InboxRulesPanel, { type InboxRulesView } from "./InboxRulesPanel";
import Meta from "./Meta";
import Panel from "./Panel";
import SignInTable from "./SignInTable";
import Stat from "./Stat";
import TimelineSelector from "./TimelineSelector";
import UserSidebar from "./UserSidebar";
import type { GraphDirectoryAudit, GraphRiskyUser, GraphUser } from "@/lib/graph";
import { riskColor, riskLabel, type ScoredSignIn, type TimelineRange } from "@/lib/risk";
import type { TenantRecord } from "@/lib/tenants";

interface ReportResponse {
  range: { range: TimelineRange; startISO: string; endISO: string };
  signins: ScoredSignIn[];
  audits: GraphDirectoryAudit[];
  riskyUser: GraphRiskyUser | null;
  inboxRules: InboxRulesView;
  narrative: string | null;
  narrativeError: string | null;
}

const RANGE_LABELS: Record<TimelineRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  custom: "Custom range",
};

export default function InvestigationDashboard({ tenantId }: { tenantId: string }) {
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [users, setUsers] = useState<GraphUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUpn, setSelectedUpn] = useState<string | null>(null);
  const [range, setRange] = useState<TimelineRange>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [deepAudit, setDeepAudit] = useState<DeepAuditState | null>(null);

  // Stable callback for DeepAuditSection so its reset effect doesn't re-run
  // every render.
  const handleDeepAuditResults = useCallback((state: DeepAuditState | null) => {
    setDeepAudit(state);
  }, []);

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((body) => setTenant(body.tenant ?? null));

    setUsersLoading(true);
    fetch(`/api/tenants/${tenantId}/users`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Failed to load users");
        setUsers(body.users ?? []);
      })
      .catch((err) => setUsersError((err as Error).message))
      .finally(() => setUsersLoading(false));
  }, [tenantId]);

  const selectedUser = users.find((u) => u.userPrincipalName === selectedUpn);

  async function loadReport(
    params: { upn: string; range: TimelineRange; customStart?: string; customEnd?: string },
    narrative: boolean,
  ) {
    if (narrative) setNarrativeLoading(true);
    else setReportLoading(true);
    setReportError(null);
    try {
      const user = users.find((u) => u.userPrincipalName === params.upn);
      const qs = new URLSearchParams({
        upn: params.upn,
        range: params.range,
        narrative: narrative ? "true" : "false",
        displayName: user?.displayName ?? params.upn,
        accountEnabled: String(user?.accountEnabled ?? false),
      });
      if (user?.lastPasswordChangeDateTime) {
        qs.set("lastPasswordChangeDateTime", user.lastPasswordChangeDateTime);
      }
      if (params.range === "custom" && params.customStart && params.customEnd) {
        qs.set("start", params.customStart);
        qs.set("end", params.customEnd);
      }
      // If a deep mailbox/files audit has completed for this scope, hand its
      // query id to the narrative so Fable 5 can factor in those findings.
      if (narrative && deepAudit) {
        qs.set("auditQueryId", deepAudit.queryId);
      }
      const res = await fetch(`/api/tenants/${tenantId}/report?${qs.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load report");
      setReport(body);
    } catch (err) {
      setReportError((err as Error).message);
    } finally {
      if (narrative) setNarrativeLoading(false);
      else setReportLoading(false);
    }
  }

  const handleSelectUser = (upn: string) => {
    setSelectedUpn(upn);
    setReport(null);
    loadReport({ upn, range, customStart, customEnd }, false);
  };

  const handleRangeChange = (r: TimelineRange) => {
    setRange(r);
    if (r !== "custom" && selectedUpn) {
      loadReport({ upn: selectedUpn, range: r }, false);
    }
  };

  const applyCustomRange = () => {
    if (selectedUpn && customStart && customEnd) {
      loadReport({ upn: selectedUpn, range: "custom", customStart, customEnd }, false);
    }
  };

  const handleGenerateNarrative = () => {
    if (!selectedUpn) return;
    loadReport({ upn: selectedUpn, range, customStart, customEnd }, true);
  };

  const signins = report?.signins ?? [];
  const audits = report?.audits ?? [];

  const uniqueIPs = useMemo(() => [...new Set(signins.map((s) => s.ip))], [signins]);
  const uniqueLocations = useMemo(
    () => [...new Set(signins.map((s) => `${s.city}, ${s.state}`))],
    [signins],
  );
  const uniqueApps = useMemo(() => [...new Set(signins.map((s) => s.app))], [signins]);
  const uniqueDevices = useMemo(
    () => [...new Set(signins.map((s) => s.device).filter(Boolean))],
    [signins],
  );
  const failedCount = signins.filter((s) => s.err !== 0).length;
  const offNetworkCount = signins.filter((s) => s.reasons.includes("Off-network IP / location")).length;
  const maxScore = signins.length ? Math.max(...signins.map((s) => s.score)) : 0;

  const exportRaw = () => {
    if (!selectedUser || !report) return;
    const lines: string[] = [];
    lines.push("BEC INVESTIGATION REPORT");
    lines.push(`Tenant: ${tenant?.displayName ?? tenant?.domainOrId ?? tenantId}`);
    lines.push(`Subject: ${selectedUser.displayName} <${selectedUser.userPrincipalName}>`);
    lines.push(`Window: ${RANGE_LABELS[report.range.range]} (${report.range.startISO} to ${report.range.endISO})`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(
      `Account enabled: ${selectedUser.accountEnabled}  |  Last password change: ${
        selectedUser.lastPasswordChangeDateTime ?? "unknown"
      }`,
    );
    lines.push("");
    if (report.narrative) {
      lines.push("AI NARRATIVE SUMMARY");
      lines.push(report.narrative);
      lines.push("");
    }
    lines.push("SUMMARY");
    lines.push(`Sign-ins analyzed: ${signins.length}`);
    lines.push(
      `Unique IPs: ${uniqueIPs.length}  |  Unique locations: ${uniqueLocations.length}  |  Apps accessed: ${uniqueApps.length}`,
    );
    lines.push(`Failed sign-ins: ${failedCount}  |  Off-network sign-ins: ${offNetworkCount}`);
    lines.push("");
    lines.push("SIGN-IN DETAIL");
    signins.forEach((s) => {
      lines.push(
        `[${riskLabel(s.score)}] ${s.t} | ${s.app} | ${s.ip} | ${s.city}, ${s.state} | ${s.os}${
          s.browser ? " / " + s.browser : ""
        } | device:${s.device || "unmanaged"} compliant:${s.compliant} | err:${s.err} | ${s.reasons.join("; ")}`,
      );
    });
    lines.push("");
    lines.push("AUDIT EVENTS");
    audits.forEach((a) => {
      const targets = a.targetResources.map((t) => t.displayName).filter(Boolean).join(", ");
      lines.push(`${a.activityDateTime} | ${a.activityDisplayName} | ${a.result} | ${targets}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BEC-report-${selectedUser.userPrincipalName.replace(/[@.]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/" style={{ color: "#64748b", display: "flex" }} title="Back to tenants">
            <ArrowLeft size={20} />
          </a>
          <Shield size={28} color="#38bdf8" />
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>Email Compromise Investigation</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              {tenant?.displayName ?? tenant?.domainOrId ?? "Loading tenant…"} · live Microsoft Graph data
            </div>
          </div>
        </div>
        {selectedUser && report && (
          <button
            onClick={exportRaw}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#334155",
              color: "#fff",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <Download size={15} /> Export raw
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "16px" }}>
        <div>
          {usersLoading && (
            <div style={{ fontSize: "12px", color: "#64748b", padding: "8px" }}>Loading users…</div>
          )}
          {usersError && (
            <div style={{ fontSize: "12px", color: "#f87171", padding: "8px" }}>{usersError}</div>
          )}
          {!usersLoading && !usersError && (
            <UserSidebar users={users} selectedUpn={selectedUpn} onSelect={handleSelectUser} />
          )}
        </div>

        <div>
          <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <TimelineSelector
              range={range}
              onRangeChange={handleRangeChange}
              customStart={customStart}
              customEnd={customEnd}
              onCustomChange={(s, e) => {
                setCustomStart(s);
                setCustomEnd(e);
              }}
            />
            {range === "custom" && (
              <button
                onClick={applyCustomRange}
                disabled={!customStart || !customEnd || !selectedUpn}
                style={{
                  marginTop: "8px",
                  background: "#0ea5e9",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply range
              </button>
            )}
          </div>

          {!selectedUpn && (
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              Select a user from the sidebar to generate a compromise report.
            </div>
          )}

          {selectedUpn && reportLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "24px", color: "#64748b", fontSize: "13px" }}>
              <Loader2 size={16} className="spin" /> Pulling sign-in and audit data from Microsoft Graph…
            </div>
          )}

          {reportError && (
            <div
              style={{
                background: "#450a0a",
                border: "1px solid #991b1b",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "16px",
                fontSize: "12px",
                color: "#fca5a5",
              }}
            >
              {reportError}
            </div>
          )}

          {selectedUser && report && !reportLoading && (
            <>
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "#0ea5e9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "16px",
                    }}
                  >
                    {selectedUser.displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 700 }}>{selectedUser.displayName}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{selectedUser.userPrincipalName}</div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Highest signal</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: riskColor(maxScore) }}>
                      {riskLabel(maxScore)}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "8px",
                    fontSize: "12px",
                  }}
                >
                  <Meta
                    icon={<User size={13} />}
                    label="Account"
                    value={selectedUser.accountEnabled ? "Enabled" : "Disabled"}
                    color={selectedUser.accountEnabled ? "#16a34a" : "#94a3b8"}
                  />
                  <Meta
                    icon={<Key size={13} />}
                    label="Last pwd change"
                    value={
                      selectedUser.lastPasswordChangeDateTime
                        ? new Date(selectedUser.lastPasswordChangeDateTime).toLocaleDateString()
                        : "Unknown"
                    }
                  />
                  <Meta icon={<Activity size={13} />} label="Sign-ins" value={signins.length} />
                  <Meta
                    icon={<AlertTriangle size={13} />}
                    label="Failed"
                    value={failedCount}
                    color={failedCount ? "#d97706" : "#16a34a"}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <button
                  onClick={handleGenerateNarrative}
                  disabled={narrativeLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#7c3aed",
                    color: "#fff",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    cursor: narrativeLoading ? "default" : "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                    opacity: narrativeLoading ? 0.7 : 1,
                  }}
                >
                  {narrativeLoading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
                  {narrativeLoading ? "Generating with Fable 5…" : "Generate AI Report"}
                </button>
              </div>

              {report.narrativeError && (
                <div
                  style={{
                    background: "#422006",
                    border: "1px solid #92400e",
                    borderRadius: "10px",
                    padding: "12px",
                    marginBottom: "16px",
                    fontSize: "12px",
                    color: "#fcd34d",
                  }}
                >
                  {report.narrativeError}
                </div>
              )}

              {report.narrative && (
                <div
                  style={{
                    background: "#1e293b",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "16px",
                    borderLeft: "3px solid #7c3aed",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#c4b5fd",
                    }}
                  >
                    <Sparkles size={16} /> AI Narrative Summary
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#e2e8f0" }}>
                    {report.narrative}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <Stat icon={<Globe size={18} />} value={uniqueIPs.length} label="Unique IPs" />
                <Stat icon={<MapPin size={18} />} value={uniqueLocations.length} label="Locations" />
                <Stat icon={<Monitor size={18} />} value={uniqueApps.length} label="Apps accessed" />
                <Stat icon={<Smartphone size={18} />} value={uniqueDevices.length} label="Managed devices" />
                <Stat
                  icon={<AlertTriangle size={18} />}
                  value={offNetworkCount}
                  label="Off-baseline"
                  color={offNetworkCount > 0 ? "#d97706" : "#16a34a"}
                />
              </div>

              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Activity size={16} color="#38bdf8" /> Sign-in Forensics
                </div>
                <SignInTable signins={signins} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <Panel title="IP Addresses" icon={<Globe size={15} color="#38bdf8" />}>
                  {uniqueIPs.map((ip) => {
                    const count = signins.filter((s) => s.ip === ip).length;
                    const off = signins.find((s) => s.ip === ip)?.reasons.includes("Off-network IP / location");
                    return (
                      <div
                        key={ip}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "5px 0",
                          borderBottom: "1px solid #283548",
                          fontSize: "11px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            color: off ? "#fbbf24" : "#cbd5e1",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "180px",
                          }}
                        >
                          {ip}
                        </span>
                        <span style={{ color: "#64748b" }}>{count}×</span>
                      </div>
                    );
                  })}
                </Panel>
                <Panel title="Apps Accessed" icon={<Monitor size={15} color="#38bdf8" />}>
                  {uniqueApps.map((app) => {
                    const count = signins.filter((s) => s.app === app).length;
                    return (
                      <div
                        key={app}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "5px 0",
                          borderBottom: "1px solid #283548",
                          fontSize: "11px",
                        }}
                      >
                        <span style={{ color: "#cbd5e1" }}>{app}</span>
                        <span style={{ color: "#64748b" }}>{count}×</span>
                      </div>
                    );
                  })}
                </Panel>
              </div>

              <InboxRulesPanel
                inboxRules={report.inboxRules}
                ruleEvents={deepAudit?.results.ruleEvents ?? null}
              />

              <DeepAuditSection
                tenantId={tenantId}
                upn={selectedUser.userPrincipalName}
                range={range}
                customStart={customStart}
                customEnd={customEnd}
                onResults={handleDeepAuditResults}
              />

              <AuditFeed audits={audits} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
