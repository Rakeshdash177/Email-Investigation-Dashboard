import React, { useState, useMemo } from "react";
import { Shield, AlertTriangle, MapPin, Globe, Monitor, Clock, User, Key, CheckCircle, XCircle, Search, Download, Activity, Smartphone } from "lucide-react";

// ============ LIVE DATA (pulled from Bydash Technology tenant via Lokka MCP) ============
const TENANT = "Bydash Technology";
const PULLED_AT = "2026-06-23T00:19Z";

const USERS = [
  { id: "ceb25aef-2c74-4db4-b9dd-a255d23c8eef", displayName: "Rakesh Dash", upn: "rdash@rakeshdash.com", enabled: true, lastPwdChange: "2025-01-31T04:46:56Z" },
  { id: "93b24ebc-a73f-40d3-9f24-970692054ab0", displayName: "Evan Dash", upn: "Evan@rakeshdash.com", enabled: true, lastPwdChange: "2025-07-08T03:27:34Z" },
  { id: "24d4e629-ff26-47da-9603-5a0dce0bfc29", displayName: "Rakesh Dash", upn: "rdash@bydashtech.com", enabled: true, lastPwdChange: "2025-06-13T03:54:06Z" },
  { id: "f57fd3a2-c678-4ce1-a32b-fdd81d939ee9", displayName: "Rakesh Dash", upn: "rdash_rampuptech.com#EXT#@dashrakesh177outlook.onmicrosoft.com", enabled: true, lastPwdChange: "2026-02-03T16:48:54Z" },
  { id: "cce2a076-a9f1-4def-b0dc-3d2b982bcbd0", displayName: "Rupesh Das", upn: "rupesh@rakeshdash.com", enabled: true, lastPwdChange: "2025-06-07T00:09:07Z" },
  { id: "c2d71878-68b3-42e0-9e85-c01b6ede58ac", displayName: "script", upn: "script@bydashtech.com", enabled: false, lastPwdChange: "2025-08-08T19:44:06Z" },
];

