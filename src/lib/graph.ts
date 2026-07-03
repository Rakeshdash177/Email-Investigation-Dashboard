import { ConfidentialClientApplication } from "@azure/msal-node";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

export class GraphError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "GraphError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// One MSAL confidential-client instance per Azure tenant we've added — each
// instance carries its own in-memory token cache, so repeated calls within
// a tenant reuse the cached app token until it's close to expiry.
const msalClients = new Map<string, ConfidentialClientApplication>();

function getMsalClient(tenantId: string): ConfidentialClientApplication {
  let client = msalClients.get(tenantId);
  if (!client) {
    client = new ConfidentialClientApplication({
      auth: {
        clientId: requireEnv("AZURE_CLIENT_ID"),
        clientSecret: requireEnv("AZURE_CLIENT_SECRET"),
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
    msalClients.set(tenantId, client);
  }
  return client;
}

async function getAccessToken(tenantId: string): Promise<string> {
  const client = getMsalClient(tenantId);
  const result = await client.acquireTokenByClientCredential({
    scopes: [GRAPH_SCOPE],
  });
  if (!result?.accessToken) {
    throw new GraphError(
      `Failed to acquire an app-only token for tenant ${tenantId}. Confirm admin consent was granted for this app.`,
      401,
    );
  }
  return result.accessToken;
}

async function graphFetch(tenantId: string, url: string): Promise<unknown> {
  const token = await getAccessToken(tenantId);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (body as { error?: { message?: string; code?: string } })?.error?.message ??
      res.statusText;
    const code = (body as { error?: { code?: string } })?.error?.code;
    throw new GraphError(message, res.status, code);
  }
  return res.json();
}

/** Follows @odata.nextLink until exhausted or `cap` records have been collected. */
async function graphFetchAllPages<T>(
  tenantId: string,
  initialUrl: string,
  cap = 2000,
): Promise<T[]> {
  const results: T[] = [];
  let url: string | undefined = initialUrl;
  while (url && results.length < cap) {
    const page = (await graphFetch(tenantId, url)) as {
      value?: T[];
      "@odata.nextLink"?: string;
    };
    results.push(...(page.value ?? []));
    url = page["@odata.nextLink"];
  }
  return results.slice(0, cap);
}

// ---------- Typed calls ----------

export interface GraphOrganization {
  id: string;
  displayName: string;
  verifiedDomains: { name: string; isDefault: boolean }[];
}

export async function getOrganization(tenantId: string): Promise<GraphOrganization> {
  const page = (await graphFetch(tenantId, `${GRAPH_BASE}/organization`)) as {
    value: GraphOrganization[];
  };
  const org = page.value[0];
  if (!org) throw new GraphError("Tenant has no organization record", 404);
  return org;
}

export interface GraphUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  lastPasswordChangeDateTime: string | null;
}

export async function listUsers(tenantId: string): Promise<GraphUser[]> {
  const url =
    `${GRAPH_BASE}/users?$top=999` +
    `&$select=id,displayName,userPrincipalName,accountEnabled,lastPasswordChangeDateTime`;
  return graphFetchAllPages<GraphUser>(tenantId, url);
}

export interface GraphSignIn {
  id: string;
  createdDateTime: string;
  userPrincipalName: string;
  appDisplayName: string;
  ipAddress: string;
  clientAppUsed: string;
  conditionalAccessStatus: string;
  riskLevelAggregated: string;
  authenticationRequirement: string;
  status: { errorCode: number };
  deviceDetail: {
    displayName: string | null;
    operatingSystem: string | null;
    browser: string | null;
    isCompliant: boolean;
    isManaged: boolean;
  };
  location: { city: string | null; state: string | null; countryOrRegion: string | null };
}

function escapeODataString(value: string): string {
  // Single quotes are the OData string delimiter; escape by doubling, per spec.
  return value.replace(/'/g, "''");
}

export async function listSignIns(
  tenantId: string,
  opts: { upn: string; startISO: string; endISO: string; cap?: number },
): Promise<GraphSignIn[]> {
  const upn = escapeODataString(opts.upn);
  const filter =
    `userPrincipalName eq '${upn}' and ` +
    `createdDateTime ge ${opts.startISO} and createdDateTime le ${opts.endISO}`;
  const url = `${GRAPH_BASE}/auditLogs/signIns?$filter=${encodeURIComponent(filter)}`;
  return graphFetchAllPages<GraphSignIn>(tenantId, url, opts.cap);
}

export interface GraphDirectoryAudit {
  id: string;
  activityDateTime: string;
  activityDisplayName: string;
  category: string;
  result: string;
  initiatedBy: { user?: { userPrincipalName: string | null } };
  targetResources: { displayName: string | null; userPrincipalName?: string | null }[];
}

export async function listDirectoryAudits(
  tenantId: string,
  opts: { upn: string; startISO: string; endISO: string; cap?: number },
): Promise<GraphDirectoryAudit[]> {
  const upn = escapeODataString(opts.upn);
  const filter =
    `activityDateTime ge ${opts.startISO} and activityDateTime le ${opts.endISO} and ` +
    `(initiatedBy/user/userPrincipalName eq '${upn}' or ` +
    `targetResources/any(t:t/userPrincipalName eq '${upn}'))`;
  const url = `${GRAPH_BASE}/auditLogs/directoryAudits?$filter=${encodeURIComponent(filter)}`;
  return graphFetchAllPages<GraphDirectoryAudit>(tenantId, url, opts.cap);
}

export interface GraphRiskyUser {
  id: string;
  userPrincipalName: string;
  riskLevel: string;
  riskState: string;
  riskDetail: string;
  riskLastUpdatedDateTime: string;
}

/** Requires IdentityRiskyUser.Read.All — returns null (not thrown) if the
 * tenant hasn't granted that scope, so a missing permission never breaks the
 * rest of the report. */
export async function getRiskyUser(
  tenantId: string,
  upn: string,
): Promise<GraphRiskyUser | null> {
  try {
    const filter = `userPrincipalName eq '${escapeODataString(upn)}'`;
    const url = `${GRAPH_BASE}/identityProtection/riskyUsers?$filter=${encodeURIComponent(filter)}`;
    const page = (await graphFetch(tenantId, url)) as { value: GraphRiskyUser[] };
    return page.value[0] ?? null;
  } catch (err) {
    if (err instanceof GraphError && (err.status === 403 || err.status === 401)) return null;
    throw err;
  }
}

// ---------- Inbox rules (MailboxSettings.Read) ----------

export interface GraphMessageRule {
  id: string;
  displayName: string;
  sequence: number;
  isEnabled: boolean;
  hasError: boolean;
  actions: {
    forwardTo?: { emailAddress: { address: string } }[];
    forwardAsAttachmentTo?: { emailAddress: { address: string } }[];
    redirectTo?: { emailAddress: { address: string } }[];
    delete?: boolean;
    permanentDelete?: boolean;
    moveToFolder?: string | null;
    markAsRead?: boolean;
    stopProcessingRules?: boolean;
  } | null;
}

export type InboxRulesResult =
  | { available: true; rules: GraphMessageRule[] }
  | { available: false; reason: string };

/** Returns {available:false} instead of throwing on 401/403/404 — missing
 * MailboxSettings.Read consent or a license-less/shared mailbox shouldn't
 * break the rest of the report. */
export async function listInboxRules(tenantId: string, upn: string): Promise<InboxRulesResult> {
  try {
    const url = `${GRAPH_BASE}/users/${encodeURIComponent(upn)}/mailFolders/inbox/messageRules`;
    const page = (await graphFetch(tenantId, url)) as { value: GraphMessageRule[] };
    return { available: true, rules: page.value ?? [] };
  } catch (err) {
    if (err instanceof GraphError && [401, 403, 404].includes(err.status)) {
      return { available: false, reason: err.message };
    }
    throw err;
  }
}

// ---------- Purview Audit Search (AuditLogsQuery.Read.All) ----------
// Asynchronous by design: create a query, poll until succeeded, then page
// through the records. Server-side processing typically takes minutes.

export type AuditQueryStatus =
  | "notStarted"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknownFutureValue";

// Record types covering Exchange mailbox activity + SharePoint/OneDrive file
// operations — the workloads relevant to BEC data-plane forensics.
const AUDIT_RECORD_TYPES = [
  "exchangeAdmin",
  "exchangeItem",
  "exchangeItemGroup",
  "exchangeItemAggregated",
  "sharePointFileOperation",
  "oneDrive",
];

export async function createAuditQuery(
  tenantId: string,
  opts: { upn: string; startISO: string; endISO: string },
): Promise<string> {
  const token = await getAccessToken(tenantId);
  const res = await fetch(`${GRAPH_BASE}/security/auditLog/queries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "@odata.type": "#microsoft.graph.security.auditLogQuery",
      displayName: `BEC audit ${opts.upn} ${opts.startISO}`,
      filterStartDateTime: opts.startISO,
      filterEndDateTime: opts.endISO,
      userPrincipalNameFilters: [opts.upn],
      recordTypeFilters: AUDIT_RECORD_TYPES,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (body as { error?: { message?: string } })?.error?.message ?? res.statusText;
    throw new GraphError(message, res.status, (body as { error?: { code?: string } })?.error?.code);
  }
  const created = (await res.json()) as { id: string };
  return created.id;
}

export async function getAuditQueryStatus(
  tenantId: string,
  queryId: string,
): Promise<AuditQueryStatus> {
  const query = (await graphFetch(
    tenantId,
    `${GRAPH_BASE}/security/auditLog/queries/${encodeURIComponent(queryId)}`,
  )) as { status: AuditQueryStatus };
  return query.status;
}

export interface GraphAuditRecord {
  id: string;
  createdDateTime: string;
  auditLogRecordType: string;
  operation: string;
  userPrincipalName: string;
  service: string;
  /** Raw workload-specific payload — shape varies per operation. */
  auditData: Record<string, unknown>;
}

export async function listAuditRecords(
  tenantId: string,
  queryId: string,
  cap = 5000,
): Promise<GraphAuditRecord[]> {
  const url = `${GRAPH_BASE}/security/auditLog/queries/${encodeURIComponent(queryId)}/records?$top=500`;
  return graphFetchAllPages<GraphAuditRecord>(tenantId, url, cap);
}
