import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type TenantStatus = "pending" | "active";

export interface TenantRecord {
  /** Internal record id — used in URLs (`/tenants/[id]`) so we never need the
   * Azure tenant GUID before consent has actually completed. */
  id: string;
  /** What the user typed when adding the tenant (domain or GUID). */
  domainOrId: string;
  /** Azure AD tenant GUID — null until admin consent completes and we verify it. */
  tenantId: string | null;
  displayName: string | null;
  defaultDomain: string | null;
  status: TenantStatus;
  addedAt: string;
  consentGrantedAt: string | null;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "tenants.json");

async function readAll(): Promise<TenantRecord[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as TenantRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(tenants: TenantRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(tenants, null, 2), "utf-8");
}

export async function listTenants(): Promise<TenantRecord[]> {
  return readAll();
}

export async function getTenant(id: string): Promise<TenantRecord | undefined> {
  const tenants = await readAll();
  return tenants.find((t) => t.id === id);
}

export async function addPendingTenant(domainOrId: string): Promise<TenantRecord> {
  const tenants = await readAll();
  const record: TenantRecord = {
    id: randomUUID(),
    domainOrId: domainOrId.trim(),
    tenantId: null,
    displayName: null,
    defaultDomain: null,
    status: "pending",
    addedAt: new Date().toISOString(),
    consentGrantedAt: null,
  };
  tenants.push(record);
  await writeAll(tenants);
  return record;
}

export async function markTenantActive(
  id: string,
  info: { tenantId: string; displayName: string; defaultDomain: string | null },
): Promise<TenantRecord | undefined> {
  const tenants = await readAll();
  const record = tenants.find((t) => t.id === id);
  if (!record) return undefined;
  record.tenantId = info.tenantId;
  record.displayName = info.displayName;
  record.defaultDomain = info.defaultDomain;
  record.status = "active";
  record.consentGrantedAt = new Date().toISOString();
  await writeAll(tenants);
  return record;
}

export async function deleteTenant(id: string): Promise<boolean> {
  const tenants = await readAll();
  const next = tenants.filter((t) => t.id !== id);
  if (next.length === tenants.length) return false;
  await writeAll(next);
  return true;
}
