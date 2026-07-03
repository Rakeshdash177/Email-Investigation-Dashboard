import { CheckCircle, XCircle } from "lucide-react";
import { fmt, riskColor, riskLabel, type ScoredSignIn } from "@/lib/risk";

export default function SignInTable({ signins }: { signins: ScoredSignIn[] }) {
  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ color: "#64748b", textAlign: "left", borderBottom: "1px solid #334155" }}>
              <th style={{ padding: "6px 8px" }}>Risk</th>
              <th style={{ padding: "6px 8px" }}>Time</th>
              <th style={{ padding: "6px 8px" }}>App</th>
              <th style={{ padding: "6px 8px" }}>IP</th>
              <th style={{ padding: "6px 8px" }}>Location</th>
              <th style={{ padding: "6px 8px" }}>Device / OS</th>
              <th style={{ padding: "6px 8px" }}>MFA</th>
              <th style={{ padding: "6px 8px" }}>Result</th>
            </tr>
          </thead>
          <tbody>
            {signins.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #283548" }} title={s.reasons.join(" · ")}>
                <td style={{ padding: "6px 8px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: riskColor(s.score),
                      marginRight: "5px",
                    }}
                  />
                  <span style={{ color: riskColor(s.score), fontWeight: 600 }}>{riskLabel(s.score)}</span>
                </td>
                <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{fmt(s.t)}</td>
                <td style={{ padding: "6px 8px" }}>{s.app}</td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: s.reasons.includes("Off-network IP / location") ? "#fbbf24" : "#94a3b8",
                  }}
                >
                  {s.ip.length > 22 ? s.ip.slice(0, 22) + "…" : s.ip}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {s.city}, {s.state}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {s.device || <span style={{ color: "#fbbf24" }}>unmanaged</span>}
                  <span style={{ color: "#64748b" }}> · {s.os}</span>
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {s.auth === "singleFactorAuthentication" ? (
                    <span style={{ color: "#d97706" }}>1FA</span>
                  ) : (
                    <span style={{ color: "#16a34a" }}>MFA</span>
                  )}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  {s.err === 0 ? (
                    <CheckCircle size={14} color="#16a34a" />
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <XCircle size={14} color="#d97706" />
                      <span style={{ fontSize: "10px", color: "#d97706" }}>{s.err}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {signins.length === 0 && (
        <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 4px" }}>
          No sign-ins in this window.
        </div>
      )}
      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px", lineHeight: 1.5 }}>
        Amber IPs are off this user&apos;s baseline network (most frequent location/IP prefix in the
        selected window). Hover a row for the scoring rationale.
      </div>
    </div>
  );
}
