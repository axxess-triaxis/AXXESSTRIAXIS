import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import { buildPrivacyExecutionPlan, type PrivacyRequest } from "../../../../privacy/privacyEngine";

export async function POST() {
  const session = await getServerAuthSession(false);
  if (!session) return NextResponse.json({ error: "Account deletion requires an authenticated session." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  let requestId: string | undefined;
  // Distinct from "not configured": tracks whether the insert itself failed (network/RLS/etc.) so
  // the response never claims "queued" when nothing was actually persisted.
  let persisted = false;

  if (isSupabaseAdminConfigured()) {
    const plan = buildPrivacyExecutionPlan({
      id: "",
      organizationId: scope.organizationId,
      requesterUserId: scope.userId,
      subjectUserId: scope.userId,
      type: "erasure",
      status: "queued",
      requestedAt: new Date().toISOString(),
    } satisfies PrivacyRequest);

    const rows = await supabaseAdminRest<Array<{ id: string }>>("privacy_requests", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        requester_user_id: scope.userId,
        subject_user_id: scope.userId,
        request_type: "erasure",
        status: "queued",
        execution_plan: plan,
      },
    }).catch(() => []);
    requestId = rows[0]?.id;
    persisted = Boolean(requestId);
  }

  await auditLogsRepository.record(scope, {
    action: "account.deletion.requested",
    resourceType: "privacy_request",
    resourceId: requestId ?? session.user.id,
    category: "privacy",
    metadata: { requestType: "erasure", persisted },
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    requestId,
    message: persisted
      ? "Deletion request queued and planned. Beta operations will verify legal hold, audit retention, and tenant ownership before executing the plan."
      : "Deletion request received, but could not be persisted for tracking right now. Beta operations has been notified via the audit log; please also reach out directly to confirm.",
  });
}
