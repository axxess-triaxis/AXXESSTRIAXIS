import type {
  AiPromptClassification,
  AiProviderConfig,
  AiProviderName,
  AiRoutingContext,
  AiTaskCategory,
  AiTenantRoutingPolicyInput,
} from "./types";

export type TenantModelPolicy = Required<AiTenantRoutingPolicyInput> & {
  organizationId?: string;
  budgetWindow: "daily" | "monthly";
  dailyBudgetUsd: number;
  consequentialCategories: AiTaskCategory[];
};

export type AiModelRouteDecision = {
  policy: TenantModelPolicy;
  provider: AiProviderConfig;
  fallbackChain: AiProviderName[];
  reason: string;
  estimatedCostUsd: number;
  requiresHumanApproval: boolean;
  approvalReason?: string;
  gatewayTags: string[];
};

const defaultFallbackProviders: AiProviderName[] = ["local"];
const defaultConsequentialCategories: AiTaskCategory[] = [
  "compliance_review",
  "risk_assessment",
  "workflow_generation",
];

const perThousandTokenEstimate: Record<AiProviderConfig["costTier"], number> = {
  low: 0.002,
  medium: 0.012,
  high: 0.04,
};

function uniqueValues<T extends string>(providers: T[]) {
  return [...new Set(providers)];
}

function approximateTokens(promptLength: number, reasoningMultiplier: number) {
  return Math.max(80, Math.ceil((promptLength / 4) * reasoningMultiplier));
}

function mergePreferredProviders(
  override?: Partial<Record<AiTaskCategory, AiProviderName>>,
): Partial<Record<AiTaskCategory, AiProviderName>> {
  return {
    document_analysis: "google",
    multilingual_translation: "google",
    compliance_review: "anthropic",
    risk_assessment: "anthropic",
    code_or_structured_generation: "openai",
    workflow_generation: "openai",
    rag_answer: "openai",
    executive_summary: "openai",
    ...override,
  };
}

export function buildTenantModelPolicy(
  organizationId?: string,
  overrides: AiTenantRoutingPolicyInput = {},
): TenantModelPolicy {
  return {
    policyId: overrides.policyId ?? "tenant-default-ai-routing-policy",
    organizationId,
    allowedProviders: uniqueValues(overrides.allowedProviders ?? ["openai", "anthropic", "google", "falcon", "jais", "local"]),
    blockedProviders: uniqueValues(overrides.blockedProviders ?? []),
    preferredProviders: mergePreferredProviders(overrides.preferredProviders),
    fallbackProviders: uniqueValues(overrides.fallbackProviders ?? defaultFallbackProviders),
    maxEstimatedCostPerRequestUsd: overrides.maxEstimatedCostPerRequestUsd ?? 0.45,
    requireHumanApprovalFor: uniqueValues(overrides.requireHumanApprovalFor ?? defaultConsequentialCategories),
    restrictedDataExternalProviders: overrides.restrictedDataExternalProviders ?? false,
    zeroDataRetentionRequired: overrides.zeroDataRetentionRequired ?? true,
    gatewayTags: overrides.gatewayTags ?? ["product:axxess", "layer:governed-ai"],
    budgetWindow: "daily",
    dailyBudgetUsd: 75,
    consequentialCategories: defaultConsequentialCategories,
  };
}

export function estimateAiUsageCost(
  prompt: string,
  classification: AiPromptClassification,
  provider: Pick<AiProviderConfig, "costTier">,
) {
  const reasoningMultiplier = classification.requiredReasoning === "high" ? 2.2 : classification.requiredReasoning === "medium" ? 1.45 : 1;
  const tokens = approximateTokens(prompt.length, reasoningMultiplier);
  return Number(((tokens / 1000) * perThousandTokenEstimate[provider.costTier]).toFixed(6));
}

function configuredCandidates(
  classification: AiPromptClassification,
  providers: AiProviderConfig[],
  policy: TenantModelPolicy,
) {
  const allowed = new Set(policy.allowedProviders);
  const blocked = new Set(policy.blockedProviders);
  return providers.filter((provider) => (
    provider.configured
    && allowed.has(provider.name)
    && !blocked.has(provider.name)
    && provider.capabilities.includes(classification.category)
  ));
}

function findProvider(
  providers: AiProviderConfig[],
  name: AiProviderName | undefined,
  classification: AiPromptClassification,
) {
  return name
    ? providers.find((provider) => provider.name === name && provider.capabilities.includes(classification.category))
    : undefined;
}

export function selectTenantModelRoute(
  prompt: string,
  classification: AiPromptClassification,
  context: AiRoutingContext,
  providers: AiProviderConfig[],
): AiModelRouteDecision {
  const policy = buildTenantModelPolicy(context.organizationId, context.tenantModelPolicy);
  const candidates = configuredCandidates(classification, providers, policy);
  const localProvider = providers.find((provider) => provider.name === "local");
  const restrictedExternalBlocked = classification.sensitivity === "restricted" && !policy.restrictedDataExternalProviders;

  const preferredByTask = findProvider(candidates, policy.preferredProviders[classification.category], classification);
  const preferredByContext = findProvider(candidates, context.preferredProvider, classification);
  const remoteCandidate = preferredByContext ?? preferredByTask ?? candidates.find((provider) => provider.name !== "local");
  const selected = restrictedExternalBlocked
    ? candidates.find((provider) => provider.name === "local") ?? localProvider ?? providers[0]
    : remoteCandidate ?? candidates.find((provider) => provider.name === "local") ?? localProvider ?? providers[0];

  const estimatedCostUsd = estimateAiUsageCost(prompt, classification, selected);
  const overCostLimit = estimatedCostUsd > policy.maxEstimatedCostPerRequestUsd;
  const requiresHumanApproval = (
    classification.humanReviewRequired
    || policy.requireHumanApprovalFor.includes(classification.category)
    || restrictedExternalBlocked
    || overCostLimit
  );
  const approvalReason = restrictedExternalBlocked
    ? "Restricted institutional data is held to local or tenant-approved providers until explicit policy approval is enabled."
    : overCostLimit
      ? "Estimated request cost exceeds the tenant policy limit."
      : policy.requireHumanApprovalFor.includes(classification.category)
        ? "Tenant policy requires human approval for consequential AI output."
        : undefined;
  const fallbackChain = uniqueValues([
    selected.name,
    ...policy.fallbackProviders,
    "local",
  ]);
  const gatewayTags = [
    ...policy.gatewayTags,
    `tenant:${context.organizationId}`,
    `task:${classification.category}`,
    `sensitivity:${classification.sensitivity}`,
  ];

  const reason = selected.name === "local"
    ? `Tenant model policy ${policy.policyId} selected local fallback for ${classification.category}.`
    : `Tenant model policy ${policy.policyId} selected ${selected.displayName} for ${classification.category} with ${fallbackChain.length - 1} fallback option(s).`;

  return {
    policy,
    provider: selected,
    fallbackChain,
    reason,
    estimatedCostUsd,
    requiresHumanApproval,
    approvalReason,
    gatewayTags,
  };
}
