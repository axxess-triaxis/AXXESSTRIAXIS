import type { RoleName } from "../../domain";
import type { LiveWorkspaceMetrics } from "../live-platform/livePlatform";

export type EnterpriseWorkflowStatus = "complete" | "active" | "ready" | "needs-review" | "blocked";

export type GoldenPathDisplayMode = "guided" | "on-demand";

export type EnterpriseWorkflowStepId =
  | "organization-setup"
  | "team-provisioning"
  | "knowledge-ingestion"
  | "grounded-question"
  | "human-review"
  | "workflow-action"
  | "dashboard-feedback"
  | "audit-evidence";

export type EnterpriseWorkflowStep = {
  id: EnterpriseWorkflowStepId;
  title: string;
  description: string;
  route: string;
  module: string;
  status: EnterpriseWorkflowStatus;
  metricLabel: string;
  metricValue: string;
  requiredRoles: RoleName[];
  primaryAction: string;
  auditEvent: string;
  notification: string;
  lockedForRole: boolean;
  blockedReason?: string;
};

export type EnterpriseWorkflowAction = {
  stepId: EnterpriseWorkflowStepId;
  label: string;
  route: string;
  status: EnterpriseWorkflowStatus;
  reason: string;
};

export type EnterpriseGoldenPathSnapshot = {
  title: string;
  narrative: string;
  readinessScore: number;
  completionPercent: number;
  needsReviewCount: number;
  nextBestAction: EnterpriseWorkflowAction;
  actionQueue: EnterpriseWorkflowAction[];
  steps: EnterpriseWorkflowStep[];
  auditEvents: string[];
};

export type EnterpriseGoldenPathInput = {
  metrics: LiveWorkspaceMetrics;
  userRole: RoleName;
  hasOrganization: boolean;
  hasProfile: boolean;
  pendingAiReviews?: number;
  connectedIntegrations?: number;
};

const actionRoles: Record<EnterpriseWorkflowStepId, RoleName[]> = {
  "organization-setup": ["Super Admin", "Organization Admin"],
  "team-provisioning": ["Super Admin", "Organization Admin"],
  "knowledge-ingestion": ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee"],
  "grounded-question": ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee"],
  "human-review": ["Super Admin", "Organization Admin", "Executive", "Manager"],
  "workflow-action": ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee"],
  "dashboard-feedback": ["Super Admin", "Organization Admin", "Executive", "Manager"],
  "audit-evidence": ["Super Admin", "Organization Admin"],
};

const statusWeight: Record<EnterpriseWorkflowStatus, number> = {
  complete: 1,
  "needs-review": 0.78,
  active: 0.68,
  ready: 0.55,
  blocked: 0.2,
};

function canAct(role: RoleName, allowedRoles: RoleName[]) {
  return allowedRoles.includes(role);
}

function statusForCount(count: number, fallback: EnterpriseWorkflowStatus = "active"): EnterpriseWorkflowStatus {
  return count > 0 ? "complete" : fallback;
}

function formatCount(value: number) {
  if (value >= 1000) return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
  return String(value);
}

