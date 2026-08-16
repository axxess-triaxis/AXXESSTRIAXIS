// Sprint 1 agentic chatbot (2026-08-16): the plan->execute->observe->revise loop the founder asked
// for ("truly agentic like copilot not chatbot... automation part has to be real and seamless").
// Reuses the existing 15-tool dispatch triad (getAgentTool/validateAgentToolArguments/tool.handler,
// toolRegistry.ts) under a scope synthesized from the real human's own TenantScope+Role
// (chatbotAgentScope.ts) -- this is the second real caller of that triad outside MCP, alongside
// agentPendingToolCallExecutor.ts. Auto tools execute inline; a critical tool pauses the loop for an
// inline confirm, deliberately bypassing the async external-agent approval_requests/
// agent_pending_tool_calls/hasGrant machinery -- the human chatbot user is already synchronously
// present, so that machinery (built for an absent external agent) is the wrong tool here.
import { classifyAiPrompt } from "../ai/prompt-classifier";
import { buildTenantModelPolicy } from "../ai/tenantModelPolicy";
import { getAiProviderConfigurations } from "../ai/model-routing-policy";
import { createOpenAiProvider } from "../ai/providers/openAiProvider";
import type { AiConversationMessage, AiProviderAdapter, AiRoutingContext, AiToolDefinition } from "../ai/types";
import { agentToolRegistry, getAgentTool, validateAgentToolArguments } from "../agents/toolRegistry";
import { recordAgentToolAuditEvent } from "../agents/agentConnectionRepository";
import { synthesizeChatbotAgentScope } from "../../security/chatbotAgentScope";
import { agentScopeHasCapability, type AgentScope } from "../../security/agentScope";
import type { TenantScope } from "../../repositories/interfaces";
import type { RoleName } from "../../domain";

// Real AXXESS asks in this loop are 2-3-tool-call shaped; 5 gives headroom for one self-correction
// cycle (the model seeing its own invalid tool call/args and trying again) without opening the door
// to a runaway loop. Cost at gpt-4o-mini pricing is negligible, and each call independently passes
// aiSpendGuard's checkProviderBudgetHeadroom, so a loop naturally halts on real budget exhaustion
// rather than silently overspending mid-turn.
export const MAX_AGENTIC_LOOP_ITERATIONS = 5;

// Same 0.62 confidence split, same reasoning, as ChatbotPanel.tsx's legacy-path filter (aiRouter's
// provider adapters use confidence: 0.3 as their own deliberate "not a live model call" sentinel --
// a missing API key, budget guard skip, or a non-200 provider response; see openAiProvider.ts). Below
// it, completion.text is internal diagnostic prose (e.g. "OpenAI / ChatGPT request failed (429)...")
// never meant to reach an end user verbatim -- the "final" wire response has no confidence field for
// the client to filter on, so this substitution has to happen here, at the source.
const PROVIDER_UNAVAILABLE_MESSAGE = "AXXESS Copilot's AI provider is temporarily unavailable. Try again shortly.";

export type AgenticChatStep = { toolName: string; summary: string };

export type PendingAgenticTool = { id: string; name: string; arguments: Record<string, unknown> };

export type AgenticChatResumeInput = {
  transcript: AiConversationMessage[];
  pendingTool: PendingAgenticTool;
  userMessage: string;
  iterationsUsed: number;
  confirmed: boolean;
};

export type AgenticChatLoopInput = {
  tenantScope: TenantScope;
  role: RoleName;
  userMessage: string;
  resume?: AgenticChatResumeInput;
};

export type AgenticChatLoopResult =
  | { status: "final"; reply: string; steps: AgenticChatStep[]; costUsd: number }
  | { status: "paused"; transcript: AiConversationMessage[]; pendingTool: PendingAgenticTool; userMessage: string; iterationsUsed: number; summary: string; steps: AgenticChatStep[]; costUsd: number }
  | { status: "cancelled" }
  | { status: "unavailable"; reason: string };

export type AgenticChatLoopDeps = {
  env?: NodeJS.ProcessEnv;
  openAiAdapter?: AiProviderAdapter;
};

