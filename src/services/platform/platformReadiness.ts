import type { AiProviderName, AiRouteResult } from "../ai/types";
import type { ExecutionRun } from "../execution/sandboxRuntime";
import type { PluginRuntimeSnapshot } from "../plugins/pluginRuntime";

export type TenantPlanTier = "pilot" | "growth" | "enterprise";
export type UsageMetric = "ai_requests" | "document_ingestions" | "plugin_actions" | "sandbox_runs" | "rag_queries" | "audit_exports";
export type ControlStatus = "pass" | "warning" | "blocked";

export type TenantUsageLimit = {
  metric: UsageMetric;
  limit: number;
  used: number;
  window: "daily" | "monthly";
  hardStop: boolean;
};

export type UsageLimitEvaluation = TenantUsageLimit & {
  remaining: number;
  percentUsed: number;
  status: ControlStatus;
};

export type EnterpriseControl = {
  id: string;
  name: string;
  category: "auth" | "tenant" | "ai" | "plugins" | "sandbox" | "audit" | "support";
  status: ControlStatus;
  evidence: string[];
  owner: "platform" | "tenant-admin" | "provider";
};

export type SupportIncident = {
  id: string;
  organizationId: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "triaged" | "monitoring" | "resolved";
  title: string;
  affectedArea: "auth" | "ai" | "rag" | "integrations" | "mobile" | "deployment";
  createdAt: string;
};

export type EnterpriseReadinessSnapshot = {
  score: number;
  status: ControlStatus;
  controls: EnterpriseControl[];
  usage: UsageLimitEvaluation[];
  providerMix: Partial<Record<AiProviderName, number>>;
  openIncidents: number;
  recommendations: string[];
};

const baselineLimits: Record<TenantPlanTier, Record<UsageMetric, number>> = {
  pilot: {
    ai_requests: 1200,
    document_ingestions: 250,
    plugin_actions: 500,
    sandbox_runs: 120,
    rag_queries: 900,
    audit_exports: 40,
  },
  growth: {
    ai_requests: 8000,
    document_ingestions: 2000,
    plugin_actions: 5000,
    sandbox_runs: 800,
    rag_queries: 6000,
    audit_exports: 250,
  },
  enterprise: {
    ai_requests: 50000,
    document_ingestions: 20000,
    plugin_actions: 40000,
    sandbox_runs: 5000,
    rag_queries: 45000,
    audit_exports: 2000,
  },
};

export function buildDefaultUsageLimits(
  tier: TenantPlanTier = "pilot",
  usage: Partial<Record<UsageMetric, number>> = {},
): TenantUsageLimit[] {
  return (Object.entries(baselineLimits[tier]) as Array<[UsageMetric, number]>).map(([metric, limit]) => ({
    metric,
    limit,
    used: usage[metric] ?? 0,
    window: "monthly",
    hardStop: ["sandbox_runs", "audit_exports"].includes(metric),
  }));
}

export function evaluateUsageLimit(limit: TenantUsageLimit): UsageLimitEvaluation {
  const percentUsed = limit.limit === 0 ? 100 : Math.round((limit.used / limit.limit) * 100);
  const status: ControlStatus = percentUsed >= 100 && limit.hardStop ? "blocked" : percentUsed >= 85 ? "warning" : "pass";
  return {
    ...limit,
    remaining: Math.max(0, limit.limit - limit.used),
    percentUsed,
    status,
  };
}

function statusScore(status: ControlStatus) {
  if (status === "pass") return 1;
  if (status === "warning") return 0.6;
  return 0;
}

function overallStatus(score: number): ControlStatus {
  if (score >= 82) return "pass";
  if (score >= 60) return "warning";
  return "blocked";
}

function providerMix(routes: AiRouteResult[]) {
  return routes.reduce<Partial<Record<AiProviderName, number>>>((accumulator, route) => ({
    ...accumulator,
    [route.providerUsed]: (accumulator[route.providerUsed] ?? 0) + 1,
  }), {});
}

