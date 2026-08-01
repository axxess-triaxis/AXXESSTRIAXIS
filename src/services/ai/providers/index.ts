import { getAiProviderConfigurations } from "../model-routing-policy";
import type { AiProviderAdapter } from "../types";
import { localAiProvider } from "./localProvider";
import { createOpenAiProvider } from "./openAiProvider";
import { createOpenRouterProvider } from "./openRouterProvider";

// Exported so callers (e.g. governedRag.ts, tenantRagWorkflow.ts) can tell a genuinely live model
// call apart from remotePlaceholderProvider's stub response -- both can share a similar-looking
// AiRouteResult shape, so provider identity is the only reliable signal. "openai" joined this set
// 2026-07-31 once a real Chat Completions adapter (with its own spend guard) replaced its stub.
// anthropic/google/xai/falcon/jais remain stub-only until they get the same real-adapter treatment.
export const liveModelProviders = new Set(["kimi", "deepseek", "openai"]);

function remotePlaceholderProvider(config: ReturnType<typeof getAiProviderConfigurations>[number]): AiProviderAdapter {
  return {
    config,
    async complete(_request, classification) {
      return {
        text: `${config.displayName} is configured as an adapter-ready provider for ${classification.category}. Live completion calls remain provider-gated until production credentials, policy review, and audit sampling are enabled.`,
        confidence: 0.74,
        latencyMs: config.latencyTier === "low" ? 380 : 850,
      };
    },
  };
}

const OPENROUTER_BACKED_PROVIDERS = new Set(["kimi", "deepseek"]);

export function buildAiProviderAdapters(env: NodeJS.ProcessEnv = process.env): AiProviderAdapter[] {
  return getAiProviderConfigurations(env).map((config) => {
    if (config.name === "local") {
      return { ...localAiProvider, config: { ...localAiProvider.config, ...config, configured: config.configured || localAiProvider.config.configured, status: config.configured ? "configured" : localAiProvider.config.status } };
    }
    if (OPENROUTER_BACKED_PROVIDERS.has(config.name)) {
      return createOpenRouterProvider(config, env);
    }
    if (config.name === "openai") {
      return createOpenAiProvider(config, env);
    }
    return remotePlaceholderProvider(config);
  });
}

