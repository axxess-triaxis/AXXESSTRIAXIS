import type { LiveWorkspaceMetrics } from "../live-platform/livePlatform";
import type { PilotCommandCenterQueueItem, PilotCommandCenterSnapshot } from "../platform/pilotCommandCenter";
import type { EnterpriseGoldenPathSnapshot, EnterpriseWorkflowStepId } from "../workflows/enterpriseGoldenPath";
import type { PilotHealthScore, PilotStepId } from "./pilotHealth";

export type PilotAcceptanceStatus = "accepted" | "ready_for_acceptance" | "needs_evidence" | "blocked";
export type PilotAcceptanceCriterionStatus = "accepted" | "ready" | "needs_evidence" | "blocked";
export type PilotLiveOpsHandoffStatus = "ready" | "monitoring" | "blocked";

export type PilotAcceptanceCriterion = {
  id: string;
  label: string;
  status: PilotAcceptanceCriterionStatus;
  owner: "tenant-admin" | "customer-success" | "platform" | "ai-governance";
  route: string;
  detail: string;
  evidence: string[];
};

export type PilotLiveOpsHandoff = {
  id: string;
  title: string;
  status: PilotLiveOpsHandoffStatus;
  owner: "customer-success" | "platform" | "tenant-admin" | "ai-governance";
  route: string;
  trigger: string;
  evidence: string[];
  dueInHours: number;
};

export type PilotTenantAcceptanceSnapshot = {
  organizationId: string;
  organizationName: string;
  generatedAt: string;
  status: PilotAcceptanceStatus;
  stage: "trial_setup" | "pilot_execution" | "acceptance_review" | "live_operations";
  score: number;
  completionPercent: number;
  readinessScore: number;
  commandCenterScore: number;
  missingEvidenceCount: number;
  blockedCount: number;
  nextOperatorAction: PilotLiveOpsHandoff;
  criteria: PilotAcceptanceCriterion[];
  handoffs: PilotLiveOpsHandoff[];
  recommendations: string[];
  acceptedAt?: string;
  operatorHandoffRecordedAt?: string;
};

export type BuildPilotTenantAcceptanceInput = {
  organizationId: string;
  organizationName?: string;
  generatedAt?: string;
  goldenPath: EnterpriseGoldenPathSnapshot;
  pilotHealth: PilotHealthScore;
  commandCenter: PilotCommandCenterSnapshot;
  metrics: LiveWorkspaceMetrics;
  acceptedAt?: string;
  operatorHandoffRecordedAt?: string;
};

const statusWeights: Record<PilotAcceptanceCriterionStatus, number> = {
  accepted: 1,
  ready: 0.74,
  needs_evidence: 0.38,
  blocked: 0.08,
};

function hasGoldenStep(snapshot: EnterpriseGoldenPathSnapshot, stepId: EnterpriseWorkflowStepId, statuses: string[]) {
  return statuses.includes(snapshot.steps.find((step) => step.id === stepId)?.status ?? "blocked");
}

function hasPilotStep(pilotHealth: PilotHealthScore, stepId: PilotStepId) {
  return pilotHealth.completedStepIds.includes(stepId);
}

function queueStatus(queues: PilotCommandCenterQueueItem[], type: PilotCommandCenterQueueItem["type"]) {
  const matching = queues.filter((queue) => queue.type === type);
  if (!matching.length) return "blocked";
  if (matching.some((queue) => queue.status === "blocked")) return "blocked";
  if (matching.some((queue) => queue.status === "requires_approval" || queue.status === "monitoring")) return "ready";
  return "accepted";
}

function criterion(input: PilotAcceptanceCriterion): PilotAcceptanceCriterion {
  return input;
}

function handoff(input: PilotLiveOpsHandoff): PilotLiveOpsHandoff {
  return input;
}

