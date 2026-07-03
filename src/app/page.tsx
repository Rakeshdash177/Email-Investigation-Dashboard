import TenantPickerClient from "@/components/TenantPickerClient";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tenantAdded = typeof sp.tenantAdded === "string" ? sp.tenantAdded : null;
  const consentError = typeof sp.consentError === "string" ? sp.consentError : null;

  return <TenantPickerClient tenantAdded={tenantAdded} consentError={consentError} />;
}
