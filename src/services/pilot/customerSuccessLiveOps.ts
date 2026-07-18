import type { EntityId, RoleName } from "../../domain";
import type { LiveWorkspaceMetrics } from "../live-platform/livePlatform";
import type { PilotTenantAcceptanceSnapshot, PilotLiveOpsHandoff } from "./pilotAcceptance";
import type { EnterpriseGoldenPathSnapshot, EnterpriseWorkflowStatus, EnterpriseWorkflowStep } from "../workflows/enterpriseGoldenPath";

export type CustomerSuccessLiveOpsStatus = "live_ops_ready" | "monitoring" | "needs_attention" | "blocked";
export type CustomerSuccessRecoverySeverity = "low" | "medium" | "high" | "critical";
export type CustomerSuccessRecoveryStatus = "ready" | "monitoring" | "blocked" | "recovered";
export type CustomerSuccessSlaStatus = "healthy" | "due_soon" | "breached" | "blocked";
export type RegionalKeyPolicyStatus = "ready" | "needs_key_owner" | "provider_gated" | "rotation_due";
export type LiveOpsOwnerRole = RoleName | "Customer Success" | "Platform Operations" | "AI Governance";

export type CustomerSuccessRecoveryItem = {
  id: string;
  organizationId: EntityId;
  workflowStepId: EnterpriseWorkflowStep["id"];
  title: string;
  severity: CustomerSuccessRecoverySeverity;
  status: CustomerSuccessRecoveryStatus;
  ownerRole: LiveOpsOwnerRole;
  route: string;
  dueAt: string;
  evidence: string[];
  metadata: Record<string, unknown>;
};

export type CustomerSuccessSlaTimer = {
  id: string;
  organizationId: EntityId;
  timerKey: string;
  label: string;
  status: CustomerSuccessSlaStatus;
  ownerRole: LiveOpsOwnerRole;
  route: string;
  startsAt: string;
  dueAt: string;
  breachedAt?: string;
  evidence: string[];
  metadata: Record<string, unknown>;
};

export type RegionalKeyPolicy = {
  id: string;
  organizationId: EntityId;
  regionCode: string;
  policyName: string;
  keyScope: string;
  status: RegionalKeyPolicyStatus;
  keyOwnerRole: LiveOpsOwnerRole;
  rotationDays: number;
  residencyNote: string;
  metadata: Record<string, unknown>;
};

export type CustomerSuccessLiveOpsSnapshot = {
  organizationId: EntityId;
  organizationName: string;
  generatedAt: string;
  status: CustomerSuccessLiveOpsStatus;
  score: number;
  recoveryItems: CustomerSuccessRecoveryItem[];
  slaTimers: CustomerSuccessSlaTimer[];
  regionalKeyPolicies: RegionalKeyPolicy[];
  recommendations: string[];
  metrics: {
    goldenPathReadiness: number;
    pilotAcceptanceScore: number;
    openTasks: number;
    pendingApprovals: number;
    ragReadyDocuments: number;
    integrationConfigured: number;
  };
};

export type BuildCustomerSuccessLiveOpsInput = {
  organizationId: EntityId;
  organizationName?: string;
  generatedAt?: string;
  goldenPath: EnterpriseGoldenPathSnapshot;
  acceptance: PilotTenantAcceptanceSnapshot;
  metrics: LiveWorkspaceMetrics;
};

const statusSeverity: Record<EnterpriseWorkflowStatus, CustomerSuccessRecoverySeverity> = {
  complete: "low",
  ready: "medium",
  active: "medium",
  "needs-review": "high",
  blocked: "critical",
};

const statusRecovery: Record<EnterpriseWorkflowStatus, CustomerSuccessRecoveryStatus> = {
  complete: "recovered",
  ready: "ready",
  active: "monitoring",
  "needs-review": "monitoring",
  blocked: "blocked",
};

const dueHoursBySeverity: Record<CustomerSuccessRecoverySeverity, number> = {
  low: 72,
  medium: 48,
  high: 24,
  critical: 8,
};

