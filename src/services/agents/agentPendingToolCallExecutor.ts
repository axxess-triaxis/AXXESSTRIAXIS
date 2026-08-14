import { getAgentTool, validateAgentToolArguments } from "./toolRegistry";
import type { AgentScope } from "../../security/agentScope";
import type { PendingToolCallSummary } from "./agentPendingToolCallRepository";

export type PendingToolCallExecution =
  | { status: "executed"; result: unknown }
  | { status: "failed"; error: string };

// Pure "run the tool" function -- deliberately does no database writes of its own. The approval
// route (src/app/api/approvals/[id]/route.ts) is what owns the atomic reserve-then-finalize
// sequence around this call (see agentPendingToolCallRepository.ts); keeping this function pure
// makes it directly unit-testable without a Supabase mock, and keeps "decide whether this call is
// allowed to run" (the route) separate from "run it" (this file).
export async function executePendingToolCall(pendingCall: PendingToolCallSummary, scope: AgentScope): Promise<PendingToolCallExecution> {
  const tool = getAgentTool(pendingCall.toolName);
  if (!tool) return { status: "failed", error: `Unknown tool: ${pendingCall.toolName}` };

  // Defense in depth: re-validate the stored arguments against the tool's current schema before
  // running it. A pending call can sit for an arbitrary amount of time before a human approves it,
  // so this guards against a tool definition having changed underneath an old pending row.
  const validation = validateAgentToolArguments(tool, pendingCall.arguments);
  if (!validation.ok) return { status: "failed", error: validation.message };

  try {
    const result = await tool.handler(scope, validation.args);
    if (result.isError) {
      return { status: "failed", error: result.content[0]?.text ?? "Tool execution reported an error." };
    }
    return { status: "executed", result };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "Unknown tool execution error." };
  }
}
