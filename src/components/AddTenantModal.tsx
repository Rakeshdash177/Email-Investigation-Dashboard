"use client";

import { useState } from "react";

export default function AddTenantModal({ onClose }: { onClose: () => void }) {
  const [domainOrId, setDomainOrId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!domainOrId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainOrId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to add tenant");
      // Full-page navigation to Microsoft's admin consent flow — it redirects
      // back to /api/tenants/consent-callback, which lands us back on "/".
      window.location.href = body.consentUrl;
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", width: "420px", maxWidth: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px" }}>Add Tenant</div>
        <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "14px" }}>
          Enter the tenant&apos;s verified domain (e.g. <code>contoso.com</code>) or its Azure AD tenant ID.
          You&apos;ll be redirected to Microsoft to grant this app admin consent — sign in as a Global
          Administrator of that tenant.
        </div>
        <input
          autoFocus
          value={domainOrId}
          onChange={(e) => setDomainOrId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="contoso.com"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "9px 10px",
            color: "#e2e8f0",
            fontSize: "13px",
            marginBottom: "10px",
          }}
        />
        {error && <div style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px" }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#94a3b8",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !domainOrId.trim()}
            style={{
              background: "#0ea5e9",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Redirecting…" : "Continue to Microsoft"}
          </button>
        </div>
      </div>
    </div>
  );
}
