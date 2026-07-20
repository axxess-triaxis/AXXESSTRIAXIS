import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { isDemoModeEnabled } from "../../../../../demo/demoMode";
import { applicationServices } from "../../../../../providers/serviceProvider";
import { persistCustomerSuccessLiveOpsSnapshot } from "../../../../../repositories/customerSuccessLiveOpsRepository";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { canManageOrganization } from "../../../../../security/rbac";
import { getFallbackLiveWorkspaceMetrics, getLiveWorkspaceMetrics, getZeroLiveWorkspaceMetrics } from "../../../../../services/live-platform/livePlatform";
import { buildCustomerSuccessLiveOpsSnapshot } from "../../../../../services/pilot/customerSuccessLiveOps";
import { buildPilotAcceptanceRuntimeSnapshot } from "../../../../../services/pilot/pilotAcceptanceRuntime";
import { buildEnterpriseGoldenPathSnapshot } from "../../../../../services/workflows/enterpriseGoldenPath";

async function buildRuntimeSnapshot(session: NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>>) {
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  // A live metrics failure must never surface fabricated demo numbers for a real customer. See
  // DEMO_DATA_LEAKAGE_AUDIT.md.
  const metrics = await getLiveWorkspaceMetrics(applicationServices, scope).catch(() => (
    isDemoModeEnabled() ? getFallbackLiveWorkspaceMetrics() : getZeroLiveWorkspaceMetrics()
  ));
  const goldenPath = buildEnterpriseGoldenPathSnapshot({
    metrics,
    userRole: session.user.role,
    hasOrganization: Boolean(session.user.organizationId),
    hasProfile: Boolean(session.user.id && session.user.displayName),
    pendingAiReviews: metrics.pendingApprovals > 0 ? Math.min(6, Math.max(1, Math.ceil(metrics.pendingApprovals / 8))) : 0,
    connectedIntegrations: metrics.integrationConfigured,
  });
  const acceptance = await buildPilotAcceptanceRuntimeSnapshot({
    user: session.user,
    accessToken: session.accessToken,
    env: process.env,
  });

  return buildCustomerSuccessLiveOpsSnapshot({
    organizationId: session.user.organizationId,
    organizationName: acceptance.organizationName,
    metrics,
    goldenPath,
    acceptance,
  });
}

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageOrganization(session.user, session.user.organizationId)) {
    return NextResponse.json({ error: "Organization admin access is required." }, { status: 403 });
  }

  return NextResponse.json(await buildRuntimeSnapshot(session));
}

export async function POST() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageOrganization(session.user, session.user.organizationId)) {
    return NextResponse.json({ error: "Organization admin access is required." }, { status: 403 });
  }

  const snapshot = await buildRuntimeSnapshot(session);
  const result = await persistCustomerSuccessLiveOpsSnapshot({
    snapshot,
    userId: session.user.id,
  });
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await auditLogsRepository.record(scope, {
    action: "customer_success.live_ops_snapshot_recorded",
    resourceType: "customer_success_live_ops_snapshot",
    resourceId: result.snapshotId,
    category: "customer-success",
    metadata: {
      persisted: result.persisted,
      status: snapshot.status,
      score: snapshot.score,
      recoveryItems: snapshot.recoveryItems.length,
      slaTimers: snapshot.slaTimers.length,
      regionalKeyPolicies: snapshot.regionalKeyPolicies.length,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ...result, snapshot });
}
