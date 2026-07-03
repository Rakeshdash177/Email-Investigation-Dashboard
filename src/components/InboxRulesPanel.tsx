import { AlertTriangle, Mail } from "lucide-react";
import { fmt } from "@/lib/risk";
import type { FlaggedRule, RuleEvent } from "@/lib/audit";

export type InboxRulesView =
  | { available: true; rules: FlaggedRule[] }
  | { available: false; reason: string };

export default function InboxRulesPanel({
  inboxRules,
  ruleEvents,
}: {
  inboxRules: InboxRulesView;
  /** From the deep audit, when it has been run — used to show created/modified dates. */
  ruleEvents: RuleEvent[] | null;
}) {
  return (
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
        <Mail size={16} color="#38bdf8" /> Inbox Rules
      </div>

      {!inboxRules.available && (
        <div style={{ fontSize: "12px", color: "#fbbf24" }}>
          Inbox rules unavailable: {inboxRules.reason} — confirm the app has the{" "}
          <code>MailboxSettings.Read</code> application permission and consent was re-granted.
        </div>
      )}

      {inboxRules.available && inboxRules.rules.length === 0 && (
        <div style={{ fontSize: "12px", color: "#64748b" }}>No inbox rules on this mailbox.</div>
      )}

      {inboxRules.available &&
        inboxRules.rules.map((rule) => {
          // Match the most recent create/modify audit event by rule name.
          const events = (ruleEvents ?? []).filter(
            (e) => e.ruleName && e.ruleName.toLowerCase() === rule.displayName.toLowerCase(),
          );
          const created = events.filter((e) => e.operation === "New-InboxRule").at(-1);
          const lastModified = events[0];
          return (
            <div
              key={rule.id}
              style={{ padding: "10px 0", borderBottom: "1px solid #283548", fontSize: "12px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{rule.displayName}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "8px",
                    background: rule.isEnabled ? "#052e16" : "#475569",
                    color: rule.isEnabled ? "#4ade80" : "#cbd5e1",
                  }}
                >
                  {rule.isEnabled ? "enabled" : "disabled"}
                </span>
                {rule.flags.map((flag) => (
                  <span
                    key={flag}
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "8px",
                      background: "#450a0a",
                      color: "#fca5a5",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <AlertTriangle size={10} /> {flag}
                  </span>
                ))}
              </div>
              <div style={{ color: "#64748b", fontSize: "11px", marginTop: "3px" }}>
                {created
                  ? `Created ${fmt(created.t)}${created.clientIP ? ` from ${created.clientIP}` : ""}`
                  : ruleEvents
                    ? "No creation event in the audited window"
                    : "Run the mailbox & files audit to see when this rule was created"}
                {lastModified && lastModified.operation !== "New-InboxRule"
                  ? ` · last change: ${lastModified.operation} ${fmt(lastModified.t)}`
                  : ""}
              </div>
            </div>
          );
        })}

      {inboxRules.available && inboxRules.rules.some((r) => r.flags.length > 0) && (
        <div style={{ fontSize: "11px", color: "#fca5a5", marginTop: "10px" }}>
          Flagged traits (external forwarding, deletion, stealth moves) are the most common BEC
          persistence mechanisms — verify each flagged rule with the mailbox owner.
        </div>
      )}
    </div>
  );
}
