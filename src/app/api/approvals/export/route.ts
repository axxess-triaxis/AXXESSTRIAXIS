import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";

// RAG Remediation Sprint 3 (A-60): the actual export (JSON blob, client-triggered download) mirrors
// the existing Export Briefing pattern (DashboardSection.tsx, ED-1) rather than duplicating a
// second server-generated file endpoint. This route's only job is the part the client cannot do
// safely itself: writing a real, tenant-scoped audit event for the export action.
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { approvalCount?: number };
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const auditLog = await auditLogsRepository.record(scope, {
    action: "approvals.export_report",
    resourceType: "approval_request",
    category: "governance",
    metadata: {
      approvalCount: typeof body.approvalCount === "number" ? body.approvalCount : undefined,
      exportedAt: new Date().toISOString(),
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, auditLogId: auditLog?.id });
}