// End-user-facing copy only -- deliberately short, plain-language, no internal tool/schema jargon.
const toolStepSummaries: Record<string, string> = {
  create_task: "Created a task.",
  list_tasks: "Checked your tasks.",
  update_task_status: "Updated a task's status.",
  list_projects: "Checked your projects.",
  create_project: "Created a project.",
  list_meetings: "Checked your meetings.",
  create_meeting: "Scheduled a meeting.",
  list_stakeholders: "Checked your stakeholders.",
  create_stakeholder: "Added a stakeholder.",
  add_stakeholder_note: "Added a note to a stakeholder.",
  query_knowledge_hub: "Searched the Knowledge Hub.",
  list_documents: "Checked your documents.",
  get_dashboard_snapshot: "Checked your dashboard.",
  search_audit_logs: "Searched the audit logs.",
};

const toolPauseSummaries: Record<string, string> = {
  update_task_status: "This will update a task's status.",
  create_meeting: "This will schedule a real meeting and notify attendees.",
  create_project: "This will create a real project.",
  create_stakeholder: "This will add a real stakeholder to your CRM.",
  add_stakeholder_note: "This will add a note to a stakeholder record.",
  search_audit_logs: "This will search your organization's audit logs.",
};

function summarizeStep(toolName: string): string {
  return toolStepSummaries[toolName] ?? `Ran ${toolName}.`;
}

function summarizePause(toolName: string): string {
  return `${toolPauseSummaries[toolName] ?? `This will run ${toolName}.`} Confirm to proceed?`;
}

function buildRoutingContext(tenantScope: TenantScope, role: RoleName): AiRoutingContext {
  return { organizationId: tenantScope.organizationId, userId: tenantScope.userId, userRole: role };
}

function buildToolDefinitions(scope: AgentScope): AiToolDefinition[] {
  return agentToolRegistry
    .filter((tool) => agentScopeHasCapability(scope, tool.requiredCapability))
    .map((tool) => ({ name: tool.name, description: tool.description, parameters: tool.inputSchema }));
}

function resultText(content: { type: "text"; text: string }[]): string {
  return content.map((entry) => entry.text).join("\n");
}

type LoopState = {
  transcript: AiConversationMessage[];
  iterationsUsed: number;
  steps: AgenticChatStep[];
  costUsd: number;
};

