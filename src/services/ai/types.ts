import type { RagCitation } from "../rag/governedRag";

export type AiProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "falcon"
  | "jais"
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

export type AiPromptRequest = {
  prompt: string;
  task?: AiTaskCategory;
  context: AiRoutingContext;
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
};

export type AiProviderCompletion = {
  text: string;
  citations?: RagCitation[];
  confidence: number;
  latencyMs?: number;
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

