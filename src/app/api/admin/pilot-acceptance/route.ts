import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { persistPilotAcceptanceSnapshot } from "../../../../repositories/pilotAcceptanceRepository";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { canManageOrganization } from "../../../../security/rbac";
import { buildPilotAcceptanceRuntimeSnapshot } from "../../../../services/pilot/pilotAcceptanceRuntime";

const decisions = ["snapshot", "accepted", "handoff_recorded"] as const;
type PilotAcceptanceDecision = typeof decisions[number];

function isDecision(value: unknown): value is PilotAcceptanceDecision {
  return typeof value === "string" && decisions.includes(value as PilotAcceptanceDecision);
}

async function jsonBody(request: Request) {
  const body = await request.json().catch(() => ({}));
  return typeof body === "object" && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

function textNote(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 600) : undefined;
}

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageOrganization(session.user, session.user.organizationId)) {
    return NextResponse.json({ error: "Organization admin access is required." }, { status: 403 });
  }

  const snapshot = await buildPilotAcceptanceRuntimeSnapshot({
    user: session.user,
    accessToken: session.accessToken,
    env: process.env,
  });

  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageOrganization(session.user, session.user.organizationId)) {
    return NextResponse.json({ error: "Organization admin access is required." }, { status: 403 });
  }

  const body = await jsonBody(request);
  const decision = isDecision(body.decision) ? body.decision : "snapshot";
  const recordedAt = new Date().toISOString();
  const snapshot = await buildPilotAcceptanceRuntimeSnapshot({
    user: session.user,
    accessToken: session.accessToken,
    env: process.env,
    acceptedAt: decision === "accepted" ? recordedAt : undefined,
    operatorHandoffRecordedAt: decision === "handoff_recorded" ? recordedAt : undefined,
  });
  const result = await persistPilotAcceptanceSnapshot({
    snapshot,
    userId: session.user.id,
    decision,
    note: textNote(body.note),
  });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await auditLogsRepository.record(scope, {
    action: decision === "accepted" ? "pilot_acceptance.accepted" : "pilot_acceptance.live_ops_recorded",
    resourceType: "pilot_tenant_acceptance_run",
    resourceId: result.runId,
    category: "pilot-acceptance",
    metadata: {
      decision,
      persisted: result.persisted,
      score: snapshot.score,
      status: snapshot.status,
      stage: snapshot.stage,
    },
  }).catch(() => undefined);

  return NextResponse.json({ ...result, snapshot });
}
