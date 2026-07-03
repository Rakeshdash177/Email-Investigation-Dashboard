import type { ReactNode } from "react";

export default function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px" }}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 700,
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