function buildCriteria(input: BuildPilotTenantAcceptanceInput): PilotAcceptanceCriterion[] {
  const tenantReady = hasGoldenStep(input.goldenPath, "organization-setup", ["complete"]) && hasPilotStep(input.pilotHealth, "organization");
  const rbacReady = hasGoldenStep(input.goldenPath, "team-provisioning", ["ready", "complete"]) && hasPilotStep(input.pilotHealth, "role_assignment");
  const knowledgeReady = input.metrics.ragReadyDocuments > 0 && hasGoldenStep(input.goldenPath, "knowledge-ingestion", ["complete"]);
  const ragReady = hasGoldenStep(input.goldenPath, "grounded-question", ["complete"]) && hasPilotStep(input.pilotHealth, "first_ai_question");
  const reviewReady = queueStatus(input.commandCenter.queues, "ai_review") !== "blocked" && hasGoldenStep(input.goldenPath, "human-review", ["ready", "needs-review", "complete"]);
  const workflowReady = input.metrics.openTasks > 0 && hasGoldenStep(input.goldenPath, "workflow-action", ["complete", "active"]);
  const auditReady = hasGoldenStep(input.goldenPath, "audit-evidence", ["ready", "needs-review", "complete"]) && hasPilotStep(input.pilotHealth, "view_audit_trail");
  const acceptanceReady = Boolean(input.acceptedAt) || (input.pilotHealth.score >= 70 && input.commandCenter.score >= 60 && input.goldenPath.readinessScore >= 65);

  return [
    criterion({
      id: "tenant-and-profile",
      label: "Tenant, profile and sponsor workspace",
      status: tenantReady ? "accepted" : "blocked",
      owner: "tenant-admin",
      route: "/onboarding",
      detail: tenantReady ? "The pilot organization and first profile are ready." : "Create the organization and profile before pilot acceptance.",
      evidence: ["organizations", "users", "workflow.onboarding.organization_ready"],
    }),
    criterion({
      id: "identity-and-rbac",
      label: "Identity, invitations and RBAC",
      status: rbacReady ? "accepted" : "needs_evidence",
      owner: "tenant-admin",
      route: "/admin/users",
      detail: rbacReady ? "Pilot roles are assigned and the invite path is available." : "Invite the sponsor team and confirm role assignment.",
      evidence: ["invitations", "role.changed audit log", "pilot_readiness_events.role_assignment"],
    }),
    criterion({
      id: "knowledge-and-rag",
      label: "Knowledge ingestion and cited retrieval",
      status: knowledgeReady && ragReady ? "accepted" : knowledgeReady ? "ready" : "needs_evidence",
      owner: "ai-governance",
      route: "/knowledge",
      detail: knowledgeReady && ragReady ? "Tenant-authorized knowledge can support cited answers." : "Upload or import knowledge and run one cited question.",
      evidence: ["documents", "rag chunks", "workflow.rag.answer_generated"],
    }),
    criterion({
      id: "ai-review-controls",
      label: "Human review controls for consequential AI",
      status: reviewReady ? "ready" : "blocked",
      owner: "ai-governance",
      route: "/ai-workspace/review-inbox",
      detail: reviewReady ? "Governed AI output is routed through human review." : "Configure review inbox evidence before pilot use.",
      evidence: ["ai_operation_reviews", "answer citations", "human review decision"],
    }),
    criterion({
      id: "workflow-dashboard-audit",
      label: "Approved action, dashboard and audit evidence",
      status: workflowReady && auditReady ? "accepted" : workflowReady ? "ready" : "needs_evidence",
      owner: "customer-success",
      route: "/dashboard",
      detail: workflowReady && auditReady ? "The golden-path action is reflected in work, dashboard state and audit evidence." : "Create one approved task or approval and verify audit visibility.",
      evidence: ["workflow_timeline_events", "tasks or approval_requests", "audit_logs"],
    }),
    criterion({
      id: "connector-and-sandbox-ops",
      label: "Connector queue and sandbox policy posture",
      status: input.commandCenter.status === "blocked" ? "blocked" : input.commandCenter.score >= 70 ? "ready" : "needs_evidence",
      owner: "platform",
      route: "/admin/plugin-runtime",
      detail: "Connector writes, sandbox runs and RAG gates are controlled from the Pilot Command Center.",
      evidence: ["connector_execution_queue", "sandbox_policy_attestations", "rag_evaluation_runs"],
    }),
    criterion({
      id: "pilot-acceptance-record",
      label: "Pilot acceptance record",
      status: input.acceptedAt ? "accepted" : acceptanceReady ? "ready" : "needs_evidence",
      owner: "customer-success",
      route: "/admin/pilot-command-center",
      detail: input.acceptedAt ? "Pilot acceptance was recorded for live operations." : "Record acceptance after sponsor review and evidence check.",
      evidence: ["pilot_tenant_acceptance_runs", "pilot_acceptance_checklist_items", "pilot_live_ops_events"],
    }),
  ];
}

