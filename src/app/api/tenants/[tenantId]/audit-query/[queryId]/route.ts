import { NextRequest, NextResponse } from "next/server";
import { classifyAuditRecords } from "@/lib/audit";
import { getAuditQueryStatus, GraphError, listAuditRecords } from "@/lib/graph";
import { getTenant } from "@/lib/tenants";

/** Polling endpoint: returns {status} while the Purview query is running;
 * once succeeded, fetches and classifies all records in the same response. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; queryId: string }> },
) {
  const { tenantId: recordId, queryId } = await params;
  const record = await getTenant(recordId);
  if (!record || record.status !== "active" || !record.tenantId) {
    return NextResponse.json({ error: "Tenant not found or not yet active" }, { status: 404 });
  }

  try {
    const status = await getAuditQueryStatus(record.tenantId, queryId);
    if (status !== "succeeded") {
      return NextResponse.json({ status });
    }
    const records = await listAuditRecords(record.tenantId, queryId);
    const classified = classifyAuditRecords(records);
    return NextResponse.json({ status, ...classified });
  } catch (err) {
    if (err instanceof GraphError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
