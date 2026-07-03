import { NextRequest, NextResponse } from "next/server";
import { deleteTenant, getTenant } from "@/lib/tenants";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const record = await getTenant(tenantId);
  if (!record) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json({ tenant: record });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const ok = await deleteTenant(tenantId);
  if (!ok) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
