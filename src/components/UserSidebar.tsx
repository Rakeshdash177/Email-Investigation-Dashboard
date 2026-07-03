"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { GraphUser } from "@/lib/graph";

export default function UserSidebar({
  users,
  selectedUpn,
  onSelect,
}: {
  users: GraphUser[];
  selectedUpn: string | null;
  onSelect: (upn: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(search.toLowerCase()) ||
          u.userPrincipalName.toLowerCase().includes(search.toLowerCase()),
      ),
    [users, search],
  );

  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", padding: "12px", height: "fit-content" }}>
      <div style={{ position: "relative", marginBottom: "10px" }}>
        <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "#64748b" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "7px 7px 7px 30px",
            color: "#e2e8f0",
            fontSize: "13px",
          }}
        />
      </div>
      {filtered.length === 0 && (
        <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 4px" }}>No users found.</div>
      )}
      {filtered.map((u) => {
        const active = u.userPrincipalName === selectedUpn;
        return (
          <div
            key={u.id}
            onClick={() => onSelect(u.userPrincipalName)}
            style={{
              padding: "9px 10px",
              borderRadius: "8px",
              cursor: "pointer",
              marginBottom: "4px",
              background: active ? "#0ea5e9" : "transparent",
              transition: "background .15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: active ? "#fff" : "#e2e8f0" }}>
                {u.displayName}
              </span>
              {!u.accountEnabled && (
                <span
                  style={{
                    fontSize: "9px",
                    background: "#475569",
                    padding: "1px 5px",
                    borderRadius: "4px",
                  }}
                >
                  disabled
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: active ? "#e0f2fe" : "#64748b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {u.userPrincipalName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
