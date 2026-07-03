import InvestigationDashboard from "@/components/InvestigationDashboard";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <InvestigationDashboard tenantId={tenantId} />;
}
