"use client";

import { AlertTriangle, FileSearch, FolderDown, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Panel from "./Panel";
import { fmt, type TimelineRange } from "@/lib/risk";
import type { ClassifiedAudit } from "@/lib/audit";

const POLL_INTERVAL_MS = 15_000;

export interface DeepAuditState {
  queryId: string;
  results: ClassifiedAudit;
}

export default function DeepAuditSection({
  tenantId,
  upn,
  range,
  customStart,
  customEnd,
  onResults,
}: {
  tenantId: string;
  upn: string;
  range: TimelineRange;
  customStart: string;
  customEnd: string;
  /** Bubbles results up so the dashboard can pass ruleEvents to InboxRulesPanel
   * and the queryId to the AI narrative request. */
  onResults: (state: DeepAuditState | null) => void;
}) {
  const [queryId, setQueryId] = useState<string | null>(null);
  const [results, setResults] = useState<ClassifiedAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New user/range invalidates any loaded audit — results are scoped to both.
  useEffect(() => {
    setQueryId(null);
    setResults(null);
    setError(null);
    setStartedAt(null);
    onResults(null);
    if (pollTimer.current) clearTimeout(pollTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, upn, range, customStart, customEnd]);

  useEffect(() => {
    if (startedAt === null || results) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startedAt, results]);

  const poll = useCallback(
    async (qid: string) => {
      try {
        const res = await fetch(`/api/tenants/${tenantId}/audit-query/${qid}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Audit query failed");
        if (body.status === "succeeded") {
          setResults(body);
          onResults({ queryId: qid, results: body });
          return;
        }
        if (body.status === "failed" || body.status === "cancelled") {
          throw new Error(`Audit query ${body.status}`);
        }
        pollTimer.current = setTimeout(() => poll(qid), POLL_INTERVAL_MS);
      } catch (err) {
        setError((err as Error).message);
        setStartedAt(null);
      }
    },
    [tenantId, onResults],
  );

  useEffect(() => () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
  }, []);

  const start = async () => {
    setError(null);
    setResults(null);
    setStartedAt(Date.now());
    setElapsed(0);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/audit-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upn,
          range,
          ...(range === "custom" ? { start: customStart, end: customEnd } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to start audit query");
      setQueryId(body.queryId);
      pollTimer.current = setTimeout(() => poll(body.queryId), POLL_INTERVAL_MS);
    } catch (err) {
      setError((err as Error).message);
      setStartedAt(null);
    }
  };

  const running = startedAt !== null && !results && !error;

  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: results || running || error ? "12px" : 0,
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          <FileSearch size={16} color="#38bdf8" /> Mailbox &amp; Files Audit
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 400 }}>
            inbox rule changes · deleted mail · file downloads · mass-delete detection
          </span>
        </div>
        <button
          onClick={start}
          disabled={running}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#0ea5e9",
            color: "#fff",
            border: "none",
            padding: "8px 14px",
            borderRadius: "8px",
            cursor: running ? "default" : "pointer",
            fontSize: "13px",
            fontWeight: 600,
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? <Loader2 size={15} className="spin" /> : <FileSearch size={15} />}
          {running ? `Running… ${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : results ? "Re-run audit" : "Run audit"}
        </button>
      </div>

      {running && (
        <div style={{ fontSize: "12px", color: "#64748b" }}>
          Microsoft processes Purview audit queries asynchronously — several minutes is normal.
          Checking every 15 seconds{queryId ? ` (query ${queryId.slice(0, 8)}…)` : ""}.
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#450a0a",
            border: "1px solid #991b1b",
            borderRadius: "10px",
            padding: "12px",
            fontSize: "12px",
            color: "#fca5a5",
          }}
        >
          {error} — confirm <code>AuditLogsQuery.Read.All</code> is granted and consent was refreshed.
        </div>
      )}

      {results && (
        <>
          {results.massDeleteAlerts.length > 0 && (
            <div
              style={{
                background: "#450a0a",
                border: "1px solid #dc2626",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "12px",
                fontSize: "12px",
                color: "#fca5a5",
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                <strong>Mass deletion detected.</strong>{" "}
                {results.massDeleteAlerts
                  .map((a) => `${a.count} ${a.kind === "mailbox" ? "mail items" : "files"} deleted in the hour of ${fmt(a.hourISO)}`)
                  .join("; ")}
                . This pattern is consistent with evidence destruction after account takeover.
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Panel title={`Inbox Rule Changes (${results.ruleEvents.length})`} icon={<FileSearch size={15} color="#38bdf8" />}>
              {results.ruleEvents.length === 0 && (
                <div style={{ fontSize: "11px", color: "#64748b" }}>No rule changes in this window.</div>
              )}
              {results.ruleEvents.map((e) => (
                <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px solid #283548", fontSize: "11px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, color: e.operation === "Remove-InboxRule" ? "#94a3b8" : "#fbbf24" }}>
                      {e.operation}
                    </span>
                    <span style={{ color: "#64748b" }}>{fmt(e.t)}</span>
                  </div>
                  <div style={{ color: "#cbd5e1" }}>
                    {e.ruleName ?? "(unnamed)"}
                    {e.clientIP ? <span style={{ color: "#64748b" }}> · {e.clientIP}</span> : null}
                  </div>
                  {e.parameters && (
                    <div style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.parameters}
                    </div>
                  )}
                </div>
              ))}
            </Panel>

            <Panel title={`Deleted Mail Items (${results.mailboxDeletes.length})`} icon={<Trash2 size={15} color="#38bdf8" />}>
              {results.mailboxDeletes.length === 0 && (
                <div style={{ fontSize: "11px", color: "#64748b" }}>No mailbox deletions in this window.</div>
              )}
              {results.mailboxDeletes.slice(0, 50).map((e) => (
                <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px solid #283548", fontSize: "11px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, color: e.operation === "HardDelete" ? "#f87171" : "#cbd5e1" }}>
                      {e.operation}
                    </span>
                    <span style={{ color: "#64748b" }}>{fmt(e.t)}</span>
                  </div>
                  <div style={{ color: "#94a3b8" }}>
                    {e.subjects.length ? e.subjects.slice(0, 3).join(" · ") : "(subjects not logged)"}
                    {e.subjects.length > 3 ? ` +${e.subjects.length - 3} more` : ""}
                  </div>
                </div>
              ))}
            </Panel>

            <Panel title={`File Downloads (${results.fileDownloads.length})`} icon={<FolderDown size={15} color="#38bdf8" />}>
              {results.fileDownloads.length === 0 && (
                <div style={{ fontSize: "11px", color: "#64748b" }}>No SharePoint/OneDrive downloads in this window.</div>
              )}
              {results.fileDownloads.slice(0, 50).map((e) => (
                <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px solid #283548", fontSize: "11px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                      {e.fileName ?? e.filePath ?? "(unknown file)"}
                    </span>
                    <span style={{ color: "#64748b" }}>{fmt(e.t)}</span>
                  </div>
                  {e.clientIP && <div style={{ color: "#64748b", fontFamily: "monospace" }}>{e.clientIP}</div>}
                </div>
              ))}
            </Panel>

            <Panel title={`File Deletions (${results.fileDeletes.length})`} icon={<Trash2 size={15} color="#38bdf8" />}>
              {results.fileDeletes.length === 0 && (
                <div style={{ fontSize: "11px", color: "#64748b" }}>No file deletions in this window.</div>
              )}
              {results.fileDeletes.slice(0, 50).map((e) => (
                <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px solid #283548", fontSize: "11px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                      {e.fileName ?? e.filePath ?? "(unknown file)"}
                    </span>
                    <span style={{ color: "#64748b" }}>{fmt(e.t)}</span>
                  </div>
                  <div style={{ color: "#64748b" }}>{e.operation}</div>
                </div>
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
