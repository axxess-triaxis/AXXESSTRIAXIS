import { getAiProviderConfigurations } from "../model-routing-policy";
import type { AiProviderAdapter } from "../types";
import { localAiProvider } from "./localProvider";

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

export function buildAiProviderAdapters(env: NodeJS.ProcessEnv = process.env): AiProviderAdapter[] {
  return getAiProviderConfigurations(env).map((config) => (
    config.name === "local" ? { ...localAiProvider, config: { ...localAiProvider.config, ...config, configured: config.configured || localAiProvider.config.configured, status: config.configured ? "configured" : localAiProvider.config.status } } : remotePlaceholderProvider(config)
  ));
}

