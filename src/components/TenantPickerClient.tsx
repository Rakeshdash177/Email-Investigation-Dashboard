"use client";

import { AlertTriangle, Building2, CheckCircle2, Clock, KeyRound, Plus, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AddTenantModal from "./AddTenantModal";
import type { TenantRecord } from "@/lib/tenants";

export default function TenantPickerClient({
  tenantAdded,
  consentError,
}: {
  tenantAdded: string | null;
  consentError: string | null;
}) {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((body) => setTenants(body.tenants ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const removeTenant = async (id: string) => {
    if (!confirm("Remove this tenant? You can re-add it later without redoing admin consent.")) return;
    await fetch(`/api/tenants/${id}`, { method: "DELETE" });
    load();
  };

  // Regenerate the admin-consent URL for an already-added tenant. Needed
  // whenever the app registration's permission set changes (e.g. adding the
  // mailbox/audit scopes) — Microsoft requires fresh consent after that.
  const reconsent = async (id: string) => {
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ existingId: id }),
    });
    const body = await res.json();
    if (!res.ok) {
      alert(body.error || "Failed to start re-consent");
      return;
    }
    window.location.href = body.consentUrl;
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Shield size={28} color="#38bdf8" />
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>BEC Investigation Dashboard</div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>Select a tenant to investigate, or add a new one.</div>
        </div>
      </div>

      {consentError && (
        <div
          style={{
            background: "#450a0a",
            border: "1px solid #991b1b",
            borderRadius: "10px",
            padding: "12px",
            marginBottom: "16px",
            fontSize: "12px",
            color: "#fca5a5",
            display: "flex",
            gap: "8px",
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{consentError}</span>
        </div>
      )}
      {tenantAdded && !consentError && (
        <div
          style={{
            background: "#052e16",
            border: "1px solid #166534",
            borderRadius: "10px",
            padding: "12px",
            marginBottom: "16px",
            fontSize: "12px",
            color: "#86efac",
            display: "flex",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>Tenant added and consent verified. Select it below to start investigating.</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#0ea5e9",
            color: "#fff",
            border: "none",
            padding: "8px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          <Plus size={15} /> Add Tenant
        </button>
      </div>

      <div style={{ background: "#1e293b", borderRadius: "12px", overflow: "hidden" }}>
        {loading && <div style={{ padding: "16px", fontSize: "13px", color: "#64748b" }}>Loading…</div>}
        {!loading && tenants.length === 0 && (
          <div style={{ padding: "24px", fontSize: "13px", color: "#64748b", textAlign: "center" }}>
            No tenants added yet. Click &quot;Add Tenant&quot; to get started.
          </div>
        )}
        {tenants.map((t) => {
          const active = t.status === "active";
          return (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 16px",
                borderBottom: "1px solid #283548",
              }}
            >
              <Building2 size={20} color={active ? "#38bdf8" : "#64748b"} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  {t.displayName || t.domainOrId}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {t.defaultDomain || t.domainOrId} · added {new Date(t.addedAt).toLocaleDateString()}
                </div>
              </div>
              {active ? (
                <span
                  style={{
                    fontSize: "10px",
                    background: "#052e16",
                    color: "#4ade80",
                    padding: "3px 8px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <CheckCircle2 size={11} /> Active
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "10px",
                    background: "#422006",
                    color: "#fbbf24",
                    padding: "3px 8px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Clock size={11} /> Pending consent
                </span>
              )}
              {active && (
                <a
                  href={`/tenants/${t.id}`}
                  style={{
                    background: "#0ea5e9",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Open
                </a>
              )}
              {active && (
                <button
                  onClick={() => reconsent(t.id)}
                  title="Re-grant admin consent (needed after app permissions change)"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "transparent",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    borderRadius: "8px",
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <KeyRound size={13} /> Re-consent
                </button>
              )}
              <button
                onClick={() => removeTenant(t.id)}
                title="Remove tenant"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {showAdd && <AddTenantModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
