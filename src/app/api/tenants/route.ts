import { NextRequest, NextResponse } from "next/server";
import { addPendingTenant, getTenant, listTenants, type TenantRecord } from "@/lib/tenants";

export async function GET() {
  const tenants = await listTenants();
  return NextResponse.json({ tenants });
}

function buildConsentUrl(record: TenantRecord, clientId: string, redirectUri: string): string {
  // For a re-consent, prefer the verified tenant GUID over the typed domain.
  const tenantSegment = record.tenantId ?? record.domainOrId;
  const consentUrl = new URL(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantSegment)}/v2.0/adminconsent`,
  );
  consentUrl.searchParams.set("client_id", clientId);
  consentUrl.searchParams.set("scope", "https://graph.microsoft.com/.default");
  consentUrl.searchParams.set("redirect_uri", redirectUri);
  // `state` carries our internal record id so the callback can match the
  // redirect back to the tenant record (new or re-consenting).
  consentUrl.searchParams.set("state", record.id);
  return consentUrl.toString();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const domainOrId = typeof body?.domainOrId === "string" ? body.domainOrId.trim() : "";
  const existingId = typeof body?.existingId === "string" ? body.existingId : "";
  if (!domainOrId && !existingId) {
    return NextResponse.json({ error: "domainOrId or existingId is required" }, { status: 400 });
  }

  const clientId = process.env.AZURE_CLIENT_ID;
  const redirectUri = process.env.AZURE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Server is missing AZURE_CLIENT_ID / AZURE_REDIRECT_URI — see README.md setup." },
      { status: 500 },
    );
  }

  // Re-consent flow: regenerate the consent URL for an already-listed tenant
  // (needed whenever the app registration's permission set changes).
  const record = existingId ? await getTenant(existingId) : await addPendingTenant(domainOrId);
  if (!record) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ tenant: record, consentUrl: buildConsentUrl(record, clientId, redirectUri) });
}
