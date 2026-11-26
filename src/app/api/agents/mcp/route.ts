import { NextResponse } from "next/server";
import { resolveAgentScopeFromApiKey, recordAgentToolAuditEvent } from "../../../../services/agents/agentConnectionRepository";
import { hasGrant } from "../../../../services/agents/agentGrantsRepository";
import {
  closeDuplicateApprovalRequest,
  createPendingToolCall,
  createPendingToolCallUnlessExists,
  getPendingToolCallByIdempotencyKey,
  type PendingToolCallSummary,
} from "../../../../services/agents/agentPendingToolCallRepository";
import {
  idempotencyNotApplied,
  isSameToolCall,
  pendingToolCallState,
  readCallerIdempotencyKey,
  scopedIdempotencyKey,
} from "../../../../services/agents/agentToolCallIdempotency";
import { approvalRequestsRepository } from "../../../../repositories/workflowActionRepositories";
import { agentScopeHasCapability, type AgentScope } from "../../../../security/agentScope";
import { agentToolRegistry, getAgentTool, validateAgentToolArguments } from "../../../../services/agents/toolRegistry";
import type { RoleName } from "../../../../domain";

// Agentic Infrastructure Phase 1 (2026-07-30): a real MCP (Model Context Protocol) server over the
// Streamable HTTP transport -- a single POST endpoint speaking JSON-RPC 2.0 -- per the founder's
// explicit choice, so Claude/OpenAI-family MCP clients can connect directly with no bespoke
// translation layer. Implements the three core methods a tool-calling MCP server needs:
// initialize, tools/list, tools/call. Auth is a transport-level HTTP concern (Bearer API key),
// checked before any JSON-RPC parsing -- consistent with how MCP's HTTP transport treats auth.

const serverInfo = { name: "axxess-triaxis-agent-server", version: "1.0.0" };
const protocolVersion = "2025-06-18";
const maxMcpRequestBytes = 64 * 1024;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function rpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: string | number | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

// approvalRequestsRepository.create() takes a TenantScope (organizationId/userId/role) -- an
// agent has no human session, so this attributes the request to the human who issued the
// connection's key, same as toolRegistry.ts's own writes (created_by_user_id, owner_role).
function tenantScopeForApproval(scope: AgentScope) {
  return {
    organizationId: scope.organizationId,
    userId: scope.issuedByUserId ?? scope.agentConnectionId,
    role: (scope.issuedByRole ?? "Organization Admin") as RoleName,
  };
}

