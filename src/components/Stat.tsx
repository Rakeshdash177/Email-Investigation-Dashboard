import type { ReactNode } from "react";

export default function Stat({
  icon,
  value,
  label,
  color,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  color?: string;
}) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", padding: "14px" }}>
      <div style={{ color: color || "#38bdf8", marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: color || "#e2e8f0" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "#64748b" }}>{label}</div>
    </div>
  );
}