export function buildEnterpriseGoldenPathSnapshot(input: EnterpriseGoldenPathInput): EnterpriseGoldenPathSnapshot {
  const pendingAiReviews = input.pendingAiReviews ?? (input.metrics.pendingApprovals > 0 ? Math.min(4, Math.max(1, Math.ceil(input.metrics.pendingApprovals / 10))) : 0);
  const connectedIntegrations = input.connectedIntegrations ?? input.metrics.integrationConfigured;
  const hasCoreWorkflow = input.metrics.activeProjects > 0 && input.metrics.openTasks > 0;

  const stepInputs: Array<Omit<EnterpriseWorkflowStep, "lockedForRole">> = [
    {
      id: "organization-setup",
      title: "Create tenant and profile",
      description: "A real customer starts with an organization, profile, department, and role-backed workspace.",
      route: "/onboarding",
      module: "Onboarding",
      status: input.hasOrganization && input.hasProfile ? "complete" : "active",
      metricLabel: "Tenant",
      metricValue: input.hasOrganization ? "Ready" : "Missing",
      requiredRoles: actionRoles["organization-setup"],
      primaryAction: input.hasOrganization ? "Review tenant setup" : "Create organization",
      auditEvent: "workflow.onboarding.organization_ready",
      notification: "Workspace tenant is ready",
    },
    {
      id: "team-provisioning",
      title: "Invite team and assign roles",
      description: "Admins provision departments, invite users, and assign RBAC before sensitive workflows open.",
      route: "/admin/organization",
      module: "Organization Admin",
      status: input.hasOrganization ? "ready" : "blocked",
      metricLabel: "RBAC",
      metricValue: input.userRole,
      requiredRoles: actionRoles["team-provisioning"],
      primaryAction: "Open user and role setup",
      auditEvent: "workflow.organization.users_invited",
      notification: "Team provisioning is queued",
      blockedReason: input.hasOrganization ? undefined : "Complete organization setup (step 1) to unlock team provisioning.",
    },
    {
      id: "knowledge-ingestion",
      title: "Upload or import institutional knowledge",
      description: "Documents become classified, chunked, permissioned, and available for governed retrieval.",
      route: "/knowledge",
      module: "Knowledge Hub",
      status: statusForCount(input.metrics.ragReadyDocuments),
      metricLabel: "RAG sources",
      metricValue: formatCount(input.metrics.ragReadyDocuments),
      requiredRoles: actionRoles["knowledge-ingestion"],
      primaryAction: input.metrics.ragReadyDocuments > 0 ? "Inspect indexed sources" : "Upload first document",
      auditEvent: "workflow.knowledge.document_ingested",
      notification: "Knowledge ingestion is available for RAG",
    },
    {
      id: "grounded-question",
      title: "Ask a cited enterprise question",
      description: "AXXESS answers against tenant-authorized documents and operational records with sources.",
      route: "/ai-workspace",
      module: "AI Workspace",
      status: input.metrics.ragReadyDocuments > 0 ? "complete" : "blocked",
      metricLabel: "Retrieval",
      metricValue: input.metrics.ragReadyDocuments > 0 ? "Cited" : "Blocked",
      requiredRoles: actionRoles["grounded-question"],
      primaryAction: "Ask governed question",
      auditEvent: "workflow.rag.answer_generated",
      notification: "Cited answer generated",
      blockedReason: input.metrics.ragReadyDocuments > 0 ? undefined : "Upload at least one document in Knowledge Hub to unlock grounded, cited answers.",
    },
    {
      id: "human-review",
      title: "Review AI output before action",
      description: "Consequential AI recommendations require approval, edit, rejection, or escalation.",
      route: "/ai-workspace/review-inbox",
      module: "AI Review Inbox",
      status: pendingAiReviews > 0 ? "needs-review" : "ready",
      metricLabel: "AI reviews",
      metricValue: String(pendingAiReviews),
      requiredRoles: actionRoles["human-review"],
      primaryAction: pendingAiReviews > 0 ? "Review pending AI output" : "Open review inbox",
      auditEvent: "workflow.ai_review.decision_recorded",
      notification: "AI review decision awaits governance",
    },
    {
      id: "workflow-action",
      title: "Convert approval into work",
      description: "Approved outputs become tasks, project updates, approval packets, stakeholder notes, or meetings.",
      route: "/tasks",
      module: "Tasks & Workflow",
      status: hasCoreWorkflow ? "complete" : pendingAiReviews > 0 ? "blocked" : "active",
      metricLabel: "Open tasks",
      metricValue: formatCount(input.metrics.openTasks),
      requiredRoles: actionRoles["workflow-action"],
      primaryAction: hasCoreWorkflow ? "Inspect workflow tasks" : "Create accountable task",
      auditEvent: "workflow.action.created",
      notification: "Workflow action was assigned",
      blockedReason: !hasCoreWorkflow && pendingAiReviews > 0 ? "Resolve the pending AI reviews above before converting approvals into workflow actions." : undefined,
    },
    {
      id: "dashboard-feedback",
      title: "Reflect work in command center",
      description: "Dashboards, alerts, approvals, and analytics update from the same tenant-scoped workflow state.",
      route: "/dashboard",
      module: "Executive Dashboard",
      status: input.metrics.activeProjects > 0 ? "complete" : "ready",
      metricLabel: "Active projects",
      metricValue: formatCount(input.metrics.activeProjects),
      requiredRoles: actionRoles["dashboard-feedback"],
      primaryAction: "Open command center",
      auditEvent: "workflow.dashboard.metrics_refreshed",
      notification: "Executive metrics refreshed",
    },
    {
      id: "audit-evidence",
      title: "Preserve audit and notification history",
      description: "Every meaningful action keeps tenant, actor, source, timestamp, and outcome evidence.",
      route: "/admin/audit-logs",
      module: "Audit Logs",
      status: input.metrics.pendingApprovals > 0 || input.metrics.unreadNotifications > 0 || connectedIntegrations > 0 ? "needs-review" : "ready",
      metricLabel: "Notifications",
      metricValue: formatCount(input.metrics.unreadNotifications),
      requiredRoles: actionRoles["audit-evidence"],
      primaryAction: "Review audit evidence",
      auditEvent: "workflow.audit.evidence_recorded",
      notification: "Audit evidence is available",
    },
  ];

  const steps = stepInputs.map((step) => ({
    ...step,
    lockedForRole: !canAct(input.userRole, step.requiredRoles),
  }));
  const actionableSteps = steps.filter((step) => !step.lockedForRole && step.status !== "complete");
  const actionQueue = actionableSteps.slice(0, 4).map((step) => ({
    stepId: step.id,
    label: step.primaryAction,
    route: step.route,
    status: step.status,
    reason: step.description,
  }));
  const fallbackAction = steps.find((step) => !step.lockedForRole && step.status === "complete") ?? steps[0];
  const nextBestAction = actionQueue[0] ?? {
    stepId: fallbackAction.id,
    label: fallbackAction.primaryAction,
    route: fallbackAction.route,
    status: fallbackAction.status,
    reason: fallbackAction.description,
  };
  const readinessScore = Math.round((steps.reduce((sum, step) => sum + statusWeight[step.status], 0) / steps.length) * 100);
  const completionPercent = Math.round((steps.filter((step) => step.status === "complete").length / steps.length) * 100);

  return {
    title: "Enterprise golden path",
    narrative: "Sign up, provision the tenant, ingest knowledge, ask a cited question, review AI output, approve action, and see dashboards, notifications, and audit history update together.",
    readinessScore,
    completionPercent,
    needsReviewCount: steps.filter((step) => step.status === "needs-review").length,
    nextBestAction,
    actionQueue,
    steps,
    auditEvents: steps.map((step) => step.auditEvent),
  };
}
