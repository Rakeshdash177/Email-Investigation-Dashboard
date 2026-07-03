"use client";

import type { TimelineRange } from "@/lib/risk";

const PRESETS: { value: TimelineRange; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "custom", label: "Custom" },
];

export default function TimelineSelector({
  range,
  onRangeChange,
  customStart,
  customEnd,
  onCustomChange,
}: {
  range: TimelineRange;
  onRangeChange: (r: TimelineRange) => void;
  customStart: string;
  customEnd: string;
  onCustomChange: (start: string, end: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      {PRESETS.map((p) => {
        const active = p.value === range;
        return (
          <button
            key={p.value}
            onClick={() => onRangeChange(p.value)}
            style={{
              background: active ? "#0ea5e9" : "#1e293b",
              color: active ? "#fff" : "#94a3b8",
              border: "1px solid " + (active ? "#0ea5e9" : "#334155"),
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        );
      })}
      {range === "custom" && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="datetime-local"
            value={customStart}
            onChange={(e) => onCustomChange(e.target.value, customEnd)}
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "5px 7px",
              color: "#e2e8f0",
              fontSize: "12px",
            }}
          />
          <span style={{ color: "#64748b", fontSize: "12px" }}>to</span>
          <input
            type="datetime-local"
            value={customEnd}
            onChange={(e) => onCustomChange(customStart, e.target.value)}
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "5px 7px",
              color: "#e2e8f0",
              fontSize: "12px",
            }}
          />
        </div>
      )}
    </div>
  );
}
