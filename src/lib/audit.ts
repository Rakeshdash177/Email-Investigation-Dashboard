import type { GraphAuditRecord, GraphMessageRule } from "./graph";

// ---------- Classification of Purview audit records ----------

export interface RuleEvent {
  id: string;
  t: string;
  operation: string; // New-InboxRule | Set-InboxRule | Remove-InboxRule | UpdateInboxRules
  ruleName: string | null;
  clientIP: string | null;
  parameters: string | null; // human-readable parameter summary where available
}

export interface MailboxDeleteEvent {
  id: string;
  t: string;
  operation: string; // SoftDelete | HardDelete | MoveToDeletedItems
  subjects: string[]; // affected item subjects where the log includes them
  folder: string | null;
  clientIP: string | null;
}

export interface FileEvent {
  id: string;
  t: string;
  operation: string;
  fileName: string | null;
  filePath: string | null;
  siteUrl: string | null;
  clientIP: string | null;
}

export interface MassDeleteAlert {
  hourISO: string;
  kind: "mailbox" | "files";
  count: number;
}

export interface ClassifiedAudit {
  ruleEvents: RuleEvent[];
  mailboxDeletes: MailboxDeleteEvent[];
  fileDownloads: FileEvent[];
  fileDeletes: FileEvent[];
  massDeleteAlerts: MassDeleteAlert[];
  totalRecords: number;
}

const RULE_OPERATIONS = new Set([
  "New-InboxRule",
  "Set-InboxRule",
  "Remove-InboxRule",
  "Enable-InboxRule",
  "Disable-InboxRule",
  "UpdateInboxRules",
]);

const MAILBOX_DELETE_OPERATIONS = new Set(["SoftDelete", "HardDelete", "MoveToDeletedItems"]);

const FILE_DOWNLOAD_OPERATIONS = new Set(["FileDownloaded", "FileSyncDownloadedFull"]);

const FILE_DELETE_OPERATIONS = new Set([
  "FileDeleted",
  "FileRecycled",
  "FileDeletedFirstStageRecycleBin",
  "FileDeletedSecondStageRecycleBin",
  "FileVersionsAllDeleted",
  "FolderDeleted",
  "FolderRecycled",
]);

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function extractRuleName(data: Record<string, unknown>): string | null {
  // Exchange admin audit: rule name is usually the cmdlet's -Name parameter
  // or the ObjectId (full rule path). Parameters is an array of {Name, Value}.
  const params = data.Parameters;
  if (Array.isArray(params)) {
    const nameParam = params.find(
      (p) => typeof p === "object" && p !== null && (p as { Name?: string }).Name === "Name",
    ) as { Value?: string } | undefined;
    if (nameParam?.Value) return nameParam.Value;
  }
  const objectId = str(data.ObjectId);
  if (objectId) {
    // ObjectId looks like "org\user\RuleName" — take the last segment.
    const segments = objectId.split("\\");
    return segments[segments.length - 1] || objectId;
  }
  return null;
}

function summarizeParameters(data: Record<string, unknown>): string | null {
  const params = data.Parameters;
  if (!Array.isArray(params)) return null;
  const parts = params
    .filter((p): p is { Name: string; Value: string } => {
      if (typeof p !== "object" || p === null) return false;
      const q = p as { Name?: unknown; Value?: unknown };
      return typeof q.Name === "string" && typeof q.Value === "string";
    })
    .filter((p) => !["Identity", "Mailbox"].includes(p.Name))
    .map((p) => `${p.Name}=${p.Value}`);
  return parts.length ? parts.join("; ") : null;
}

function extractSubjects(data: Record<string, unknown>): string[] {
  const affected = data.AffectedItems;
  if (!Array.isArray(affected)) return [];
  return affected
    .map((item) =>
      typeof item === "object" && item !== null ? str((item as Record<string, unknown>).Subject) : null,
    )
    .filter((s): s is string => !!s)
    .slice(0, 25);
}

