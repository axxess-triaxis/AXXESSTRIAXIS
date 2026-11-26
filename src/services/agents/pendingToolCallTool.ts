// Ops worker support (2026-11-25): lets an agent read what happened to its own call that needed
// approval, instead of calling again to find out. Read-only, and an opt-in capability
// (opsWorkerAgentCapabilities): existing keys gain nothing.
import { getPendingToolCallForConnection } from "./agentPendingToolCallRepository";
import { hasExecutionResult, pendingToolCallState } from "./agentToolCallIdempotency";
import type { McpToolDefinition } from "./toolRegistry";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getPendingToolCallTool: McpToolDefinition = {
  name: "get_pending_tool_call",
  version: "1",
  description:
    "Read one of this connection's own tool calls that needed approval. status is pending_approval, executed, failed, rejected, or unknown. " +
    "unknown means the call was approved but no result was recorded: it may or may not have run, so check its effect before repeating it.",
  requiredCapability: "get_pending_tool_call",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: { pending_tool_call_id: { type: "string", description: "The pendingToolCallId returned by tools/call." } },
    required: ["pending_tool_call_id"],
  },
  handler: async (scope, args) => {
    const id = typeof args.pending_tool_call_id === "string" ? args.pending_tool_call_id : "";
    const pendingCall = UUID.test(id)
      ? await getPendingToolCallForConnection({ organizationId: scope.organizationId, agentConnectionId: scope.agentConnectionId, id })
      : undefined;
    // One answer for malformed, unknown, another connection's and another tenant's ids.
    if (!pendingCall) {
      return { content: [{ type: "text", text: "No pending tool call with this id belongs to this connection." }], isError: true };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          pendingToolCallId: pendingCall.id,
          approvalRequestId: pendingCall.approvalRequestId,
          toolName: pendingCall.toolName,
          status: pendingToolCallState(pendingCall),
          requestedAt: pendingCall.createdAt,
          decidedAt: pendingCall.decidedAt ?? null,
          result: hasExecutionResult(pendingCall) ? pendingCall.executionResult : null,
        }, null, 2),
      }],
    };
  },
};
