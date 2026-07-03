import type { ReactNode } from "react";

export default function Meta({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  color?: string;
}) {
  return (
    <div style={{ background: "#0f172a", borderRadius: "8px", padding: "8px 10px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          color: "#64748b",
          fontSize: "10px",
          marginBottom: "3px",
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ fontWeight: 700, color: color || "#e2e8f0" }}>{value}</div>
    </div>
  );
}