function defaultControls(input: {
  plugins: PluginRuntimeSnapshot;
  aiRoutes: AiRouteResult[];
  executionRuns: ExecutionRun[];
  incidents: SupportIncident[];
}): EnterpriseControl[] {
  const blockedExecution = input.executionRuns.some((run) => run.status === "policy_blocked");
  const humanReviewCoverage = input.aiRoutes.every((route) => !route.humanReviewRequired || Boolean(route.approvalReason || route.policyId));
  return [
    {
      id: "auth-session",
      name: "Server-side auth and tenant session",
      category: "auth",
      status: "pass",
      evidence: ["httpOnly session cookies", "server session resolution", "tenant context override protection"],
      owner: "platform",
    },
    {
      id: "plugin-runtime",
      name: "Tenant-owned plugin runtime",
      category: "plugins",
      status: input.plugins.totals.total > 0 ? "pass" : "blocked",
      evidence: [`${input.plugins.totals.total} plugin contracts`, `${input.plugins.totals.approvalGatedWrites} approval-gated write paths`],
      owner: "platform",
    },
    {
      id: "ai-model-policy",
      name: "Provider-neutral AI routing policy",
      category: "ai",
      status: humanReviewCoverage ? "pass" : "warning",
      evidence: input.aiRoutes.length ? input.aiRoutes.map((route) => `${route.providerUsed}:${route.policyId}`).slice(0, 4) : ["default tenant policy available"],
      owner: "platform",
    },
    {
      id: "sandbox-policy",
      name: "Sandbox execution guardrails",
      category: "sandbox",
      status: blockedExecution ? "warning" : "pass",
      evidence: input.executionRuns.length ? input.executionRuns.map((run) => `${run.status}:${run.sandboxSpec.runtime}`).slice(0, 4) : ["dry-run execution spec available"],
      owner: "platform",
    },
    {
      id: "audit-chain",
      name: "Audit-first business actions",
      category: "audit",
      status: "pass",
      evidence: ["AI route audit metadata", "plugin action audit metadata", "execution run metadata"],
      owner: "platform",
    },
    {
      id: "support-ops",
      name: "Support and incident readiness",
      category: "support",
      status: input.incidents.some((incident) => incident.severity === "critical" && incident.status !== "resolved") ? "blocked" : "pass",
      evidence: [`${input.incidents.filter((incident) => incident.status !== "resolved").length} open support incident(s)`],
      owner: "tenant-admin",
    },
  ];
}

export function buildEnterpriseReadinessSnapshot(input: {
  plugins: PluginRuntimeSnapshot;
  aiRoutes?: AiRouteResult[];
  executionRuns?: ExecutionRun[];
  usage?: TenantUsageLimit[];
  incidents?: SupportIncident[];
  controls?: EnterpriseControl[];
}): EnterpriseReadinessSnapshot {
  const aiRoutes = input.aiRoutes ?? [];
  const executionRuns = input.executionRuns ?? [];
  const incidents = input.incidents ?? [];
  const usage = (input.usage ?? buildDefaultUsageLimits()).map(evaluateUsageLimit);
  const controls = [
    ...defaultControls({ plugins: input.plugins, aiRoutes, executionRuns, incidents }),
    ...(input.controls ?? []),
  ];
  const score = Math.round((controls.reduce((sum, control) => sum + statusScore(control.status), 0) / controls.length) * 100);

  return {
    score,
    status: overallStatus(score),
    controls,
    usage,
    providerMix: providerMix(aiRoutes),
    openIncidents: incidents.filter((incident) => incident.status !== "resolved").length,
    recommendations: [
      usage.some((item) => item.status === "warning") ? "Review tenant usage before limits become hard stops." : "Usage is within current plan controls.",
      input.plugins.totals.configured === 0 ? "Configure first live plugin provider before external pilot handoff." : "Keep plugin credentials rotated and scoped.",
      executionRuns.some((run) => run.status === "policy_blocked") ? "Resolve blocked execution policies before enabling autonomous workflow runs." : "Sandbox policies are ready for controlled pilot execution.",
    ],
  };
}
