import { NextRequest, NextResponse } from "next/server";
import { GraphError, listUsers } from "@/lib/graph";
import { getTenant } from "@/lib/tenants";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId: recordId } = await params;
  const record = await getTenant(recordId);
  if (!record || record.status !== "active" || !record.tenantId) {
    return NextResponse.json({ error: "Tenant not found or not yet active" }, { status: 404 });
  }

  try {
    const users = await listUsers(record.tenantId);
    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof GraphError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
