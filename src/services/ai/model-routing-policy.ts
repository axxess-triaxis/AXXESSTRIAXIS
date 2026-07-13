import type { AiPromptClassification, AiProviderConfig, AiProviderName, AiRoutingContext } from "./types";

const providerCapabilities: Record<AiProviderName, Omit<AiProviderConfig, "configured" | "status">> = {
  openai: {
    name: "openai",
    displayName: "OpenAI / ChatGPT",
    mode: "remote",
    capabilities: ["general_chat", "rag_answer", "executive_summary", "document_analysis", "code_or_structured_generation", "workflow_generation"],
    languages: ["english", "hindi", "bengali", "assamese", "french"],
    costTier: "medium",
    latencyTier: "low",
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic / Claude",
    mode: "remote",
    capabilities: ["compliance_review", "risk_assessment", "document_analysis", "executive_summary", "stakeholder_brief"],
    languages: ["english", "hindi", "bengali", "french"],
    costTier: "high",
    latencyTier: "medium",
  },
  google: {
    name: "google",
    displayName: "Google / Gemini",
    mode: "remote",
    capabilities: ["multilingual_translation", "document_analysis", "general_chat", "meeting_minutes", "rag_answer"],
    languages: ["english", "hindi", "bengali", "assamese", "french", "arabic"],
    costTier: "medium",
    latencyTier: "low",
  },
  xai: {
    name: "xai",
    displayName: "xAI / Grok",
    mode: "remote",
    capabilities: ["general_chat", "risk_assessment", "executive_summary"],
    languages: ["english"],
    costTier: "medium",
    latencyTier: "low",
  },
  falcon: {
    name: "falcon",
    displayName: "Falcon-compatible Endpoint",
    mode: "endpoint",
    capabilities: ["general_chat", "executive_summary", "document_analysis"],
    languages: ["english", "arabic", "french"],
    costTier: "low",
    latencyTier: "medium",
  },
  jais: {
    name: "jais",
    displayName: "Jais-compatible Endpoint",
    mode: "endpoint",
    capabilities: ["multilingual_translation", "executive_summary", "general_chat", "stakeholder_brief"],
    languages: ["english", "arabic"],
    costTier: "low",
    latencyTier: "medium",
  },
  local: {
    name: "local",
    displayName: "Local Deterministic Fallback",
    mode: "local",
    capabilities: ["general_chat", "rag_answer", "executive_summary", "document_analysis", "meeting_minutes", "workflow_generation", "compliance_review", "risk_assessment", "stakeholder_brief", "crm_followup", "multilingual_translation", "code_or_structured_generation"],
    languages: ["english", "hindi", "assamese", "bengali", "mixed"],
    costTier: "low",
    latencyTier: "low",
  },
};

export function getAiProviderConfigurations(env: NodeJS.ProcessEnv = process.env): AiProviderConfig[] {
  const configured: Record<AiProviderName, boolean> = {
    openai: Boolean(env.OPENAI_API_KEY),
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    google: Boolean(env.GOOGLE_AI_API_KEY),
    xai: Boolean(env.XAI_API_KEY),
    falcon: Boolean(env.FALCON_API_BASE_URL && env.FALCON_API_KEY),
    jais: Boolean(env.JAIS_API_BASE_URL && env.JAIS_API_KEY),
    local: env.LOCAL_AI_PROVIDER_ENABLED === "true" || env.AXXESS_AI_ROUTING_MODE === "demo" || !env.AXXESS_AI_ROUTING_MODE,
  };

  return (Object.keys(providerCapabilities) as AiProviderName[]).map((name) => ({
    ...providerCapabilities[name],
    configured: configured[name],
    status: configured[name] ? "configured" : name === "local" ? "disabled" : "missing_credentials",
  }));
}

export function selectAiProvider(
  classification: AiPromptClassification,
  context: AiRoutingContext,
  providers = getAiProviderConfigurations(),
) {
  const configuredProviders = providers.filter((provider) => provider.configured);
  const preferred = context.preferredProvider
    ? configuredProviders.find((provider) => provider.name === context.preferredProvider && provider.capabilities.includes(classification.category))
    : undefined;
  if (preferred) {
    return { provider: preferred, reason: `Tenant policy preferred ${preferred.displayName} for ${classification.category}.` };
  }

  const eligible = configuredProviders.filter((provider) => provider.capabilities.includes(classification.category));
  const restricted = classification.sensitivity === "restricted";
  const candidates = restricted ? eligible.filter((provider) => provider.name !== "xai") : eligible;
  const selected = candidates.find((provider) => provider.name !== "local") ?? configuredProviders.find((provider) => provider.name === "local") ?? providers.find((provider) => provider.name === "local")!;

  return {
    provider: selected,
    reason: selected.name === "local"
      ? `No configured external provider matched ${classification.category}; using deterministic local fallback.`
      : `${selected.displayName} matched ${classification.category}, language ${classification.language}, and ${classification.requiredReasoning} reasoning.`,
  };
}

