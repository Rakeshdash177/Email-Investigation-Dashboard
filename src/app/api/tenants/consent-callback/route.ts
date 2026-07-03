import { NextRequest, NextResponse } from "next/server";
import { getOrganization } from "@/lib/graph";
import { getTenant, markTenantActive } from "@/lib/tenants";

/**
 * Handles Microsoft's redirect after an admin approves (or denies) the
 * app-only consent request. Per Microsoft's own guidance, the `tenant`
 * query param must never be trusted for authentication — we only use it as
 * a lookup key, then independently verify by acquiring a client-credentials
 * token for that tenant and reading /organization before persisting anything.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const tenantId = url.searchParams.get("tenant");
  const adminConsent = url.searchParams.get("admin_consent");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const appUrl = new URL("/", req.url);

  if (error) {
    appUrl.searchParams.set("consentError", errorDescription || error);
    return NextResponse.redirect(appUrl);
  }

  if (!state || !tenantId || adminConsent !== "True") {
    appUrl.searchParams.set("consentError", "Consent response was missing required parameters.");
    return NextResponse.redirect(appUrl);
  }

  const record = await getTenant(state);
  if (!record) {
    appUrl.searchParams.set("consentError", "Unknown tenant record — try adding the tenant again.");
    return NextResponse.redirect(appUrl);
  }

  try {
    const org = await getOrganization(tenantId);
    const defaultDomain = org.verifiedDomains.find((d) => d.isDefault)?.name ?? null;
    await markTenantActive(record.id, {
      tenantId,
      displayName: org.displayName,
      defaultDomain,
    });
  } catch (err) {
    appUrl.searchParams.set(
      "consentError",
      `Consent was recorded by Microsoft but verification failed: ${(err as Error).message}`,
    );
    return NextResponse.redirect(appUrl);
  }

  appUrl.searchParams.set("tenantAdded", record.id);
  return NextResponse.redirect(appUrl);
}