// Answers a tools/call whose idempotency key already has a pending call: the same call again gets
// the existing one back, a different call is refused. Either way nothing is created or run.
async function replayPendingCall(
  id: string | number | null,
  scope: AgentScope,
  existing: PendingToolCallSummary,
  toolName: string,
  toolArgs: Record<string, unknown>,
) {
  if (!isSameToolCall(existing, toolName, toolArgs)) {
    const message = "This idempotency key was already used by this connection for a different tool or different arguments.";
    await recordAgentToolAuditEvent(scope, { toolName, success: false, argsSummary: toolArgs, errorMessage: message });
    return rpcError(id, -32009, message);
  }
  const status = pendingToolCallState(existing);
  await recordAgentToolAuditEvent(scope, { toolName, success: false, argsSummary: toolArgs, errorMessage: status === "pending_approval" ? status : "duplicate_call" });
  return rpcResult(id, {
    content: [{ type: "text", text: JSON.stringify({ status, approvalRequestId: existing.approvalRequestId, pendingToolCallId: existing.id, duplicate: true }) }],
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxMcpRequestBytes) {
    return NextResponse.json({ error: "MCP request payload is too large." }, { status: 413 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const rawKey = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!rawKey) {
    return NextResponse.json({ error: "Missing Bearer API key." }, { status: 401 });
  }

  const scope = await resolveAgentScopeFromApiKey(rawKey);
  if (!scope) {
    return NextResponse.json({ error: "Invalid or revoked agent API key." }, { status: 401 });
  }

  const body = await request.json().catch(() => undefined) as JsonRpcRequest | undefined;
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(body?.id ?? null, -32600, "Invalid JSON-RPC 2.0 request.");
  }

  // MCP Streamable HTTP (2025-06-18): a notification -- no id, e.g. notifications/initialized -- gets
  // 202 with no body. The server acts on none of them yet.
  if (body.id === undefined && body.method.startsWith("notifications/")) {
    return new NextResponse(null, { status: 202 });
  }

  if (body.method === "initialize") {
    return rpcResult(body.id, {
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo,
    });
  }

  if (body.method === "tools/list") {
    return rpcResult(body.id, {
      tools: agentToolRegistry
        .filter((tool) => agentScopeHasCapability(scope, tool.requiredCapability))
        .map((tool) => ({ name: tool.name, version: tool.version, description: tool.description, inputSchema: tool.inputSchema })),
    });
  }

  if (body.method === "tools/call") {
    const toolName = typeof body.params?.name === "string" ? body.params.name : "";
    const rawToolArgs = body.params?.arguments ?? {};
    const tool = getAgentTool(toolName);

    if (!tool) return rpcError(body.id, -32601, `Unknown tool: ${toolName}`);
    if (!agentScopeHasCapability(scope, tool.requiredCapability)) {
      await recordAgentToolAuditEvent(scope, { toolName, success: false, errorMessage: "capability not granted" });
      return rpcError(body.id, -32001, `This agent connection does not have the ${tool.requiredCapability} capability.`);
    }

    const validation = validateAgentToolArguments(tool, rawToolArgs);
    if (!validation.ok) {
      await recordAgentToolAuditEvent(scope, { toolName, success: false, errorMessage: validation.message });
      return rpcError(body.id, -32602, validation.message);
    }
    const toolArgs = validation.args;

    // Ops worker support (2026-11-25): an optional caller key (agentToolCallIdempotency.ts) makes a
    // retry return the first pending call. Checked before the grant, so that a retry after "approve
    // and always allow" cannot run the same call a second time.
    const callerKey = readCallerIdempotencyKey(body.params?._meta);
    if (!callerKey.ok) {
      await recordAgentToolAuditEvent(scope, { toolName, success: false, errorMessage: callerKey.message });
      return rpcError(body.id, -32602, callerKey.message);
    }
    const keyLookup = callerKey.key === undefined ? undefined : {
      organizationId: scope.organizationId,
      agentConnectionId: scope.agentConnectionId,
      idempotencyKey: scopedIdempotencyKey(scope.agentConnectionId, callerKey.key),
    };
    if (keyLookup) {
      const existing = await getPendingToolCallByIdempotencyKey(keyLookup);
      if (existing) return replayPendingCall(body.id, scope, existing, toolName, toolArgs);
    }

    // Agentic Infrastructure Phase 2 (2026-07-30): critical tools (anything real-world-visible --
    // notifies people, writes an external-facing record, or spends money on an external model
    // call) don't execute on a caller's say-so alone. They need either a standing "Always Allow"
    // grant (src/services/agents/agentGrantsRepository.ts) or a fresh human decision -- so this
    // creates a real approval_requests row and returns pending instead of running the handler.
    if (tool.criticality === "critical") {
      const granted = tool.requiresFreshApproval ? false : await hasGrant(scope.agentConnectionId, tool.name);
      if (!granted) {
        const approval = await approvalRequestsRepository.create(tenantScopeForApproval(scope), {
          title: `Agent (${scope.provider}) wants to call ${tool.name}`,
          description: `Connection ${scope.agentConnectionId} requested ${tool.name} with arguments: ${JSON.stringify(toolArgs)}`,
          priority: "high",
          metadata: { agentConnectionId: scope.agentConnectionId, toolName: tool.name, toolVersion: tool.version, provider: scope.provider, args: toolArgs },
        });
        // MCP3-2: the machine-execution counterpart to the approval_requests row above -- this is
        // what PATCH /api/approvals/[id] atomically reserves and executes exactly once when a
        // human approves. Without a caller key, idempotencyKey is a fresh id per call attempt (not a
        // content hash), so two distinct MCP tools/call requests with identical arguments still get
        // their own separate pending row rather than being silently merged.
        const pendingCallInput = {
          organizationId: scope.organizationId,
          agentConnectionId: scope.agentConnectionId,
          approvalRequestId: approval.id,
          toolName: tool.name,
          toolVersion: tool.version,
          provider: scope.provider,
          arguments: toolArgs,
          idempotencyKey: keyLookup?.idempotencyKey ?? crypto.randomUUID(),
        };
        const pendingCall = keyLookup ? await createPendingToolCallUnlessExists(pendingCallInput) : await createPendingToolCall(pendingCallInput);
        if (!pendingCall) {
          // Another call with the same key won the race after the lookup above found nothing.
          await closeDuplicateApprovalRequest({ organizationId: scope.organizationId, approvalRequestId: approval.id }).catch(() =>
            recordAgentToolAuditEvent(scope, { toolName, success: false, argsSummary: toolArgs, errorMessage: `Duplicate approval request ${approval.id} could not be closed.` }));
          const winner = keyLookup && await getPendingToolCallByIdempotencyKey(keyLookup);
          if (!winner) return rpcError(body.id, -32603, "The pending tool call for this idempotency key could not be read. Retry with the same key.");
          return replayPendingCall(body.id, scope, winner, toolName, toolArgs);
        }
        await recordAgentToolAuditEvent(scope, { toolName, success: false, argsSummary: toolArgs, errorMessage: "pending_approval" });
        return rpcResult(body.id, {
          content: [{ type: "text", text: JSON.stringify({ status: "pending_approval", approvalRequestId: approval.id, pendingToolCallId: pendingCall.id }) }],
        });
      }
    }

    try {
      const result = await tool.handler(scope, toolArgs);
      await recordAgentToolAuditEvent(scope, { toolName, success: !result.isError, argsSummary: toolArgs, errorMessage: result.isError ? result.content[0]?.text : undefined });
      return rpcResult(body.id, keyLookup ? { ...result, _meta: idempotencyNotApplied } : result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool execution error.";
      await recordAgentToolAuditEvent(scope, { toolName, success: false, argsSummary: toolArgs, errorMessage: message });
      return rpcError(body.id, -32603, message);
    }
  }

  return rpcError(body.id, -32601, `Unknown method: ${body.method}`);
}
