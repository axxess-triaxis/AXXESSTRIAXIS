import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { persistMobileStoreLaunchSnapshot, type MobileStoreLaunchAction } from "../../../../repositories/mobileStoreLaunchRepository";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { canManageOrganization } from "../../../../security/rbac";
import { buildMobileStoreLaunchSnapshot } from "../../../../services/mobile/mobileStoreLaunch";

const actions = new Set<MobileStoreLaunchAction>(["snapshot_recorded", "reviewer_provisioned", "rollout_updated"]);

async function buildRuntimeSnapshot(session: NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>>) {
  return buildMobileStoreLaunchSnapshot({
    organizationId: session.user.organizationId,
    organizationName: "North East Health Mission",
    env: process.env,
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

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageOrganization(session.user, session.user.organizationId)) {
    return NextResponse.json({ error: "Organization admin access is required." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { action?: MobileStoreLaunchAction; note?: string };
  const action = body.action && actions.has(body.action) ? body.action : "snapshot_recorded";
  const snapshot = await buildRuntimeSnapshot(session);
  const result = await persistMobileStoreLaunchSnapshot({
    snapshot,
    userId: session.user.id,
    action,
    note: body.note,
  });
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await auditLogsRepository.record(scope, {
    action: `mobile_release.${action}`,
    resourceType: "mobile_release_run",
    resourceId: result.releaseRunId,
    category: "mobile-release",
    metadata: {
      persisted: result.persisted,
      status: snapshot.status,
      readinessScore: snapshot.readinessScore,
      releaseGates: snapshot.releaseGates.length,
      screenshotManifest: snapshot.screenshotManifest.length,
      releaseHealth: snapshot.releaseHealth.status,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ...result, snapshot });
}