const SIGNINS = [
  { t: "2026-06-23T00:15:54Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "2603:7000:a9f0:25f0:982f:9bf4:d525:c6e6", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-22T23:30:47Z", upn: "rdash@bydashtech.com", app: "One Outlook Web", ip: "2603:7000:a9f0:25f0:f455:bc5:be24:c60e", client: "Browser", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "MacOs", browser: "Chrome 149.0.0", device: "", compliant: false, managed: false, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-22T19:59:00Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "100.38.175.242", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Maspeth", state: "New York", country: "US" },
  { t: "2026-06-22T19:00:39Z", upn: "rdash@bydashtech.com", app: "M365ChatClient", ip: "2603:7000:a9f0:25f0:319f:93f6:3529:d487", client: "Browser", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "MacOs", browser: "Chrome 149.0.0", device: "", compliant: false, managed: false, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-22T15:33:46Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "100.38.175.242", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Maspeth", state: "New York", country: "US" },
  { t: "2026-06-22T11:12:33Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "2603:7000:a9f0:25f0:e45c:edc3:47e5:e7a0", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-22T02:40:07Z", upn: "rdash@bydashtech.com", app: "One Outlook Web", ip: "2603:7000:a9f0:25f0:bd3e:60ed:6410:cd79", client: "Browser", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "MacOs", browser: "Chrome 149.0.0", device: "", compliant: false, managed: false, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-22T02:16:05Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "2603:7000:a9f0:25f0:ad65:d6e0:cedd:8aad", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-21T22:45:56Z", upn: "rdash@bydashtech.com", app: "Microsoft Graph Command Line Tools", ip: "2603:7000:a9f0:25f0:ad65:d6e0:cedd:8aad", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows10", browser: "Edge 149.0.0", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-21T22:45:47Z", upn: "rdash@bydashtech.com", app: "Microsoft Graph Command Line Tools", ip: "2603:7000:a9f0:25f0:ad65:d6e0:cedd:8aad", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 65001, os: "Windows10", browser: "Edge 149.0.0", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-21T22:40:41Z", upn: "rdash@bydashtech.com", app: "Microsoft Graph Command Line Tools", ip: "47.230.85.37", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows10", browser: "Edge 149.0.0", device: "LT-Rakesh-001", compliant: false, managed: true, city: "East Elmhurst", state: "New York", country: "US" },
  { t: "2026-06-21T22:40:33Z", upn: "rdash@bydashtech.com", app: "Microsoft Graph Command Line Tools", ip: "47.230.85.37", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 65001, os: "Windows10", browser: "Edge 149.0.0", device: "LT-Rakesh-001", compliant: false, managed: true, city: "East Elmhurst", state: "New York", country: "US" },
  { t: "2026-06-21T22:29:29Z", upn: "rdash@bydashtech.com", app: "Microsoft Graph Command Line Tools", ip: "47.230.85.37", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows10", browser: "Edge 149.0.0", device: "LT-Rakesh-001", compliant: false, managed: true, city: "East Elmhurst", state: "New York", country: "US" },
  { t: "2026-06-21T22:09:13Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "47.230.85.37", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "East Elmhurst", state: "New York", country: "US" },
  { t: "2026-06-21T18:34:46Z", upn: "rdash@bydashtech.com", app: "M365ChatClient", ip: "2603:7000:a9f0:25f0:bd3e:60ed:6410:cd79", client: "Browser", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "MacOs", browser: "Chrome 149.0.0", device: "", compliant: false, managed: false, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-21T11:37:49Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "2603:7000:a9f0:25f0:d813:d433:b72d:aefd", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-21T02:37:50Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "2603:7000:a9f0:25f0:d813:d433:b72d:aefd", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-21T00:50:42Z", upn: "rdash@bydashtech.com", app: "Microsoft Account Controls V2", ip: "2603:7000:a9f0:25f0:9d62:27ed:aaf2:1e1d", client: "Browser", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows10", browser: "Edge 149.0.0", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-21T00:20:08Z", upn: "rdash@bydashtech.com", app: "One Outlook Web", ip: "2603:7000:a9f0:25f0:dd6:b7f7:c5fa:734f", client: "Browser", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "MacOs", browser: "Chrome 149.0.0", device: "", compliant: false, managed: false, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-20T22:13:10Z", upn: "rdash@bydashtech.com", app: "Azure Portal", ip: "2603:7000:a9f0:25f0:dd6:b7f7:c5fa:734f", client: "Browser", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "MacOs", browser: "Chrome 149.0.0", device: "", compliant: false, managed: false, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-20T12:26:51Z", upn: "rdash@bydashtech.com", app: "Azure Portal", ip: "2603:7000:a9f0:25f0:55af:686f:c3f8:1709", client: "Browser", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows10", browser: "Edge 149.0.0", device: "LT-Rakesh-001", compliant: false, managed: true, city: "Queens", state: "New York", country: "US" },
  { t: "2026-06-19T19:39:33Z", upn: "rdash@bydashtech.com", app: "Windows Sign In", ip: "47.230.85.37", client: "Mobile Apps and Desktop clients", ca: "notApplied", risk: "none", auth: "singleFactorAuthentication", err: 0, os: "Windows", browser: "", device: "LT-Rakesh-001", compliant: false, managed: true, city: "East Elmhurst", state: "New York", country: "US" },
];

const AUDITS = [
  { t: "2026-06-21T22:45:51Z", activity: "Consent to application", category: "ApplicationManagement", result: "success", by: "rdash@bydashtech.com", ip: "172.183.4.128", target: "Microsoft Graph Command Line Tools", detail: "Scope added: AuditLog.Read.All" },
  { t: "2026-06-21T22:45:34Z", activity: "Consent to application", category: "ApplicationManagement", result: "success", by: "rdash@bydashtech.com", ip: "4.151.103.193", target: "Microsoft Graph Command Line Tools", detail: "Admin consent granted" },
  { t: "2026-06-21T22:39:45Z", activity: "Add delegated permission grant", category: "ApplicationManagement", result: "success", by: "rdash@bydashtech.com", ip: "172.172.253.128", target: "Microsoft Graph", detail: "Policy.Read.All AuditLog.Read.All" },
  { t: "2026-06-21T22:39:45Z", activity: "Remove delegated permission grant", category: "ApplicationManagement", result: "success", by: "rdash@bydashtech.com", ip: "172.172.253.128", target: "Microsoft Graph", detail: "Scope rotation" },
  { t: "2026-06-20T13:25:07Z", activity: "Validate user authentication", category: "Authentication", result: "success", by: "rdash@bydashtech.com", ip: "40.126.23.163", target: "B2C", detail: "Auth validated" },
  { t: "2026-06-19T14:16:16Z", activity: "Update device", category: "Device", result: "success", by: "Device Registration Service", ip: "", target: "LT-Rakesh-001", detail: "Device record updated" },
  { t: "2026-06-17T00:47:11Z", activity: "Update device", category: "Device", result: "success", by: "Intune Grouping and Targeting Client Prod", ip: "", target: "LT-Rakesh-001", detail: "OS version 10.0.26200.8728" },
  { t: "2026-06-12T01:36:53Z", activity: "Consent to application", category: "ApplicationManagement", result: "success", by: "rdash@bydashtech.com", ip: "4.151.103.193", target: "Notion Calendar", detail: "Calendars.ReadWrite Contacts.ReadWrite Mail-adjacent scopes" },
  { t: "2026-06-10T03:49:53Z", activity: "Add service principal", category: "ApplicationManagement", result: "failure", by: "Microsoft Azure AD Internal - Jit Provisioning", ip: "", target: "Workload Identity Control Plane", detail: "SpnValidationException" },
];

// ============ HELPERS ============
const fmt = (t) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const isIPv6 = (ip) => ip.includes(":");
// Home network fingerprint = the Spectrum IPv6 /64 prefix + known residential v4
const HOME_PREFIX = "2603:7000:a9f0:25f0";
const KNOWN_V4 = ["100.38.175.242", "47.230.85.37"];
const isHomeIsh = (s) => (isIPv6(s.ip) && s.ip.startsWith(HOME_PREFIX)) || KNOWN_V4.includes(s.ip) || s.city === "Queens" || s.city === "Maspeth" || s.city === "East Elmhurst";

function scoreSignin(s) {
  // Heuristic anomaly scoring for triage
  let score = 0; const reasons = [];
  if (s.err === 65001) { score += 1; reasons.push("Consent-required failure"); }
  if (s.err !== 0 && s.err !== 65001) { score += 2; reasons.push(`Error ${s.err}`); }
  if (!isHomeIsh(s)) { score += 3; reasons.push("Off-network IP / location"); }
  if (s.auth === "singleFactorAuthentication") { score += 1; reasons.push("Single-factor"); }
  if (s.ca === "notApplied") { score += 1; reasons.push("No CA policy applied"); }
  if (s.risk !== "none") { score += 3; reasons.push(`Identity Protection risk: ${s.risk}`); }
  return { score, reasons };
}

const riskColor = (score) => score >= 6 ? "#dc2626" : score >= 4 ? "#d97706" : score >= 2 ? "#ca8a04" : "#16a34a";
const riskLabel = (score) => score >= 6 ? "High" : score >= 4 ? "Medium" : score >= 2 ? "Low" : "Clean";

export default function Dashboard() {
  const [selectedUpn, setSelectedUpn] = useState("rdash@bydashtech.com");
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() =>
    USERS.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()) || u.upn.toLowerCase().includes(search.toLowerCase())),
    [search]);

  const selectedUser = USERS.find(u => u.upn === selectedUpn);
  const userSignins = useMemo(() => SIGNINS.filter(s => s.upn === selectedUpn).map(s => ({ ...s, ...scoreSignin(s) })), [selectedUpn]);
  const userAudits = useMemo(() => AUDITS.filter(a => a.by === selectedUpn || a.target?.includes("Rakesh")), [selectedUpn]);

  // Aggregates
  const uniqueIPs = [...new Set(userSignins.map(s => s.ip))];
  const uniqueLocations = [...new Set(userSignins.map(s => `${s.city}, ${s.state}`))];
  const uniqueApps = [...new Set(userSignins.map(s => s.app))];
  const uniqueDevices = [...new Set(userSignins.map(s => s.device).filter(Boolean))];
  const failedCount = userSignins.filter(s => s.err !== 0).length;
  const offNetworkCount = userSignins.filter(s => !isHomeIsh(s)).length;
  const maxScore = userSignins.length ? Math.max(...userSignins.map(s => s.score)) : 0;

  // per-user risk badge from signin sample
  const userRiskCount = (upn) => {
    const ss = SIGNINS.filter(s => s.upn === upn).map(scoreSignin);
    const hi = ss.filter(s => s.score >= 4).length;
    return hi;
  };

  const exportReport = () => {
    const lines = [];
    lines.push(`BEC INVESTIGATION REPORT`);
    lines.push(`Tenant: ${TENANT}`);
    lines.push(`Subject: ${selectedUser?.displayName} <${selectedUser?.upn}>`);
    lines.push(`Generated: ${new Date().toISOString()}  |  Data pulled: ${PULLED_AT}`);
    lines.push(`Account enabled: ${selectedUser?.enabled}  |  Last password change: ${selectedUser?.lastPwdChange}`);
    lines.push(``);
    lines.push(`SUMMARY`);
    lines.push(`Sign-ins analyzed: ${userSignins.length}`);
    lines.push(`Unique IPs: ${uniqueIPs.length}  |  Unique locations: ${uniqueLocations.length}  |  Apps accessed: ${uniqueApps.length}`);
    lines.push(`Failed sign-ins: ${failedCount}  |  Off-network sign-ins: ${offNetworkCount}`);
    lines.push(``);
    lines.push(`SIGN-IN DETAIL`);
    userSignins.forEach(s => {
      lines.push(`[${riskLabel(s.score)}] ${s.t} | ${s.app} | ${s.ip} | ${s.city}, ${s.state} | ${s.os}${s.browser ? " / " + s.browser : ""} | device:${s.device || "unmanaged"} compliant:${s.compliant} | err:${s.err} | ${s.reasons.join("; ")}`);
    });
    lines.push(``);
    lines.push(`AUDIT EVENTS`);
    userAudits.forEach(a => lines.push(`${a.t} | ${a.activity} | ${a.result} | ${a.target} | ${a.detail}`));
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `BEC-report-${selectedUser?.upn.replace(/[@.]/g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f172a", color: "#e2e8f0", minHeight: "100vh", padding: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Shield size={28} color="#38bdf8" />
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>Email Compromise Investigation</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>{TENANT} · live data via Lokka MCP · pulled {fmt(PULLED_AT)}</div>
          </div>
        </div>
        <button onClick={exportReport} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0ea5e9", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
          <Download size={15} /> Export Report
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "16px" }}>
        {/* Sidebar: user selector */}
        <div style={{ background: "#1e293b", borderRadius: "12px", padding: "12px", height: "fit-content" }}>
          <div style={{ position: "relative", marginBottom: "10px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "#64748b" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
              style={{ width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "7px 7px 7px 30px", color: "#e2e8f0", fontSize: "13px" }} />
          </div>
          {filteredUsers.map(u => {
            const hi = userRiskCount(u.upn);
            const active = u.upn === selectedUpn;
            return (
              <div key={u.id} onClick={() => setSelectedUpn(u.upn)}
                style={{ padding: "9px 10px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px", background: active ? "#0ea5e9" : "transparent", transition: "background .15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: active ? "#fff" : "#e2e8f0" }}>{u.displayName}</span>
                  <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    {!u.enabled && <span style={{ fontSize: "9px", background: "#475569", padding: "1px 5px", borderRadius: "4px" }}>disabled</span>}
                    {hi > 0 && <span style={{ fontSize: "10px", background: "#dc2626", color: "#fff", padding: "1px 6px", borderRadius: "10px" }}>{hi}</span>}
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: active ? "#e0f2fe" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.upn}</div>
              </div>
            );
          })}
        </div>

        {/* Main panel */}
        <div>
          {/* Account detail */}
          <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "16px" }}>
                {selectedUser?.displayName.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>{selectedUser?.displayName}</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>{selectedUser?.upn}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Highest signal</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: riskColor(maxScore) }}>{riskLabel(maxScore)}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px", fontSize: "12px" }}>
              <Meta icon={<User size={13} />} label="Account" value={selectedUser?.enabled ? "Enabled" : "Disabled"} color={selectedUser?.enabled ? "#16a34a" : "#94a3b8"} />
              <Meta icon={<Key size={13} />} label="Last pwd change" value={new Date(selectedUser?.lastPwdChange).toLocaleDateString()} />
              <Meta icon={<Activity size={13} />} label="Sign-ins (sample)" value={userSignins.length} />
              <Meta icon={<Clock size={13} />} label="Failed" value={failedCount} color={failedCount ? "#d97706" : "#16a34a"} />
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            <Stat icon={<Globe size={18} />} value={uniqueIPs.length} label="Unique IPs" />
            <Stat icon={<MapPin size={18} />} value={uniqueLocations.length} label="Locations" />
            <Stat icon={<Monitor size={18} />} value={uniqueApps.length} label="Apps accessed" />
            <Stat icon={<Smartphone size={18} />} value={uniqueDevices.length} label="Managed devices" />
            <Stat icon={<AlertTriangle size={18} />} value={offNetworkCount} label="Off-network" color={offNetworkCount > 0 ? "#d97706" : "#16a34a"} />
          </div>

          {/* Sign-in table */}
          <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={16} color="#38bdf8" /> Sign-in Forensics
            </div>
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
                  {userSignins.map((s, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #283548" }} title={s.reasons.join(" · ")}>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: riskColor(s.score), marginRight: "5px" }} />
                        <span style={{ color: riskColor(s.score), fontWeight: 600 }}>{riskLabel(s.score)}</span>
                      </td>
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{fmt(s.t)}</td>
                      <td style={{ padding: "6px 8px" }}>{s.app}</td>
                      <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: "11px", color: isHomeIsh(s) ? "#94a3b8" : "#fbbf24" }}>{s.ip.length > 22 ? s.ip.slice(0, 22) + "…" : s.ip}</td>
                      <td style={{ padding: "6px 8px" }}>{s.city}, {s.state}</td>
                      <td style={{ padding: "6px 8px" }}>{s.device || <span style={{ color: "#fbbf24" }}>unmanaged</span>}<span style={{ color: "#64748b" }}> · {s.os}</span></td>
                      <td style={{ padding: "6px 8px" }}>{s.auth === "singleFactorAuthentication" ? <span style={{ color: "#d97706" }}>1FA</span> : <span style={{ color: "#16a34a" }}>MFA</span>}</td>
                      <td style={{ padding: "6px 8px" }}>{s.err === 0 ? <CheckCircle size={14} color="#16a34a" /> : <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><XCircle size={14} color="#d97706" /><span style={{ fontSize: "10px", color: "#d97706" }}>{s.err}</span></span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px", lineHeight: 1.5 }}>
              Amber IPs are off your known home network (Spectrum /64 prefix + known residential v4). Hover a row for the scoring rationale.
            </div>
          </div>

          {/* IP / location breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <Panel title="IP Addresses" icon={<Globe size={15} color="#38bdf8" />}>
              {uniqueIPs.map(ip => {
                const count = userSignins.filter(s => s.ip === ip).length;
                const off = !isHomeIsh(userSignins.find(s => s.ip === ip));
                return (
                  <div key={ip} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #283548", fontSize: "11px" }}>
                    <span style={{ fontFamily: "monospace", color: off ? "#fbbf24" : "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{ip}</span>
                    <span style={{ color: "#64748b" }}>{count}×</span>
                  </div>
                );
              })}
            </Panel>
            <Panel title="Apps Accessed" icon={<Monitor size={15} color="#38bdf8" />}>
              {uniqueApps.map(app => {
                const count = userSignins.filter(s => s.app === app).length;
                return (
                  <div key={app} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #283548", fontSize: "11px" }}>
                    <span style={{ color: "#cbd5e1" }}>{app}</span>
                    <span style={{ color: "#64748b" }}>{count}×</span>
                  </div>
                );
              })}
            </Panel>
          </div>

          {/* Audit log */}
          <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={16} color="#38bdf8" /> Directory Audit Events
            </div>
            {userAudits.length === 0 && <div style={{ fontSize: "12px", color: "#64748b" }}>No audit events for this user in the sample.</div>}
            {userAudits.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #283548", fontSize: "12px" }}>
                <div style={{ minWidth: "8px", marginTop: "5px" }}>
                  <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: a.result === "success" ? "#16a34a" : "#dc2626" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{a.activity}</span>
                    <span style={{ color: "#64748b", fontSize: "11px" }}>{fmt(a.t)}</span>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "11px" }}>{a.target} · {a.detail}{a.ip ? ` · ${a.ip}` : ""}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "10px" }}>
              Watch for: inbox rule creation, mail forwarding, app consents granting Mail.* scopes, MFA method changes. The Notion Calendar consent (Jun 12) granted Calendars/Contacts scopes; review whether expected.
            </div>
          </div>

          {/* Gap notice */}
          <div style={{ background: "#422006", border: "1px solid #92400e", borderRadius: "10px", padding: "12px", marginTop: "16px", fontSize: "12px", color: "#fcd34d" }}>
            <strong>Coverage gaps:</strong> Identity Protection risky-users data was blocked (token missing <code>IdentityRiskyUser.Read.All</code>). Mailbox inbox rules and forwarding require Exchange Online / <code>MailboxSettings.Read</code>. Consent both to make this a complete BEC picture. CA shows "notApplied" across the board, which means no Conditional Access is currently gating these sign-ins.
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ icon, label, value, color }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: "8px", padding: "8px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#64748b", fontSize: "10px", marginBottom: "3px" }}>{icon}{label}</div>
      <div style={{ fontWeight: 700, color: color || "#e2e8f0" }}>{value}</div>
    </div>
  );
}

function Stat({ icon, value, label, color }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", padding: "14px" }}>
      <div style={{ color: color || "#38bdf8", marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: color || "#e2e8f0" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "#64748b" }}>{label}</div>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", padding: "16px" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "7px" }}>{icon}{title}</div>
      {children}
    </div>
  );
}