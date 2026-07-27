import { classifyAiPrompt } from "../prompt-classifier";
import { buildAiProviderAdapters } from "../providers";
import { selectTenantModelRoute } from "../tenantModelPolicy";
import type { AiPromptRequest, AiRouteResult } from "../types";

function makeAuditId() {
  return globalThis.crypto?.randomUUID?.() ?? `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function routeAiRequest(request: AiPromptRequest, env: NodeJS.ProcessEnv = process.env): Promise<AiRouteResult> {
  const startedAt = Date.now();
  const classification = classifyAiPrompt(request);
  const adapters = buildAiProviderAdapters(env);
  const routeDecision = selectTenantModelRoute(
    request.prompt,
    classification,
    request.context,
    adapters.map((adapter) => adapter.config),
  );
  const provider = routeDecision.provider;
  const adapter = adapters.find((candidate) => candidate.config.name === provider.name) ?? adapters.find((candidate) => candidate.config.name === "local")!;
  const completion = await adapter.complete(request, classification);
  const humanReviewRequired = routeDecision.requiresHumanApproval || completion.confidence < 0.62 || classification.sensitivity === "restricted";
  // A provider that actually executed a live call reports real token-based cost, which supersedes
  // the router's pre-call estimate (computed before the real request was even made).
  const estimatedCostUsd = completion.actualCostUsd ?? routeDecision.estimatedCostUsd;

  return {
    answer: completion.text,
    modelUsed: provider.name === "local" ? "local-deterministic-v1" : `${provider.name}-adapter`,
    providerUsed: provider.name,
    routingReason: routeDecision.reason,
    fallbackChain: routeDecision.fallbackChain,
    confidence: Math.min(classification.confidence, completion.confidence),
    humanReviewRequired,
    citations: completion.citations ?? [],
    auditId: makeAuditId(),
    latencyMs: completion.latencyMs ?? Date.now() - startedAt,
    costTier: provider.costTier,
    estimatedCostUsd,
    policyId: routeDecision.policy.policyId,
    gatewayTags: routeDecision.gatewayTags,
    approvalReason: routeDecision.approvalReason,
  };
}

export function getAiRouterStatusSnapshot(env: NodeJS.ProcessEnv = process.env) {
  const providers = buildAiProviderAdapters(env).map((adapter) => adapter.config);
  return {
    enabled: env.AXXESS_AI_ROUTER_ENABLED !== "false",
    mode: env.AXXESS_AI_ROUTING_MODE ?? "demo",
    defaultProvider: env.AXXESS_AI_DEFAULT_PROVIDER ?? "local",
    providers,
    configuredCount: providers.filter((provider) => provider.configured && provider.name !== "local").length,
  };
}

