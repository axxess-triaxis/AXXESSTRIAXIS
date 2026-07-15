import type { RoleName } from "../../domain";
import type { AiRouteResult } from "../ai/types";
import { buildDefaultExecutionPolicy, createExecutionJob, runExecutionJobDryRun, summarizeExecutionRuntime, type ExecutionRun } from "../execution/sandboxRuntime";
import { evaluatePluginAction, buildPluginRuntimeSnapshot, type PluginInstallation, type PluginRuntimeSnapshot } from "../plugins/pluginRuntime";
import { ragEvaluationFixtures } from "../rag/evaluation/ragEvaluation";
import { buildDefaultUsageLimits, buildEnterpriseReadinessSnapshot, type ControlStatus, type TenantUsageLimit } from "./platformReadiness";

export type PilotCommandCenterWorkstream = {
  id: string;
  title: string;
  sprint: "22" | "23";
  status: ControlStatus;
  owner: "platform" | "tenant-admin" | "provider";
  objective: string;
  evidence: string[];
  nextAction: string;
};

export type PilotCommandCenterQueueItem = {
  id: string;
  type: "connector_action" | "ai_review" | "sandbox_attestation" | "rag_evaluation";
  title: string;
  status: "ready" | "requires_approval" | "blocked" | "monitoring";
  severity: "low" | "medium" | "high";
  actionRequired: string;
  evidence: string[];
};

export type PilotCommandCenterSnapshot = {
  organizationId: string;
  generatedAt: string;
  sprintPlan: {
    sprint22: string;
    sprint23: string;
  };
  score: number;
  status: ControlStatus;
  readinessScore: number;
  workstreams: PilotCommandCenterWorkstream[];
  queues: PilotCommandCenterQueueItem[];
  pluginRuntime: PluginRuntimeSnapshot["totals"];
  executionRuntime: ReturnType<typeof summarizeExecutionRuntime>;
  ragEvaluation: {
    fixtures: number;
    tenantScopedFixtures: number;
    expectedSourceAssertions: number;
    minimumConfidence: number;
  };
  recommendations: string[];
};

const seededPilotEnv: Partial<NodeJS.ProcessEnv> = {
  GOOGLE_CLIENT_ID: "pilot-command-center",
  MICROSOFT_CLIENT_ID: "pilot-command-center",
  SLACK_CLIENT_ID: "pilot-command-center",
  GITHUB_APP_ID: "pilot-command-center",
};

function defaultPilotInstallations(organizationId: string, userId: string): PluginInstallation[] {
  const connectedAt = "2026-07-15T00:00:00.000Z";
  return [
    {
      id: `${organizationId}:gmail`,
      organizationId,
      pluginId: "gmail",
      status: "connected",
      connectedByUserId: userId,
      connectedAt,
      lastSyncAt: connectedAt,
      grantedScopes: ["gmail.send", "gmail.readonly"],
    },
    {
      id: `${organizationId}:google_drive`,
      organizationId,
      pluginId: "google_drive",
      status: "connected",
      connectedByUserId: userId,
      connectedAt,
      lastSyncAt: connectedAt,
      grantedScopes: ["drive.readonly"],
    },
    {
      id: `${organizationId}:github`,
      organizationId,
      pluginId: "github",
      status: "connected",
      connectedByUserId: userId,
      connectedAt,
      lastSyncAt: connectedAt,
      grantedScopes: ["repo:read", "issues:write"],
    },
  ];
}

function defaultAiRoutes(): AiRouteResult[] {
  return [
    {
      answer: "District oxygen resilience summary requires human review before operational action.",
      modelUsed: "local-deterministic-v1",
      providerUsed: "local",
      routingReason: "Restricted operational evidence remains on the local fallback provider until tenant policy permits external routing.",
      fallbackChain: ["local"],
      confidence: 0.74,
      humanReviewRequired: true,
      citations: [{
        sourceType: "document",
        sourceId: "demo-risk-register",
        title: "Oxygen Resilience Risk Register",
        excerpt: "Immediate governance review required.",
        score: 0.84,
      }],
      auditId: "pilot-command-ai-review-1",
      latencyMs: 52,
      costTier: "low",
      estimatedCostUsd: 0,
      policyId: "tenant-default-ai-routing-policy",
      gatewayTags: ["product:axxess", "layer:governed-ai", "sprint:23"],
      approvalReason: "Human review required for restricted risk assessment output.",
    },
  ];
}

