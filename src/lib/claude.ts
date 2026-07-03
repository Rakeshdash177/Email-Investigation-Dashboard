import Anthropic from "@anthropic-ai/sdk";
import type { ClassifiedAudit, FlaggedRule } from "./audit";
import type { ScoredSignIn } from "./risk";
import type { GraphDirectoryAudit, GraphRiskyUser } from "./graph";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment. Server-side only — this
  // module must never be imported from client components.
  if (!client) client = new Anthropic();
  return client;
}

export interface NarrativeInput {
  tenantDisplayName: string;
  userDisplayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  lastPasswordChangeDateTime: string | null;
  rangeLabel: string; // e.g. "Last 7 days"
  signins: ScoredSignIn[];
  audits: GraphDirectoryAudit[];
  riskyUser: GraphRiskyUser | null;
  /** Live inbox rules with suspicion flags; null when unavailable. */
  inboxRules?: FlaggedRule[] | null;
  /** Deep-audit findings (mailbox deletes, downloads, mass-delete alerts); null when not run. */
  auditFindings?: ClassifiedAudit | null;
}

function summarizeForPrompt(input: NarrativeInput): string {
  const uniqueIPs = new Set(input.signins.map((s) => s.ip));
  const uniqueLocations = new Set(input.signins.map((s) => `${s.city}, ${s.state}, ${s.country}`));
  const failed = input.signins.filter((s) => s.err !== 0).length;
  const notable = [...input.signins].filter((s) => s.score >= 2).sort((a, b) => b.score - a.score);

  const lines: string[] = [];
  lines.push(`Tenant: ${input.tenantDisplayName}`);
  lines.push(`Subject: ${input.userDisplayName} <${input.userPrincipalName}>`);
  lines.push(`Account enabled: ${input.accountEnabled}`);
  lines.push(`Last password change: ${input.lastPasswordChangeDateTime ?? "unknown"}`);
  lines.push(`Window analyzed: ${input.rangeLabel}`);
  lines.push(
    `Sign-ins analyzed: ${input.signins.length} | Unique IPs: ${uniqueIPs.size} | ` +
      `Unique locations: ${uniqueLocations.size} | Failed sign-ins: ${failed}`,
  );
  if (input.riskyUser) {
    lines.push(
      `Identity Protection risky-user record: riskLevel=${input.riskyUser.riskLevel} ` +
        `riskState=${input.riskyUser.riskState} detail=${input.riskyUser.riskDetail}`,
    );
  } else {
    lines.push("Identity Protection risky-user data: not available (permission not consented, or clean).");
  }
  lines.push("");
  lines.push("NOTABLE SIGN-INS (score >= 2, highest first, heuristic triage score not ground truth):");
  if (notable.length === 0) lines.push("(none)");
  for (const s of notable.slice(0, 60)) {
    lines.push(
      `- ${s.t} | score ${s.score} | ${s.app} | ${s.ip} | ${s.city}, ${s.state} | ` +
        `${s.os}${s.browser ? "/" + s.browser : ""} | ${s.reasons.join("; ")}`,
    );
  }
  lines.push("");
  lines.push("DIRECTORY AUDIT EVENTS (actor or target = this user):");
  if (input.audits.length === 0) lines.push("(none)");
  for (const a of input.audits.slice(0, 60)) {
    const targets = a.targetResources
      .map((t) => t.displayName)
      .filter(Boolean)
      .join(", ");
    lines.push(`- ${a.activityDateTime} | ${a.activityDisplayName} | ${a.result} | target: ${targets}`);
  }

  if (input.inboxRules != null) {
    lines.push("");
    lines.push("CURRENT INBOX RULES (live from mailbox; flags are heuristic BEC indicators):");
    if (input.inboxRules.length === 0) lines.push("(none)");
    for (const r of input.inboxRules) {
      lines.push(
        `- "${r.displayName}" | enabled: ${r.isEnabled} | ${r.flags.length ? "FLAGS: " + r.flags.join("; ") : "no flags"}`,
      );
    }
  }

  const af = input.auditFindings;
  if (af) {
    lines.push("");
    lines.push("MAILBOX/FILE AUDIT FINDINGS (Purview unified audit log for this user and window):");
    lines.push("Rule change events:");
    if (af.ruleEvents.length === 0) lines.push("(none)");
    for (const e of af.ruleEvents.slice(0, 30)) {
      lines.push(
        `- ${e.t} | ${e.operation} | rule: ${e.ruleName ?? "?"} | ip: ${e.clientIP ?? "?"}${e.parameters ? " | " + e.parameters : ""}`,
      );
    }
    lines.push(`Mailbox deletions (${af.mailboxDeletes.length} events):`);
    for (const e of af.mailboxDeletes.slice(0, 30)) {
      lines.push(
        `- ${e.t} | ${e.operation} | ${e.subjects.length} item(s)${e.subjects.length ? ": " + e.subjects.slice(0, 5).join(" / ") : ""} | ip: ${e.clientIP ?? "?"}`,
      );
    }
    lines.push(`File downloads (${af.fileDownloads.length} events):`);
    for (const e of af.fileDownloads.slice(0, 30)) {
      lines.push(`- ${e.t} | ${e.operation} | ${e.filePath ?? e.fileName ?? "?"} | ip: ${e.clientIP ?? "?"}`);
    }
    lines.push(`File deletions (${af.fileDeletes.length} events):`);
    for (const e of af.fileDeletes.slice(0, 30)) {
      lines.push(`- ${e.t} | ${e.operation} | ${e.filePath ?? e.fileName ?? "?"} | ip: ${e.clientIP ?? "?"}`);
    }
    lines.push("Mass-delete alerts (>= 20 deletions within one hour):");
    if (af.massDeleteAlerts.length === 0) lines.push("(none)");
    for (const alert of af.massDeleteAlerts) {
      lines.push(`- ${alert.hourISO} | ${alert.kind} | ${alert.count} deletions`);
    }
  }

  return lines.join("\n");
}

/**
 * Generates the human-readable narrative section of the compromise report
 * from structured findings (heuristic scoring + audit events) — never raw
 * tokens/secrets. Uses Claude Fable 5 with the server-side refusal fallback
 * opted in by default (falls back to Opus 4.8 on a policy decline), since
 * this endpoint may occasionally touch security-adjacent content that trips
 * false-positive classifiers.
 */
export async function generateNarrativeReport(input: NarrativeInput): Promise<string> {
  const prompt = summarizeForPrompt(input);

  const response = await getClient().beta.messages.create({
    model: "claude-fable-5",
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-06-01"],
    fallbacks: [{ model: "claude-opus-4-8" }],
    output_config: { effort: "medium" },
    system:
      "You are a security analyst writing the narrative section of a Business Email Compromise (BEC) " +
      "investigation report from structured Microsoft Entra ID sign-in and audit log findings supplied " +
      "by the user. Write a concise executive summary of what happened (or didn't), cite the specific " +
      "evidence lines that support each claim, and end with concrete recommended next steps ranked by " +
      "urgency. Do not invent data that isn't present in the findings. If the evidence is inconclusive, " +
      "say so plainly rather than overstating confidence.",
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      "The narrative model declined to generate this report. The heuristic findings below are still complete.",
    );
  }

  return response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
