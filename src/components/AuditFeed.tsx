import { Shield } from "lucide-react";
import { fmt } from "@/lib/risk";
import type { GraphDirectoryAudit } from "@/lib/graph";

export default function AuditFeed({ audits }: { audits: GraphDirectoryAudit[] }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px" }}>
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
        <Shield size={16} color="#38bdf8" /> Directory Audit Events
      </div>
      {audits.length === 0 && (
        <div style={{ fontSize: "12px", color: "#64748b" }}>No audit events for this user in this window.</div>
      )}
      {audits.map((a) => {
        const targets = a.targetResources
          .map((t) => t.displayName)
          .filter(Boolean)
          .join(", ");
        return (
          <div
            key={a.id}
            style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #283548", fontSize: "12px" }}
          >
            <div style={{ minWidth: "8px", marginTop: "5px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: a.result === "success" ? "#16a34a" : "#dc2626",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>{a.activityDisplayName}</span>
                <span style={{ color: "#64748b", fontSize: "11px" }}>{fmt(a.activityDateTime)}</span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                {targets || "—"}
                {a.initiatedBy.user?.userPrincipalName ? ` · by ${a.initiatedBy.user.userPrincipalName}` : ""}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px" }}>
        Watch for: inbox rule creation, mail forwarding, app consents granting Mail.* scopes, MFA method
        changes.
      </div>
    </div>
  );
}