function statusWeight(status: ControlStatus) {
  if (status === "pass") return 1;
  if (status === "warning") return 0.64;
  return 0.18;
}

function workstreamStatusFromQueues(queues: PilotCommandCenterQueueItem[], blockedWhenEmpty = false): ControlStatus {
  if (blockedWhenEmpty && queues.length === 0) return "blocked";
  if (queues.some((item) => item.status === "blocked")) return "blocked";
  if (queues.some((item) => item.status === "requires_approval" || item.status === "monitoring")) return "warning";
  return "pass";
}

export function buildPilotCommandCenterSnapshot(input: {
  organizationId: string;
  userId: string;
  userRole?: RoleName;
  generatedAt?: string;
  env?: NodeJS.ProcessEnv;
  installations?: PluginInstallation[];
  aiRoutes?: AiRouteResult[];
  usage?: TenantUsageLimit[];
  seededPilotEvidence?: boolean;
}): PilotCommandCenterSnapshot {
  const seededPilotEvidence = input.seededPilotEvidence ?? false;
  const env = seededPilotEvidence ? ({ ...seededPilotEnv, ...(input.env ?? {}) } as NodeJS.ProcessEnv) : input.env;
  const installations = input.installations ?? (seededPilotEvidence ? defaultPilotInstallations(input.organizationId, input.userId) : []);
  const plugins = buildPluginRuntimeSnapshot({ organizationId: input.organizationId, env, installations });
  const aiRoutes = input.aiRoutes ?? defaultAiRoutes();
  const usage = input.usage ?? buildDefaultUsageLimits("pilot", {
    ai_requests: 318,
    rag_queries: 214,
    document_ingestions: 61,
    plugin_actions: 44,
    sandbox_runs: 11,
    audit_exports: 4,
  });

  const readiness = buildEnterpriseReadinessSnapshot({ plugins, aiRoutes, usage });
  const connectorDecision = evaluatePluginAction(plugins, {
    organizationId: input.organizationId,
    userId: input.userId,
    userRole: input.userRole ?? "Organization Admin",
    pluginId: "gmail",
    action: "create_record",
    scopeRequest: ["gmail.readonly"],
    payloadSummary: "Create a reviewed stakeholder follow-up task from a selected district email thread.",
  });
  const connectorQueue: PilotCommandCenterQueueItem = {
    id: "connector-gmail-reviewed-task",
    type: "connector_action",
    title: "Gmail selected-email to reviewed task action",
    status: !connectorDecision.allowed ? "blocked" : connectorDecision.approvalRequired ? "requires_approval" : "ready",
    severity: connectorDecision.allowed ? "medium" : "high",
    actionRequired: connectorDecision.reason,
    evidence: ["plugin_action_requests", "tenant OAuth scopes", "human approval before external write"],
  };

  const regulatedJob = createExecutionJob({
    organizationId: input.organizationId,
    createdByUserId: input.userId,
    kind: "ai_tool",
    title: "Governed AI action dry-run",
    requestedAction: "rag-answer-to-workflow-action",
    aiAuditId: aiRoutes[0]?.auditId,
    policy: buildDefaultExecutionPolicy("regulated"),
    payload: {
      citations: aiRoutes[0]?.citations.map((citation) => citation.sourceId) ?? [],
      humanReviewRequired: true,
    },
  });
  const executionRun = runExecutionJobDryRun(regulatedJob);
  const executionRuns: ExecutionRun[] = [executionRun];

  const queues: PilotCommandCenterQueueItem[] = [
    connectorQueue,
    {
      id: "ai-review-risk-output",
      type: "ai_review",
      title: "Restricted risk answer review",
      status: aiRoutes.some((route) => route.humanReviewRequired) ? "requires_approval" : "ready",
      severity: "high",
      actionRequired: "Approve, edit, or reject cited AI output before consequential workflow creation.",
      evidence: ["ai_operation_reviews", aiRoutes[0]?.auditId ?? "ai_output_audit", "source citation bundle"],
    },
    {
      id: "sandbox-policy-attestation",
      type: "sandbox_attestation",
      title: "Kubernetes-grade sandbox policy attestation",
      status: executionRun.status === "policy_blocked" ? "blocked" : "requires_approval",
      severity: executionRun.status === "policy_blocked" ? "high" : "medium",
      actionRequired: executionRun.status === "policy_blocked" ? "Resolve sandbox policy findings before execution." : "Tenant admin approval required before runner execution.",
      evidence: ["sandbox_policy_attestations", executionRun.sandboxSpec.runtime, executionRun.artifacts[0]?.name ?? "execution spec"],
    },
    {
      id: "rag-evaluation-fixtures",
      type: "rag_evaluation",
      title: "RAG permission and citation evaluation",
      status: "monitoring",
      severity: "medium",
      actionRequired: "Run fixture set after every ingestion or permission-policy change.",
      evidence: ragEvaluationFixtures.map((fixture) => fixture.id),
    },
  ];

  const workstreams: PilotCommandCenterWorkstream[] = [
    {
      id: "sprint-22-command-center",
      title: "Pilot Command Center",
      sprint: "22",
      status: readiness.status,
      owner: "platform",
      objective: "Give operators one admin view for readiness, usage, connector posture, audit posture, and support risks.",
      evidence: ["enterprise_controls", "tenant_usage_limits", "platform-readiness API"],
      nextAction: readiness.recommendations[0] ?? "Continue monitoring pilot readiness.",
    },
    {
      id: "sprint-22-connector-queue",
      title: "Connector Execution Queue",
      sprint: "22",
      status: workstreamStatusFromQueues([connectorQueue], true),
      owner: "tenant-admin",
      objective: "Move plugin actions through approval gates before records are created or external messages are sent.",
      evidence: connectorQueue.evidence,
      nextAction: connectorQueue.actionRequired,
    },
    {
      id: "sprint-23-ai-review",
      title: "Governed AI Review Operations",
      sprint: "23",
      status: workstreamStatusFromQueues(queues.filter((item) => item.type === "ai_review")),
      owner: "tenant-admin",
      objective: "Review cited AI outputs before consequential actions reach projects, tasks, approvals, or stakeholders.",
      evidence: ["ai_operation_reviews", "ai_usage_ledger", "answer citations"],
      nextAction: "Start with restricted risk, compliance, and workflow-generation outputs.",
    },
    {
      id: "sprint-23-sandbox-policy",
      title: "Sandbox Policy Evidence",
      sprint: "23",
      status: workstreamStatusFromQueues(queues.filter((item) => item.type === "sandbox_attestation")),
      owner: "platform",
      objective: "Attest execution jobs against tenant network, secret, resource, and Kubernetes-ready policy before running.",
      evidence: ["execution_jobs", "execution_runs", "sandbox_policy_attestations"],
      nextAction: "Connect the first approved runner only after policy attestation is green.",
    },
    {
      id: "sprint-23-rag-evaluation",
      title: "RAG Evaluation And Permission QA",
      sprint: "23",
      status: "warning",
      owner: "platform",
      objective: "Continuously verify that cited answers use tenant-authorized documents with confidence and source coverage.",
      evidence: ["rag_evaluation_runs", `${ragEvaluationFixtures.length} fixture(s)`, "tenant-scoped source assertions"],
      nextAction: "Persist evaluation runs and block release when permission fixtures regress.",
    },
  ];

  const score = Math.round((workstreams.reduce((sum, workstream) => sum + statusWeight(workstream.status), 0) / workstreams.length) * 100);
  const status: ControlStatus = score >= 82 ? "pass" : score >= 60 ? "warning" : "blocked";
  const expectedSourceAssertions = ragEvaluationFixtures.reduce((sum, fixture) => sum + fixture.expectedSourceIds.length, 0);
  const minimumConfidence = Math.min(...ragEvaluationFixtures.map((fixture) => fixture.minimumConfidence));

  return {
    organizationId: input.organizationId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sprintPlan: {
      sprint22: "Pilot Command Center and connector execution queue",
      sprint23: "Governed AI operations, RAG evaluation, and sandbox policy evidence",
    },
    score,
    status,
    readinessScore: readiness.score,
    workstreams,
    queues,
    pluginRuntime: plugins.totals,
    executionRuntime: summarizeExecutionRuntime(executionRuns),
    ragEvaluation: {
      fixtures: ragEvaluationFixtures.length,
      tenantScopedFixtures: ragEvaluationFixtures.filter((fixture) => fixture.tenantId === "north-east-health-mission").length,
      expectedSourceAssertions,
      minimumConfidence,
    },
    recommendations: [
      "Use the command center as the pilot operator start page for live tenants.",
      "Route connector writes, AI-generated actions, and sandbox jobs through explicit approval queues.",
      "Persist RAG evaluation results as release evidence before expanding provider integrations.",
    ],
  };
}