export function classifyAuditRecords(records: GraphAuditRecord[]): ClassifiedAudit {
  const ruleEvents: RuleEvent[] = [];
  const mailboxDeletes: MailboxDeleteEvent[] = [];
  const fileDownloads: FileEvent[] = [];
  const fileDeletes: FileEvent[] = [];

  for (const r of records) {
    const data = r.auditData ?? {};
    const clientIP = str(data.ClientIP) ?? str(data.ClientIPAddress);

    if (RULE_OPERATIONS.has(r.operation)) {
      ruleEvents.push({
        id: r.id,
        t: r.createdDateTime,
        operation: r.operation,
        ruleName: extractRuleName(data),
        clientIP,
        parameters: summarizeParameters(data),
      });
    } else if (MAILBOX_DELETE_OPERATIONS.has(r.operation)) {
      mailboxDeletes.push({
        id: r.id,
        t: r.createdDateTime,
        operation: r.operation,
        subjects: extractSubjects(data),
        folder:
          typeof data.Folder === "object" && data.Folder !== null
            ? str((data.Folder as Record<string, unknown>).Path)
            : null,
        clientIP,
      });
    } else if (FILE_DOWNLOAD_OPERATIONS.has(r.operation)) {
      fileDownloads.push({
        id: r.id,
        t: r.createdDateTime,
        operation: r.operation,
        fileName: str(data.SourceFileName),
        filePath: str(data.ObjectId),
        siteUrl: str(data.SiteUrl),
        clientIP,
      });
    } else if (FILE_DELETE_OPERATIONS.has(r.operation)) {
      fileDeletes.push({
        id: r.id,
        t: r.createdDateTime,
        operation: r.operation,
        fileName: str(data.SourceFileName),
        filePath: str(data.ObjectId),
        siteUrl: str(data.SiteUrl),
        clientIP,
      });
    }
  }

  const byTime = <T extends { t: string }>(a: T, b: T) => b.t.localeCompare(a.t);
  ruleEvents.sort(byTime);
  mailboxDeletes.sort(byTime);
  fileDownloads.sort(byTime);
  fileDeletes.sort(byTime);

  return {
    ruleEvents,
    mailboxDeletes,
    fileDownloads,
    fileDeletes,
    massDeleteAlerts: detectMassDeletes(mailboxDeletes, fileDeletes),
    totalRecords: records.length,
  };
}

// ---------- Mass-delete detection ----------

export const MASS_DELETE_THRESHOLD_PER_HOUR = 20;

const hourKey = (iso: string): string => iso.slice(0, 13) + ":00:00Z";

export function detectMassDeletes(
  mailboxDeletes: MailboxDeleteEvent[],
  fileDeletes: FileEvent[],
): MassDeleteAlert[] {
  const alerts: MassDeleteAlert[] = [];
  for (const [kind, events] of [
    ["mailbox", mailboxDeletes],
    ["files", fileDeletes],
  ] as const) {
    const buckets = new Map<string, number>();
    for (const e of events) {
      const key = hourKey(e.t);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    for (const [hourISO, count] of buckets) {
      if (count >= MASS_DELETE_THRESHOLD_PER_HOUR) alerts.push({ hourISO, kind, count });
    }
  }
  return alerts.sort((a, b) => b.count - a.count);
}

// ---------- Suspicious inbox-rule heuristics ----------

export interface FlaggedRule extends GraphMessageRule {
  flags: string[];
}

// Folders attackers move stolen mail into so the victim doesn't notice.
const OBSCURE_FOLDER_HINTS = ["rss", "archive", "conversation history", "junk", "notes"];

export function flagSuspiciousRules(
  rules: GraphMessageRule[],
  tenantDomains: string[],
): FlaggedRule[] {
  const domains = tenantDomains.map((d) => d.toLowerCase());
  const isExternal = (address: string) =>
    !domains.some((d) => address.toLowerCase().endsWith(`@${d}`));

  return rules.map((rule) => {
    const flags: string[] = [];
    const a = rule.actions ?? {};

    const forwardTargets = [
      ...(a.forwardTo ?? []),
      ...(a.forwardAsAttachmentTo ?? []),
      ...(a.redirectTo ?? []),
    ].map((t) => t.emailAddress.address);
    const externalTargets = forwardTargets.filter(isExternal);
    if (externalTargets.length > 0) {
      flags.push(`Forwards externally: ${externalTargets.join(", ")}`);
    } else if (forwardTargets.length > 0) {
      flags.push(`Forwards to: ${forwardTargets.join(", ")}`);
    }

    if (a.permanentDelete) flags.push("Permanently deletes messages");
    else if (a.delete) flags.push("Deletes messages");

    if (a.moveToFolder) {
      // moveToFolder is a folder id, not a name — flag any move combined with
      // other stealth traits; name-based hints only apply if it's readable.
      const readable = a.moveToFolder.toLowerCase();
      if (OBSCURE_FOLDER_HINTS.some((h) => readable.includes(h))) {
        flags.push("Moves mail to an obscure folder");
      }
    }

    if (a.stopProcessingRules) flags.push("Stops rule processing");
    if (a.markAsRead && (a.delete || a.moveToFolder || forwardTargets.length)) {
      flags.push("Marks as read (stealth)");
    }

    return { ...rule, flags };
  });
}