async function stepLoop(
  userMessage: string,
  state: LoopState,
  scope: AgentScope,
  adapter: AiProviderAdapter,
  tools: AiToolDefinition[],
  context: AiRoutingContext,
): Promise<AgenticChatLoopResult> {
  const classification = classifyAiPrompt({ prompt: userMessage, context });

  while (state.iterationsUsed < MAX_AGENTIC_LOOP_ITERATIONS) {
    state.iterationsUsed += 1;
    const completion = await adapter.complete(
      { prompt: userMessage, context, tools, priorMessages: state.transcript },
      classification,
    );
    state.costUsd += completion.actualCostUsd ?? 0;

    if (completion.confidence < 0.62) {
      return { status: "final", reply: PROVIDER_UNAVAILABLE_MESSAGE, steps: state.steps, costUsd: state.costUsd };
    }

    const call = completion.toolCalls?.[0];
    if (!call) {
      return { status: "final", reply: completion.text, steps: state.steps, costUsd: state.costUsd };
    }

    state.transcript.push({ role: "assistant", content: completion.text || null, toolCalls: [call] });

    const tool = getAgentTool(call.name);
    if (!tool || !agentScopeHasCapability(scope, tool.requiredCapability)) {
      state.transcript.push({
        role: "tool",
        toolCallId: call.id,
        name: call.name,
        content: `That action isn't available: ${call.name}.`,
      });
      continue;
    }

    const validation = validateAgentToolArguments(tool, call.arguments);
    if (!validation.ok) {
      state.transcript.push({ role: "tool", toolCallId: call.id, name: tool.name, content: `Invalid arguments: ${validation.message}` });
      continue;
    }

    if (tool.criticality === "critical") {
      return {
        status: "paused",
        transcript: state.transcript,
        pendingTool: { id: call.id, name: tool.name, arguments: validation.args },
        userMessage,
        iterationsUsed: state.iterationsUsed,
        summary: summarizePause(tool.name),
        steps: state.steps,
        costUsd: state.costUsd,
      };
    }

    try {
      const result = await tool.handler(scope, validation.args);
      await recordAgentToolAuditEvent(scope, {
        toolName: tool.name,
        success: !result.isError,
        argsSummary: validation.args,
        errorMessage: result.isError ? resultText(result.content) : undefined,
      });
      state.transcript.push({ role: "tool", toolCallId: call.id, name: tool.name, content: resultText(result.content) });
      if (!result.isError) state.steps.push({ toolName: tool.name, summary: summarizeStep(tool.name) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool execution error.";
      await recordAgentToolAuditEvent(scope, { toolName: tool.name, success: false, argsSummary: validation.args, errorMessage: message });
      state.transcript.push({ role: "tool", toolCallId: call.id, name: tool.name, content: `Tool execution failed: ${message}` });
    }
  }

  return {
    status: "final",
    reply: "This request needed more steps than AXXESS allows in a single turn. Try breaking it into smaller requests, or ask again to continue.",
    steps: state.steps,
    costUsd: state.costUsd,
  };
}

async function executeConfirmedPendingTool(resume: AgenticChatResumeInput, scope: AgentScope): Promise<LoopState> {
  const state: LoopState = { transcript: [...resume.transcript], iterationsUsed: resume.iterationsUsed, steps: [], costUsd: 0 };
  const tool = getAgentTool(resume.pendingTool.name);

  if (!tool) {
    state.transcript.push({ role: "tool", toolCallId: resume.pendingTool.id, name: resume.pendingTool.name, content: `That action isn't available: ${resume.pendingTool.name}.` });
    return state;
  }

  try {
    const result = await tool.handler(scope, resume.pendingTool.arguments);
    await recordAgentToolAuditEvent(scope, {
      toolName: tool.name,
      success: !result.isError,
      argsSummary: resume.pendingTool.arguments,
      errorMessage: result.isError ? resultText(result.content) : undefined,
    });
    state.transcript.push({ role: "tool", toolCallId: resume.pendingTool.id, name: tool.name, content: resultText(result.content) });
    if (!result.isError) state.steps.push({ toolName: tool.name, summary: summarizeStep(tool.name) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown tool execution error.";
    await recordAgentToolAuditEvent(scope, { toolName: tool.name, success: false, argsSummary: resume.pendingTool.arguments, errorMessage: message });
    state.transcript.push({ role: "tool", toolCallId: resume.pendingTool.id, name: tool.name, content: `Tool execution failed: ${message}` });
  }

  return state;
}

function resolveOpenAiAdapter(env: NodeJS.ProcessEnv): AiProviderAdapter {
  const config = getAiProviderConfigurations(env).find((candidate) => candidate.name === "openai");
  if (!config) throw new Error("OpenAI provider configuration is missing from getAiProviderConfigurations.");
  return createOpenAiProvider(config, env);
}

// The eligibility gate reuses buildTenantModelPolicy() unmodified -- the loop bypasses normal
// tenant-policy provider *selection* (selectTenantModelRoute) for its own reasoning calls and always
// uses OpenAI directly when eligible, but still refuses to start at all if this tenant's policy
// blocks/disallows OpenAI, or the prompt classifies as restricted-sensitivity without
// restrictedDataExternalProviders. This is a stated Sprint 1 compromise, not silently dropped.
export async function runAgenticChatTurn(input: AgenticChatLoopInput, deps: AgenticChatLoopDeps = {}): Promise<AgenticChatLoopResult> {
  const env = deps.env ?? process.env;
  const { tenantScope, role } = input;
  const context = buildRoutingContext(tenantScope, role);
  const promptForClassification = input.resume?.userMessage ?? input.userMessage;
  const classification = classifyAiPrompt({ prompt: promptForClassification, context });
  const policy = buildTenantModelPolicy(tenantScope.organizationId);

  const openAiNotAllowed = !policy.allowedProviders.includes("openai") || policy.blockedProviders.includes("openai");
  if (openAiNotAllowed) {
    return { status: "unavailable", reason: "OpenAI is not an allowed provider under this tenant's AI routing policy." };
  }
  if (classification.sensitivity === "restricted" && !policy.restrictedDataExternalProviders) {
    return { status: "unavailable", reason: "Restricted-sensitivity content is held to local/tenant-approved providers until explicit policy approval." };
  }

  const scope = synthesizeChatbotAgentScope(tenantScope, role);
  const tools = buildToolDefinitions(scope);
  const adapter = deps.openAiAdapter ?? resolveOpenAiAdapter(env);

  if (input.resume) {
    if (!input.resume.confirmed) return { status: "cancelled" };
    const state = await executeConfirmedPendingTool(input.resume, scope);
    return stepLoop(input.resume.userMessage, state, scope, adapter, tools, context);
  }

  return stepLoop(input.userMessage, { transcript: [], iterationsUsed: 0, steps: [], costUsd: 0 }, scope, adapter, tools, context);
}
