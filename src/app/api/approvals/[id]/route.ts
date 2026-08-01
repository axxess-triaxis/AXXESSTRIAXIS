import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
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

  let grantCreated = false;
  const metadata = decided.metadata as { agentConnectionId?: string; toolName?: string };
  if (body.status === "approved" && body.alwaysAllow && metadata.agentConnectionId && metadata.toolName) {
    await createGrant({
      organizationId: scope.organizationId,
      agentConnectionId: metadata.agentConnectionId,
      toolName: metadata.toolName,
      grantedByUserId: session.user.id,
    });
    grantCreated = true;
  }

  return NextResponse.json({ approval: decided, grantCreated });
}
