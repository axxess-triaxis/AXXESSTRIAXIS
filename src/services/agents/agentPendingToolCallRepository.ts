import { supabaseAdminRest } from "../../repositories/supabaseAdmin";
import type { AgentProviderId } from "../../security/agentScope";

export type PendingToolCallStatus = "pending" | "executed" | "rejected" | "failed";

export type PendingToolCallSummary = {
  id: string;
  organizationId: string;
  agentConnectionId: string;
  approvalRequestId: string;
  toolName: string;
  toolVersion: string;
  provider: AgentProviderId;
  arguments: Record<string, unknown>;
  idempotencyKey: string;
  status: PendingToolCallStatus;
  decidedByUserId?: string;
  decidedAt?: string;
  executedAt?: string;
  executionResult?: unknown;
  createdAt: string;
};

type PendingToolCallRow = {
  id: string;
  organization_id: string;
  agent_connection_id: string;
  approval_request_id: string;
  tool_name: string;
  tool_version: string;
  provider: AgentProviderId;
  arguments: Record<string, unknown>;
  idempotency_key: string;
  status: PendingToolCallStatus;
  decided_by_user_id: string | null;
  decided_at: string | null;
  executed_at: string | null;
  execution_result: unknown;
  created_at: string;
};

const pendingCallSelect = "id,organization_id,agent_connection_id,approval_request_id,tool_name,tool_version,provider,arguments,idempotency_key,status,decided_by_user_id,decided_at,executed_at,execution_result,created_at";

function toSummary(row: PendingToolCallRow): PendingToolCallSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    agentConnectionId: row.agent_connection_id,
    approvalRequestId: row.approval_request_id,
    toolName: row.tool_name,
    toolVersion: row.tool_version,
    provider: row.provider,
    arguments: row.arguments ?? {},
    idempotencyKey: row.idempotency_key,
    status: row.status,
    decidedByUserId: row.decided_by_user_id ?? undefined,
    decidedAt: row.decided_at ?? undefined,
    executedAt: row.executed_at ?? undefined,
    executionResult: row.execution_result ?? undefined,
    createdAt: row.created_at,
  };
}

// Created by POST /api/agents/mcp's tools/call handler, in the same request that creates the
// linked approval_requests row -- this is the machine-execution counterpart to that human-facing
// governance record. idempotencyKey is a fresh UUID per pending call (each distinct MCP call
// attempt gets its own row; this is not intended to dedupe identical-looking calls, only to give
// the exactly-once execution guard in the approval route a stable key to reason about).
export async function createPendingToolCall(input: {
  organizationId: string;
  agentConnectionId: string;
  approvalRequestId: string;
  toolName: string;
  toolVersion: string;
  provider: AgentProviderId;
  arguments: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<PendingToolCallSummary> {
  const rows = await supabaseAdminRest<PendingToolCallRow[]>("agent_pending_tool_calls", {
    method: "POST",
    prefer: "return=representation",
    body: {
      organization_id: input.organizationId,
      agent_connection_id: input.agentConnectionId,
      approval_request_id: input.approvalRequestId,
      tool_name: input.toolName,
      tool_version: input.toolVersion,
      provider: input.provider,
      arguments: input.arguments,
      idempotency_key: input.idempotencyKey,
      status: "pending",
    },
  });
  const row = rows?.[0];
  if (!row) throw new Error("Pending tool call was not returned by Supabase.");
  return toSummary(row);
}

export async function getPendingToolCallByApprovalId(organizationId: string, approvalRequestId: string): Promise<PendingToolCallSummary | undefined> {
  const rows = await supabaseAdminRest<PendingToolCallRow[]>("agent_pending_tool_calls", {
    method: "GET",
    query: new URLSearchParams({
      select: pendingCallSelect,
      approval_request_id: `eq.${approvalRequestId}`,
      organization_id: `eq.${organizationId}`,
      limit: "1",
    }),
  });
  const row = rows?.[0];
  return row ? toSummary(row) : undefined;
}

// The exactly-once guarantee for "approval resume" is a two-phase reserve-then-finalize, not a
// single write: (1) reservePendingToolCallForExecution atomically flips pending -> executed via a
// PATCH whose WHERE clause includes status=eq.pending -- a concurrent second caller (or a genuine
// double-click) racing this same transition gets 0 rows back and must NOT call the tool handler;
// (2) only the caller that won the reservation actually invokes the tool handler, then calls
// finalizePendingToolCallExecution to record the real result (this second write is by id alone,
// safe because reservation already made this row exclusively "ours"). Rejection has no execution
// step, so it stays a single CAS write (rejectPendingToolCall).

export async function reservePendingToolCallForExecution(input: {
  organizationId: string;
  id: string;
  decidedByUserId?: string;
}): Promise<PendingToolCallSummary | undefined> {
  const rows = await supabaseAdminRest<PendingToolCallRow[]>("agent_pending_tool_calls", {
    method: "PATCH",
    query: new URLSearchParams({
      id: `eq.${input.id}`,
      organization_id: `eq.${input.organizationId}`,
      status: "eq.pending",
    }),
    body: {
      status: "executed",
      decided_by_user_id: input.decidedByUserId ?? null,
      decided_at: new Date().toISOString(),
    },
  });
  const row = rows?.[0];
  return row ? toSummary(row) : undefined;
}

// Called only after reservePendingToolCallForExecution succeeded for this row -- no CAS needed
// here (the reservation already guarantees exclusivity), just records the real outcome. Flips the
// row to "failed" if the tool handler itself threw/errored, so a reservation can never be silently
// stuck showing "executed" with no result.
export async function finalizePendingToolCallExecution(input: {
  organizationId: string;
  id: string;
  result: unknown;
  failed?: boolean;
}): Promise<PendingToolCallSummary | undefined> {
  const rows = await supabaseAdminRest<PendingToolCallRow[]>("agent_pending_tool_calls", {
    method: "PATCH",
    query: new URLSearchParams({
      id: `eq.${input.id}`,
      organization_id: `eq.${input.organizationId}`,
    }),
    body: {
      status: input.failed ? "failed" : "executed",
      execution_result: input.result,
    },
  });
  const row = rows?.[0];
  return row ? toSummary(row) : undefined;
}

export async function rejectPendingToolCall(input: {
  organizationId: string;
  id: string;
  decidedByUserId?: string;
  reason: string;
}): Promise<PendingToolCallSummary | undefined> {
  const rows = await supabaseAdminRest<PendingToolCallRow[]>("agent_pending_tool_calls", {
    method: "PATCH",
    query: new URLSearchParams({
      id: `eq.${input.id}`,
      organization_id: `eq.${input.organizationId}`,
      status: "eq.pending",
    }),
    body: {
      status: "rejected",
      decided_by_user_id: input.decidedByUserId ?? null,
      decided_at: new Date().toISOString(),
      execution_result: { rejected: true, reason: input.reason },
    },
  });
  const row = rows?.[0];
  return row ? toSummary(row) : undefined;
}
