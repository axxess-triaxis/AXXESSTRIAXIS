import type { RagCitation } from "../rag/governedRag";

export type AiProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "falcon"
  | "jais"
  | "kimi"
  | "deepseek"
  | "local";

export type AiTaskCategory =
  | "executive_summary"
  | "rag_answer"
  | "document_analysis"
  | "multilingual_translation"
  | "crm_followup"
  | "workflow_generation"
  | "compliance_review"
  | "risk_assessment"
  | "meeting_minutes"
  | "stakeholder_brief"
  | "code_or_structured_generation"
  | "general_chat";

export type AiSensitivity = "public" | "internal" | "confidential" | "restricted";
export type AiReasoningLevel = "low" | "medium" | "high";
export type AiCostPreference = "low" | "balanced" | "premium";
export type AiLatencyPreference = "instant" | "balanced" | "thorough";

export type AiTenantRoutingPolicyInput = {
  policyId?: string;
  allowedProviders?: AiProviderName[];
  blockedProviders?: AiProviderName[];
  preferredProviders?: Partial<Record<AiTaskCategory, AiProviderName>>;
  fallbackProviders?: AiProviderName[];
  maxEstimatedCostPerRequestUsd?: number;
  requireHumanApprovalFor?: AiTaskCategory[];
  restrictedDataExternalProviders?: boolean;
  zeroDataRetentionRequired?: boolean;
  gatewayTags?: string[];
};

export type AiRoutingContext = {
  organizationId: string;
  userId: string;
  userRole: string;
  departmentId?: string;
  workspaceId?: string;
  documentIds?: string[];
  sensitivity?: AiSensitivity;
  preferredProvider?: AiProviderName;
  costPreference?: AiCostPreference;
  latencyPreference?: AiLatencyPreference;
  requiresCitation?: boolean;
  tenantModelPolicy?: AiTenantRoutingPolicyInput;
};

// Sprint 1 agentic chatbot (2026-08-16): additive tool-calling types. Every existing caller of
// AiPromptRequest/AiProviderCompletion keeps compiling and behaving unchanged when tools/toolCalls
// are absent -- this is not a breaking change to the single-shot text-completion path.
export type AiToolDefinition = {
  name: string;
  description: string;
  // Deliberately the same shape as McpToolDefinition["inputSchema"] (src/services/agents/
  // toolRegistry.ts) -- reused, not forked, so a tool's schema is defined exactly once.
  parameters: {
    type: "object";
    properties: Record<string, {
      type: "string" | "number" | "array" | "boolean" | "object";
      description?: string;
      enum?: string[];
      items?: { type: "string" | "number" | "boolean" | "object" };
    }>;
    required?: string[];
  };
};

export type AiToolCall = { id: string; name: string; arguments: Record<string, unknown> };

export type AiConversationMessage =
  | { role: "assistant"; content: string | null; toolCalls?: AiToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export type AiPromptRequest = {
  prompt: string;
  task?: AiTaskCategory;
  context: AiRoutingContext;
  // Sprint 1 agentic chatbot: when present and the selected adapter's config.supportsToolCalling is
  // true, the adapter offers these tools to the model. Absent for every existing call site today.
  tools?: AiToolDefinition[];
  // The running transcript of prior assistant tool-calls and tool-results within one agentic loop
  // turn -- absent for a plain single-shot request, exactly today's behavior.
  priorMessages?: AiConversationMessage[];
};

export type AiPromptClassification = {
  category: AiTaskCategory;
  sensitivity: AiSensitivity;
  language: string;
  requiredReasoning: AiReasoningLevel;
  requiresCitation: boolean;
  costPreference: AiCostPreference;
  latencyPreference: AiLatencyPreference;
  humanReviewRequired: boolean;
  confidence: number;
  signals: string[];
};

export type AiProviderConfig = {
  name: AiProviderName;
  displayName: string;
  configured: boolean;
  mode: "remote" | "local" | "endpoint";
  status: "configured" | "missing_credentials" | "disabled";
  capabilities: AiTaskCategory[];
  languages: string[];
  costTier: "low" | "medium" | "high";
  latencyTier: "low" | "medium" | "high";
  // Sprint 1 agentic chatbot: set explicitly per provider, never left to infer from absence -- a
  // provider that silently ignores an offered `tools` param would be a real capability lie.
  supportsToolCalling: boolean;
};

export type AiProviderCompletion = {
  text: string;
  citations?: RagCitation[];
  confidence: number;
  latencyMs?: number;
  // Real, post-call figures from a provider that actually executed a request (e.g. token usage
  // reported by an OpenAI-compatible API response). When present, these supersede the router's
  // pre-call cost estimate rather than supplementing it -- see routeAiRequest().
  usage?: { promptTokens: number; completionTokens: number };
  actualCostUsd?: number;
  // Sprint 1 agentic chatbot: present only when the model chose to call a tool instead of (or
  // alongside) returning text -- absent for every existing single-shot text completion.
  toolCalls?: AiToolCall[];
};

export interface AiProviderAdapter {
  readonly config: AiProviderConfig;
  complete(request: AiPromptRequest, classification: AiPromptClassification): Promise<AiProviderCompletion>;
}

export type AiRouteResult = {
  answer: string;
  modelUsed: string;
  providerUsed: AiProviderName;
  routingReason: string;
  fallbackChain: AiProviderName[];
  confidence: number;
  humanReviewRequired: boolean;
  citations: RagCitation[];
  auditId: string;
  latencyMs: number;
  costTier: AiProviderConfig["costTier"];
  estimatedCostUsd: number;
  policyId: string;
  gatewayTags: string[];
  approvalReason?: string;
};

