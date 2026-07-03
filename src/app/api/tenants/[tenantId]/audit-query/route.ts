import { NextRequest, NextResponse } from "next/server";
import { createAuditQuery, GraphError } from "@/lib/graph";
import { resolveRange, type TimelineRange } from "@/lib/risk";
import { getTenant } from "@/lib/tenants";

/** Kicks off a Purview audit-log query (asynchronous server-side — poll the
 * sibling GET route with the returned queryId until it succeeds). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId: recordId } = await params;
  const record = await getTenant(recordId);
  if (!record || record.status !== "active" || !record.tenantId) {
    return NextResponse.json({ error: "Tenant not found or not yet active" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const upn = typeof body?.upn === "string" ? body.upn : "";
  const range = (body?.range ?? "7d") as TimelineRange;
  if (!upn) return NextResponse.json({ error: "upn is required" }, { status: 400 });

  let startISO: string;
  let endISO: string;
  try {
    const custom =
      range === "custom" ? { start: body?.start ?? "", end: body?.end ?? "" } : undefined;
    ({ startISO, endISO } = resolveRange(range, custom));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  try {
    const queryId = await createAuditQuery(record.tenantId, { upn, startISO, endISO });
    return NextResponse.json({ queryId, startISO, endISO });
  } catch (err) {
    if (err instanceof GraphError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
