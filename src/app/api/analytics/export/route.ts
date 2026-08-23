import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";

// Analytics Sprint 3: matches /api/approvals/export's established pattern (RAG Remediation
// Sprint 3, A-60) -- the actual export file is generated client-side (a real, tenant-scoped JSON
// Blob of whatever's currently rendered, filters included), not re-fetched server-side. This
// route's only job is the part the client cannot do safely itself: writing a real, tenant-scoped
// audit event for the export action.
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    projectCount?: number;
    dataMode?: string;
    filters?: Record<string, string>;
  };
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const auditLog = await auditLogsRepository.record(scope, {
    action: "analytics.export_report",
    resourceType: "analytics_report",
    category: "reporting",
    metadata: {
      projectCount: typeof body.projectCount === "number" ? body.projectCount : undefined,
      dataMode: typeof body.dataMode === "string" ? body.dataMode : undefined,
      filters: body.filters ?? undefined,
      exportedAt: new Date().toISOString(),
    },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, auditLogId: auditLog?.id });
}