function buildHandoffs(input: BuildPilotTenantAcceptanceInput, criteria: PilotAcceptanceCriterion[]): PilotLiveOpsHandoff[] {
  const blockedCriteria = criteria.filter((item) => item.status === "blocked");
  const missingCriteria = criteria.filter((item) => item.status === "needs_evidence");
  const connectorStatus = queueStatus(input.commandCenter.queues, "connector_action");
  const aiReviewStatus = queueStatus(input.commandCenter.queues, "ai_review");
  const ragStatus = queueStatus(input.commandCenter.queues, "rag_evaluation");

  return [
    handoff({
      id: "sponsor-acceptance-review",
      title: "Sponsor acceptance review",
      status: blockedCriteria.length > 0 ? "blocked" : "ready",
      owner: "customer-success",
      route: "/admin/pilot-command-center",
      trigger: blockedCriteria.length > 0 ? `${blockedCriteria.length} acceptance blocker(s) remain.` : "Evidence is ready for sponsor sign-off.",
      evidence: ["pilot acceptance score", "golden-path snapshot", "tenant health"],
      dueInHours: 24,
    }),
    handoff({
      id: "stuck-step-recovery",
      title: "Stuck golden-path recovery",
      status: missingCriteria.length > 0 ? "monitoring" : "ready",
      owner: "customer-success",
      route: input.goldenPath.nextBestAction.route,
      trigger: missingCriteria.length > 0 ? `${missingCriteria[0]?.label ?? "Pilot evidence"} needs follow-up.` : "No stuck critical step is visible.",
      evidence: input.goldenPath.auditEvents.slice(0, 4),
      dueInHours: 12,
    }),
    handoff({
      id: "connector-and-mailbox-ops",
      title: "Connector and selected-message operations",
      status: connectorStatus === "blocked" ? "blocked" : "monitoring",
      owner: "platform",
      route: "/integrations",
      trigger: connectorStatus === "blocked" ? "Connector credentials or approval posture is missing." : "Selected-message import queue is controlled.",
      evidence: ["plugin_installations", "plugin_action_requests", "token vault references"],
      dueInHours: 48,
    }),
    handoff({
      id: "ai-review-live-ops",
      title: "AI review operations monitoring",
      status: aiReviewStatus === "blocked" ? "blocked" : "monitoring",
      owner: "ai-governance",
      route: "/ai-workspace/review-inbox",
      trigger: input.goldenPath.needsReviewCount > 0 ? "Human review queue needs reviewer discipline." : "Review route is available for consequential output.",
      evidence: ["ai_operation_reviews", "ai_usage_ledger", "source citation bundle"],
      dueInHours: 24,
    }),
    handoff({
      id: "release-gate-and-rag-ops",
      title: "RAG release gate and audit evidence",
      status: ragStatus === "blocked" ? "blocked" : "monitoring",
      owner: "platform",
      route: "/admin/audit-logs",
      trigger: "Run RAG fixtures and preserve audit/export linkage before expanding pilot usage.",
      evidence: ["rag_evaluation_runs", "audit_export_timeline_links", "pilot release gate"],
      dueInHours: 72,
    }),
  ];
}

function acceptanceStatus(score: number, blockedCount: number, acceptedAt?: string): PilotAcceptanceStatus {
  if (acceptedAt) return "accepted";
  if (blockedCount > 0) return "blocked";
  if (score >= 82) return "ready_for_acceptance";
  if (score >= 55) return "needs_evidence";
  return "blocked";
}

function acceptanceStage(status: PilotAcceptanceStatus, completionPercent: number): PilotTenantAcceptanceSnapshot["stage"] {
  if (status === "accepted") return "live_operations";
  if (status === "ready_for_acceptance") return "acceptance_review";
  if (completionPercent >= 55) return "pilot_execution";
  return "trial_setup";
}

export function buildPilotTenantAcceptanceSnapshot(input: BuildPilotTenantAcceptanceInput): PilotTenantAcceptanceSnapshot {
  const criteria = buildCriteria(input);
  const handoffs = buildHandoffs(input, criteria);
  const score = Math.round((criteria.reduce((sum, item) => sum + statusWeights[item.status], 0) / criteria.length) * 100);
  const blockedCount = criteria.filter((item) => item.status === "blocked").length;
  const missingEvidenceCount = criteria.filter((item) => item.status === "needs_evidence").length;
  const status = acceptanceStatus(score, blockedCount, input.acceptedAt);
  const completionPercent = Math.round((criteria.filter((item) => item.status === "accepted").length / criteria.length) * 100);
  const nextOperatorAction = handoffs.find((item) => item.status === "blocked")
    ?? handoffs.find((item) => item.status === "monitoring")
    ?? handoffs[0];

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName ?? "North East Health Mission",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status,
    stage: acceptanceStage(status, completionPercent),
    score,
    completionPercent,
    readinessScore: input.pilotHealth.score,
    commandCenterScore: input.commandCenter.score,
    missingEvidenceCount,
    blockedCount,
    nextOperatorAction,
    criteria,
    handoffs,
    recommendations: [
      input.goldenPath.nextBestAction.label,
      ...input.pilotHealth.recommendations,
      ...input.commandCenter.recommendations.slice(0, 2),
    ].slice(0, 5),
    acceptedAt: input.acceptedAt,
    operatorHandoffRecordedAt: input.operatorHandoffRecordedAt,
  };
}