function plusHours(value: string, hours: number) {
  return new Date(new Date(value).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function ownerForStep(step: EnterpriseWorkflowStep): LiveOpsOwnerRole {
  if (step.id === "human-review" || step.id === "grounded-question" || step.id === "knowledge-ingestion") return "AI Governance";
  if (step.id === "team-provisioning" || step.id === "organization-setup") return "Organization Admin";
  if (step.id === "audit-evidence") return "Platform Operations";
  return "Customer Success";
}

function recoveryId(step: EnterpriseWorkflowStep) {
  return `recovery-${step.id}`;
}

function buildRecoveryItems(input: BuildCustomerSuccessLiveOpsInput, generatedAt: string): CustomerSuccessRecoveryItem[] {
  return input.goldenPath.steps
    .filter((step) => step.status !== "complete")
    .map((step) => {
      const severity = statusSeverity[step.status];
      return {
        id: recoveryId(step),
        organizationId: input.organizationId,
        workflowStepId: step.id,
        title: step.status === "blocked" ? `Unblock ${step.title}` : `Advance ${step.title}`,
        severity,
        status: statusRecovery[step.status],
        ownerRole: ownerForStep(step),
        route: step.route,
        dueAt: plusHours(generatedAt, dueHoursBySeverity[severity]),
        evidence: [step.auditEvent, step.metricLabel, step.notification],
        metadata: {
          module: step.module,
          metricValue: step.metricValue,
          primaryAction: step.primaryAction,
          lockedForRole: step.lockedForRole,
        },
      };
    });
}

function slaStatusForHandoff(handoff: PilotLiveOpsHandoff): CustomerSuccessSlaStatus {
  if (handoff.status === "blocked") return "blocked";
  if (handoff.status === "monitoring") return "due_soon";
  return "healthy";
}

function buildSlaTimers(input: BuildCustomerSuccessLiveOpsInput, generatedAt: string): CustomerSuccessSlaTimer[] {
  const handoffTimers = input.acceptance.handoffs.map((handoff) => ({
    id: `sla-${handoff.id}`,
    organizationId: input.organizationId,
    timerKey: handoff.id,
    label: handoff.title,
    status: slaStatusForHandoff(handoff),
    ownerRole: handoff.owner === "ai-governance" ? "AI Governance" : handoff.owner === "platform" ? "Platform Operations" : handoff.owner === "tenant-admin" ? "Organization Admin" : "Customer Success",
    route: handoff.route,
    startsAt: generatedAt,
    dueAt: plusHours(generatedAt, handoff.dueInHours),
    evidence: handoff.evidence,
    metadata: {
      trigger: handoff.trigger,
      source: "pilot_acceptance_handoff",
    },
  } satisfies CustomerSuccessSlaTimer));

  return [
    ...handoffTimers,
    {
      id: "sla-ai-review-queue",
      organizationId: input.organizationId,
      timerKey: "ai-review-queue",
      label: "AI review queue discipline",
      status: input.metrics.pendingApprovals > 20 ? "due_soon" : "healthy",
      ownerRole: "AI Governance",
      route: "/ai-workspace/review-inbox",
      startsAt: generatedAt,
      dueAt: plusHours(generatedAt, 24),
      evidence: ["ai_operation_reviews", "source citations", "review decision audit"],
      metadata: {
        pendingApprovals: input.metrics.pendingApprovals,
      },
    },
    {
      id: "sla-audit-coverage",
      organizationId: input.organizationId,
      timerKey: "audit-coverage",
      label: "Audit evidence coverage",
      status: input.acceptance.missingEvidenceCount > 0 ? "due_soon" : "healthy",
      ownerRole: "Platform Operations",
      route: "/admin/audit-logs",
      startsAt: generatedAt,
      dueAt: plusHours(generatedAt, 48),
      evidence: ["workflow_timeline_events", "audit_logs", "audit export links"],
      metadata: {
        missingEvidenceCount: input.acceptance.missingEvidenceCount,
      },
    },
  ];
}

function buildRegionalKeyPolicies(input: BuildCustomerSuccessLiveOpsInput): RegionalKeyPolicy[] {
  const liveReady = input.acceptance.stage === "live_operations" || input.acceptance.status === "accepted";
  const hasConnectors = input.metrics.integrationConfigured > 0;

  return [
    {
      id: "regional-key-india-health-mission",
      organizationId: input.organizationId,
      regionCode: "IN-NE",
      policyName: "North East India health mission tenant key",
      keyScope: "documents, RAG chunks, connector tokens, audit exports",
      status: liveReady ? "ready" : "needs_key_owner",
      keyOwnerRole: "Organization Admin",
      rotationDays: 90,
      residencyNote: "Primary production posture keeps institutional health data under the India tenant policy boundary.",
      metadata: { jurisdiction: "India DPDP", customerSegment: "public-health" },
    },
    {
      id: "regional-key-connector-token-vault",
      organizationId: input.organizationId,
      regionCode: "GLOBAL-OAUTH",
      policyName: "Connector token vault key policy",
      keyScope: "Gmail and Microsoft OAuth token envelopes",
      status: hasConnectors ? "ready" : "provider_gated",
      keyOwnerRole: "Platform Operations",
      rotationDays: 60,
      residencyNote: "Token vault records stay tenant-owned and are opened only by server-side connector routes.",
      metadata: { requiresSecret: "AXXESS_TOKEN_VAULT_KEY", providerCount: input.metrics.integrationConfigured },
    },
    {
      id: "regional-key-investor-preview",
      organizationId: input.organizationId,
      regionCode: "DEMO",
      policyName: "Investor preview isolated key policy",
      keyScope: "seeded demo tenant and sandboxed preview artifacts",
      status: "ready",
      keyOwnerRole: "Customer Success",
      rotationDays: 180,
      residencyNote: "Demo and investor preview data remain isolated from production tenants.",
      metadata: { tenantMode: "demo-safe" },
    },
  ];
}

function snapshotStatus(score: number, recoveryItems: CustomerSuccessRecoveryItem[], slaTimers: CustomerSuccessSlaTimer[]): CustomerSuccessLiveOpsStatus {
  if (recoveryItems.some((item) => item.status === "blocked") || slaTimers.some((timer) => timer.status === "blocked")) return "blocked";
  if (score >= 84 && recoveryItems.length <= 3) return "live_ops_ready";
  if (score >= 66) return "monitoring";
  return "needs_attention";
}

function buildRecommendations(input: BuildCustomerSuccessLiveOpsInput, recoveryItems: CustomerSuccessRecoveryItem[], slaTimers: CustomerSuccessSlaTimer[], keyPolicies: RegionalKeyPolicy[]) {
  const firstRecovery = recoveryItems.find((item) => item.status === "blocked" || item.severity === "high") ?? recoveryItems[0];
  const firstTimer = slaTimers.find((timer) => timer.status === "blocked" || timer.status === "due_soon");
  const firstKeyPolicy = keyPolicies.find((policy) => policy.status !== "ready");

  return [
    firstRecovery ? `${firstRecovery.title} from ${firstRecovery.route}.` : "Keep monitoring the completed golden path.",
    firstTimer ? `Resolve SLA timer: ${firstTimer.label}.` : "Keep SLA timers in monitor mode for live pilot expansion.",
    firstKeyPolicy ? `Assign owner for regional key policy: ${firstKeyPolicy.policyName}.` : "Regional key policies are ready for customer-success handoff.",
    input.acceptance.nextOperatorAction.trigger,
    input.goldenPath.nextBestAction.reason,
  ].filter(Boolean).slice(0, 5);
}

export function buildCustomerSuccessLiveOpsSnapshot(input: BuildCustomerSuccessLiveOpsInput): CustomerSuccessLiveOpsSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const recoveryItems = buildRecoveryItems(input, generatedAt);
  const slaTimers = buildSlaTimers(input, generatedAt);
  const regionalKeyPolicies = buildRegionalKeyPolicies(input);
  const regionalScore = Math.round((regionalKeyPolicies.filter((policy) => policy.status === "ready").length / regionalKeyPolicies.length) * 100);
  const score = Math.round((input.goldenPath.readinessScore * 0.32) + (input.acceptance.score * 0.38) + (regionalScore * 0.18) + (Math.min(input.metrics.ragReadyDocuments, 200) / 200 * 12));
  const status = snapshotStatus(score, recoveryItems, slaTimers);

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName ?? input.acceptance.organizationName,
    generatedAt,
    status,
    score,
    recoveryItems,
    slaTimers,
    regionalKeyPolicies,
    recommendations: buildRecommendations(input, recoveryItems, slaTimers, regionalKeyPolicies),
    metrics: {
      goldenPathReadiness: input.goldenPath.readinessScore,
      pilotAcceptanceScore: input.acceptance.score,
      openTasks: input.metrics.openTasks,
      pendingApprovals: input.metrics.pendingApprovals,
      ragReadyDocuments: input.metrics.ragReadyDocuments,
      integrationConfigured: input.metrics.integrationConfigured,
    },
  };
}
