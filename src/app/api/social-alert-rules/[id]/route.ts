import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { deleteSocialAlertRule } from "../../../../repositories/socialAlertRulesRepository";

// A-96 (2026-08-04).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await deleteSocialAlertRule(scope, id);
  await auditLogsRepository.record(scope, {
    action: "social_alert_rule.deleted",
    resourceType: "social_alert_rule",
    resourceId: id,
    category: "governance",
    metadata: {},
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
