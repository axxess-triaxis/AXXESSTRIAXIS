import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { approvalRequestsRepository } from "../../../../repositories/workflowActionRepositories";
import { createGrant } from "../../../../services/agents/agentGrantsRepository";

const decisionRoles = ["Super Admin", "Organization Admin", "Executive", "Manager"];

// Agentic Infrastructure Phase 2 (2026-07-30): the missing decide endpoint for approval_requests
// (previously list/create only -- see workflowActionRepositories.ts). Serves both a human
// reviewing the live Approvals queue and deciding a pending critical-tool approval created by
// POST /api/agents/mcp. When an agent-originated approval is approved with alwaysAllow, this also
// creates the "Always Allow" grant so future identical calls skip the approval round trip.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!decisionRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot decide approval requests." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { status?: string; decisionReason?: string; alwaysAllow?: boolean } | null;
  if (body?.status !== "approved" && body?.status !== "rejected") {
    return NextResponse.json({ error: "status must be 'approved' or 'rejected'." }, { status: 400 });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const decided = await approvalRequestsRepository.decide(scope, id, {
    status: body.status,
    decisionReason: body.decisionReason,
  });

  const metadata = decided.metadata as { agentConnectionId?: string; toolName?: string };

  // Q-007: neither approval_requests nor agent_action_grants (both written service-role-only) has
  // an audit_logs trigger -- this is the human checkpoint for the highest-autonomy AI-agent surface
  // in the product, so it gets its own explicit audit-log write, matching the pattern already used
  // for invitation/role-change actions.
  await auditLogsRepository.record(scope, {
    action: body.status === "approved" ? "approval.approved" : "approval.rejected",
    resourceType: "approval_request",
    resourceId: id,
    category: "ai-governance",
    metadata: {
      decisionReason: body.decisionReason ?? null,
      agentConnectionId: metadata.agentConnectionId ?? null,
      toolName: metadata.toolName ?? null,
      alwaysAllow: Boolean(body.alwaysAllow),
    },
  }).catch(() => undefined);

  let grantCreated = false;
  if (body.status === "approved" && body.alwaysAllow && metadata.agentConnectionId && metadata.toolName) {
    const grant = await createGrant({
      organizationId: scope.organizationId,
      agentConnectionId: metadata.agentConnectionId,
      toolName: metadata.toolName,
      grantedByUserId: session.user.id,
    });
    grantCreated = true;

    await auditLogsRepository.record(scope, {
      action: "agent_grant.created",
      resourceType: "agent_action_grant",
      resourceId: grant.id,
      category: "ai-governance",
      metadata: { agentConnectionId: metadata.agentConnectionId, toolName: metadata.toolName },
    }).catch(() => undefined);
  }

  return NextResponse.json({ approval: decided, grantCreated });
}
