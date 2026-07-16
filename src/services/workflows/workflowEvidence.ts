import type { LiveWorkspaceMetrics } from "../live-platform/livePlatform";
import type {
  EnterpriseGoldenPathSnapshot,
  EnterpriseWorkflowStatus,
  EnterpriseWorkflowStepId,
} from "./enterpriseGoldenPath";

export type EnterpriseWorkflowProgressStatus = "not_started" | "active" | "ready" | "needs_review" | "complete" | "blocked";

export type WorkflowTimelineResourceType =
  | "organization"
  | "user"
  | "document"
  | "email"
  | "ai_review"
  | "task"
  | "approval"
  | "project"
  | "stakeholder"
  | "meeting"
  | "dashboard"
  | "audit";

export type WorkflowTimelineEventType =
  | "tenant_created"
  | "team_invited"
  | "source_imported"
  | "document_indexed"
  | "ai_answer_generated"
  | "human_decision"
  | "workflow_action_created"
  | "dashboard_updated"
  | "audit_recorded";

export type ReviewWorkflowActionType =
  | "task"
  | "approval_request"
  | "project_update"
  | "stakeholder_note"
  | "meeting_follow_up";

export type EnterpriseWorkflowProgressRecord = {
  id?: string;
  organizationId: string;
  stepId: EnterpriseWorkflowStepId;
  status: EnterpriseWorkflowProgressStatus;
  lastEventId?: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowTimelineEvent = {
  id: string;
  organizationId: string;
  resourceType: WorkflowTimelineResourceType;
  resourceId?: string;
  eventType: WorkflowTimelineEventType;
  title: string;
  description?: string;
  actorUserId?: string;
  actorLabel?: string;
  sourceType?: string;
  sourceId?: string;
  auditLogId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type TenantHealthIndicator = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
  route: string;
};

export const workflowActionLabels: Record<ReviewWorkflowActionType, string> = {
  task: "Create task",
  approval_request: "Create approval request",
  project_update: "Create project update",
  stakeholder_note: "Create stakeholder note",
  meeting_follow_up: "Create meeting follow-up",
};

const statusMap: Record<EnterpriseWorkflowStatus, EnterpriseWorkflowProgressStatus> = {
  complete: "complete",
  active: "active",
  ready: "ready",
  "needs-review": "needs_review",
  blocked: "blocked",
};

export function toPersistedWorkflowStatus(status: EnterpriseWorkflowStatus): EnterpriseWorkflowProgressStatus {
  return statusMap[status] ?? "not_started";
}

export function buildWorkflowProgressRecords(
  organizationId: string,
  snapshot: EnterpriseGoldenPathSnapshot,
  recordedAt = new Date().toISOString(),
): EnterpriseWorkflowProgressRecord[] {
  return snapshot.steps.map((step) => {
    const status = toPersistedWorkflowStatus(step.status);
    return {
      organizationId,
      stepId: step.id,
      status,
      completedAt: status === "complete" ? recordedAt : undefined,
      metadata: {
        module: step.module,
        metricLabel: step.metricLabel,
        metricValue: step.metricValue,
        route: step.route,
        lockedForRole: step.lockedForRole,
        primaryAction: step.primaryAction,
      },
    };
  });
}

export function buildTenantHealthIndicators(
  snapshot: EnterpriseGoldenPathSnapshot,
  metrics: LiveWorkspaceMetrics,
): TenantHealthIndicator[] {
  const pendingReview = snapshot.needsReviewCount + Math.max(0, metrics.pendingApprovals);
  const approvalRisk = metrics.pendingApprovals >= 20 ? "danger" : metrics.pendingApprovals >= 8 ? "warning" : "success";
  const integrationTone = metrics.integrationConfigured > 0 ? "success" : "warning";
  const auditTone = metrics.unreadNotifications > 0 || snapshot.completionPercent >= 70 ? "success" : "warning";

  return [
    {
      id: "onboarding",
      label: "Onboarding completion",
      value: `${snapshot.completionPercent}%`,
      detail: snapshot.nextBestAction.label,
      tone: snapshot.completionPercent >= 80 ? "success" : "info",
      route: snapshot.nextBestAction.route,
    },
    {
      id: "active-users",
      label: "Active users",
      value: snapshot.steps.some((step) => step.id === "team-provisioning" && step.status !== "blocked") ? "Ready" : "Blocked",
      detail: "Invite flow and role assignment are available to tenant admins.",
      tone: "info",
      route: "/admin/organization",
    },
    {
      id: "documents-indexed",
      label: "Documents indexed",
      value: String(metrics.ragReadyDocuments),
      detail: metrics.ragReadyDocuments > 0 ? "Knowledge is available for governed retrieval." : "Upload or import the first knowledge source.",
      tone: metrics.ragReadyDocuments > 0 ? "success" : "warning",
      route: "/knowledge",
    },
    {
      id: "pending-ai-reviews",
      label: "Pending AI reviews",
      value: String(snapshot.needsReviewCount),
      detail: pendingReview > 0 ? "Human review is protecting consequential output." : "No reviewed output is waiting.",
      tone: snapshot.needsReviewCount > 0 ? "warning" : "success",
      route: "/ai-workspace/review-inbox",
    },
    {
      id: "open-tasks",
      label: "Open tasks",
      value: String(metrics.openTasks),
      detail: "Approved recommendations can become assigned work.",
      tone: metrics.openTasks > 0 ? "success" : "warning",
      route: "/tasks",
    },
    {
      id: "approval-sla",
      label: "Approval SLA risk",
      value: String(metrics.pendingApprovals),
      detail: metrics.pendingApprovals > 0 ? "Governance queue requires review discipline." : "No SLA risk detected.",
      tone: approvalRisk,
      route: "/approvals",
    },
    {
      id: "integration-health",
      label: "Integration health",
      value: metrics.integrationConfigured > 0 ? "Connected" : "Gated",
      detail: metrics.integrationConfigured > 0 ? "At least one connector is configured." : "Connect Gmail or Microsoft for selected-message import.",
      tone: integrationTone,
      route: "/integrations",
    },
    {
      id: "audit-coverage",
      label: "Audit coverage",
      value: auditTone === "success" ? "Tracked" : "Needs first event",
      detail: "Workflow actions record actor, source, citation, decision and outcome evidence.",
      tone: auditTone,
      route: "/admin/audit-logs",
    },
  ];
}

export function fallbackWorkflowTimelineEvents(organizationId: string): WorkflowTimelineEvent[] {
  return [
    {
      id: "timeline-source-imported",
      organizationId,
      resourceType: "document",
      eventType: "source_imported",
      title: "District review note imported",
      description: "Selected institutional source was added to the Knowledge Hub and prepared for governed retrieval.",
      actorLabel: "Mission Operations",
      sourceType: "document",
      sourceId: "district-review-note",
      metadata: { module: "Knowledge Hub" },
      createdAt: "2026-07-16T03:30:00.000Z",
    },
    {
      id: "timeline-ai-answer",
      organizationId,
      resourceType: "ai_review",
      eventType: "ai_answer_generated",
      title: "Cited answer generated",
      description: "AXXESS produced a tenant-scoped answer with source citations and a human review flag.",
      actorLabel: "AXXESS Governed RAG",
      sourceType: "document",
      sourceId: "district-review-note",
      metadata: { confidence: 0.82, humanReviewRequired: true },
      createdAt: "2026-07-16T03:36:00.000Z",
    },
    {
      id: "timeline-human-review",
      organizationId,
      resourceType: "ai_review",
      eventType: "human_decision",
      title: "Human reviewer approved action",
      description: "A manager approved the cited answer before any operational record was created.",
      actorLabel: "Program Manager",
      sourceType: "ai_review",
      sourceId: "review-oxygen-risk",
      metadata: { decision: "approved" },
      createdAt: "2026-07-16T03:42:00.000Z",
    },
    {
      id: "timeline-task-created",
      organizationId,
      resourceType: "task",
      eventType: "workflow_action_created",
      title: "Follow-up task created",
      description: "Approved AI output became an accountable task with owner, priority, tags and audit metadata.",
      actorLabel: "Program Manager",
      sourceType: "ai_review",
      sourceId: "review-oxygen-risk",
      metadata: { tags: ["ai-review", "governance"] },
      createdAt: "2026-07-16T03:45:00.000Z",
    },
    {
      id: "timeline-audit",
      organizationId,
      resourceType: "audit",
      eventType: "audit_recorded",
      title: "Audit evidence recorded",
      description: "The tenant timeline links the source, answer, review decision, created work and audit event.",
      actorLabel: "AXXESS Audit Layer",
      sourceType: "task",
      sourceId: "timeline-task-created",
      metadata: { category: "workflow" },
      createdAt: "2026-07-16T03:46:00.000Z",
    },
  ];
}
