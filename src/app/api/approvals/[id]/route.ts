import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { approvalRequestsRepository } from "../../../../repositories/workflowActionRepositories";
import { createGrant } from "../../../../services/agents/agentGrantsRepository";
import { getAgentConnectionById, recordAgentToolAuditEvent } from "../../../../services/agents/agentConnectionRepository";
import {
  finalizePendingToolCallExecution,
  getPendingToolCallByApprovalId,
  rejectPendingToolCall,
  reservePendingToolCallForExecution,
} from "../../../../services/agents/agentPendingToolCallRepository";
import { executePendingToolCall } from "../../../../services/agents/agentPendingToolCallExecutor";
import type { AgentScope } from "../../../../security/agentScope";

const decisionRoles = ["Super Admin", "Organization Admin", "Executive", "Manager"];

type ExecutionOutcome = { status: "executed"; result: unknown } | { status: "failed"; error: string } | { status: "rejected" };

// Agentic Infrastructure Phase 2 (2026-07-30): the decide endpoint for approval_requests, serving
// both a human reviewing the live Approvals queue and deciding a pending critical-tool approval
// created by POST /api/agents/mcp.
//
// MCP3-2 (2026-08-14): this is the "approval resume" sprint. A read-only investigation before this
// change traced the prior version end to end and confirmed approving a critical MCP tool call
// never actually ran the tool -- only approval_requests.status flipped, and (if alwaysAllow was
// set) a grant was created for *future* calls. This version closes that gap: on approve, if the
// approval has a linked agent_pending_tool_calls row (created alongside it by the MCP route), that
// specific pending call is atomically reserved and executed here, exactly once, via a
// reserve-then-finalize sequence (see agentPendingToolCallRepository.ts) rather than a bare status
// flip. The approval decision itself also gained a compare-and-swap guard (decide() now requires
// status=eq.pending), so a repeat PATCH on an already-decided approval no longer silently
// overwrites it.
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
  if (body.status === "rejected" && !body.decisionReason?.trim()) {
    return NextResponse.json({ error: "decisionReason is required when rejecting." }, { status: 400 });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);

  let decided;
  try {
    decided = await approvalRequestsRepository.decide(scope, id, {
      status: body.status,
      decisionReason: body.decisionReason,
    });
  } catch {
    // decide()'s WHERE clause includes status=eq.pending -- 0 rows means this approval doesn't
    // exist for this org, or (far more commonly, since the id itself came from a real list/link)
    // was already decided by an earlier request. Either way, there is nothing further to execute.
    return NextResponse.json({ error: "This approval was not found, or has already been decided.", alreadyDecided: true }, { status: 409 });
  }

  const metadata = decided.metadata as { agentConnectionId?: string; toolName?: string; toolVersion?: string };

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
      toolVersion: metadata.toolVersion ?? null,
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

  // Approval resume: if this approval has a linked pending tool call, act on it. A non-agent
  // approval (a plain human-to-human workflow approval with no agentConnectionId) has no such row,
  // so this is a no-op for those -- unchanged behavior.
  let execution: ExecutionOutcome | undefined;
  const pendingCall = await getPendingToolCallByApprovalId(scope.organizationId, id);
  if (pendingCall && pendingCall.status === "pending") {
    if (body.status === "approved") {
      const reserved = await reservePendingToolCallForExecution({
        organizationId: scope.organizationId,
        id: pendingCall.id,
        decidedByUserId: session.user.id,
      });
      if (reserved) {
        const connection = await getAgentConnectionById(scope.organizationId, pendingCall.agentConnectionId);
        const agentScope: AgentScope = {
          organizationId: scope.organizationId,
          agentConnectionId: pendingCall.agentConnectionId,
          provider: pendingCall.provider,
          capabilities: connection?.capabilities ?? [],
          issuedByUserId: connection?.issuedByUserId,
          issuedByRole: connection?.issuedByRole,
        };
        const outcome = await executePendingToolCall(pendingCall, agentScope);
        await finalizePendingToolCallExecution({
          organizationId: scope.organizationId,
          id: pendingCall.id,
          result: outcome.status === "executed" ? outcome.result : { error: outcome.error },
          failed: outcome.status === "failed",
        });
        await recordAgentToolAuditEvent(agentScope, {
          toolName: pendingCall.toolName,
          success: outcome.status === "executed",
          argsSummary: pendingCall.arguments,
          errorMessage: outcome.status === "failed" ? outcome.error : undefined,
        });
        execution = outcome;
      }
      // reserved === undefined means another concurrent request already reserved/executed this
      // exact pending call -- deliberately not re-executing or re-reporting here, since this
      // request lost the race and the winning request already recorded the real outcome.
    } else {
      const rejected = await rejectPendingToolCall({
        organizationId: scope.organizationId,
        id: pendingCall.id,
        decidedByUserId: session.user.id,
        reason: body.decisionReason ?? "",
      });
      if (rejected) execution = { status: "rejected" };
    }
  }

  return NextResponse.json({ approval: decided, grantCreated, execution });
}
