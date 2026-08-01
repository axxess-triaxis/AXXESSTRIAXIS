// Executive Dashboard Redesign Sprint ED-R1: orchestrates already-fetched dashboard inputs (the
// same hooks DashboardSection.tsx already calls) into a single ScoredTile[]. This function does
// not fetch anything itself -- it is a pure mapping from live data + policy functions to tiles,
// so it is fully unit-testable without mocking network calls.
import type { LiveWorkspaceMetrics } from "../live-platform/livePlatform";
import {
  computeScore,
  type CriticalityBand,
  type DashboardTileDataState,
  type PriorityLevel1to5,
  type ScoredTile,
} from "./tileScoring";
import {
  approvalSlaRiskPolicy,
  auditLogGapPolicy,
  documentIndexingHealthPolicy,
  integrationHealthPolicy,
  overdueMeetingsPolicy,
  overdueTasksPolicy,
  pendingAiReviewsPolicy,
  projectHealthPolicy,
  socialAlertsProviderGatedPolicy,
  workflowTimelineActivityPolicy,
} from "./tilePolicies";

export type DashboardSnapshotInput = {
  liveMetrics: LiveWorkspaceMetrics;
  overdueTaskCount: number | undefined;
  overdueMeetingCount: number | undefined;
  pendingAiReviewCount: number;
  auditLogCount: number | undefined;
  socialAlertsAnyLiveProviderConfigured: boolean;
  workflowTimelineEventCount: number;
  projects: Array<{ risk: string }>;
  demoMode: boolean;
};

function tile(
  base: Omit<ScoredTile, "score">,
): ScoredTile {
  return { ...base, score: computeScore(base.priority, base.criticality) };
}

// Not-connected tiles score at the floor (priority 1, criticality green -> score 1) so they never
// qualify for an Urgent Attention bar and always sort last within their tier -- a placeholder
// must never visually compete with real, scored content.
function notConnectedTile(
  id: string,
  tier: 1 | 2 | 3,
  title: string,
  detail: string,
  route?: string,
): ScoredTile {
  const priority: PriorityLevel1to5 = 1;
  const criticality: CriticalityBand = "green";
  const dataState: DashboardTileDataState = "not-connected";
  return tile({ id, tier, title, value: "Not connected yet", detail, priority, criticality, dataState, route, rationale: "No repository or integration exists for this source yet." });
}

export function buildDashboardSnapshot(input: DashboardSnapshotInput): ScoredTile[] {
  const tiles: ScoredTile[] = [];

  // --- Tier 1: performance / HITL / customer-facing work ---

  const overdueTasksLoaded = input.overdueTaskCount !== undefined;
  const overdueTasksPolicyResult = overdueTasksPolicy(input.overdueTaskCount ?? 0);
  tiles.push(tile({
    id: "overdue-tasks",
    tier: 1,
    title: "Overdue tasks",
    value: overdueTasksLoaded ? String(input.overdueTaskCount) : "--",
    detail: overdueTasksPolicyResult.rationale,
    priority: overdueTasksPolicyResult.priority,
    criticality: overdueTasksPolicyResult.criticality,
    dataState: overdueTasksLoaded ? "live" : "partial",
    route: "/tasks",
    rationale: overdueTasksPolicyResult.rationale,
  }));

  const overdueMeetingsLoaded = input.overdueMeetingCount !== undefined;
  const overdueMeetingsPolicyResult = overdueMeetingsPolicy(input.overdueMeetingCount ?? 0);
  tiles.push(tile({
    id: "overdue-meetings",
    tier: 1,
    title: "Missed meetings",
    value: overdueMeetingsLoaded ? String(input.overdueMeetingCount) : "--",
    detail: overdueMeetingsPolicyResult.rationale,
    priority: overdueMeetingsPolicyResult.priority,
    criticality: overdueMeetingsPolicyResult.criticality,
    dataState: overdueMeetingsLoaded ? "live" : "partial",
    route: "/meetings",
    rationale: overdueMeetingsPolicyResult.rationale,
  }));

  const pendingAiReviewsResult = pendingAiReviewsPolicy(input.pendingAiReviewCount);
  tiles.push(tile({
    id: "pending-ai-reviews",
    tier: 1,
    title: "HITL review inbox",
    value: String(input.pendingAiReviewCount),
    detail: pendingAiReviewsResult.rationale,
    priority: pendingAiReviewsResult.priority,
    criticality: pendingAiReviewsResult.criticality,
    dataState: "live",
    route: "/ai-workspace/review-inbox",
    rationale: pendingAiReviewsResult.rationale,
  }));

  const approvalSlaResult = approvalSlaRiskPolicy(input.liveMetrics.pendingApprovals);
  tiles.push(tile({
    id: "approval-sla-risk",
    tier: 1,
    title: "Approval SLA risk",
    value: String(input.liveMetrics.pendingApprovals),
    detail: approvalSlaResult.rationale,
    priority: approvalSlaResult.priority,
    criticality: approvalSlaResult.criticality,
    dataState: "live",
    route: "/approvals",
    rationale: approvalSlaResult.rationale,
  }));

  const atRiskProjects = input.projects.filter((project) => project.risk === "high" || project.risk === "urgent").length;
  const projectHealthResult = projectHealthPolicy(atRiskProjects, input.projects.length);
  tiles.push(tile({
    id: "project-health",
    tier: 1,
    title: "Project health",
    value: input.projects.length > 0 ? `${atRiskProjects}/${input.projects.length} at risk` : "No projects",
    detail: projectHealthResult.rationale,
    priority: projectHealthResult.priority,
    criticality: projectHealthResult.criticality,
    dataState: input.projects.length > 0 ? "live" : "empty",
    route: "/projects",
    rationale: projectHealthResult.rationale,
  }));

  const socialGatedResult = socialAlertsProviderGatedPolicy(input.socialAlertsAnyLiveProviderConfigured);
  tiles.push(tile({
    id: "social-alerts-status",
    tier: 1,
    title: "External signals",
    value: input.socialAlertsAnyLiveProviderConfigured ? "Connected" : "Provider-gated",
    detail: socialGatedResult.rationale,
    priority: socialGatedResult.priority,
    criticality: socialGatedResult.criticality,
    dataState: input.socialAlertsAnyLiveProviderConfigured ? "live" : "partial",
    route: "/integrations",
    rationale: socialGatedResult.rationale,
  }));

  tiles.push(notConnectedTile("mail-inbox", 1, "Mail inbox needing reply", "Gmail/Microsoft Graph OAuth plumbing exists for AI Workspace use, but no \"mails needing reply\" count is wired to this dashboard yet.", "/integrations"));
  tiles.push(notConnectedTile("calendar-view", 1, "Calendar view", "No calendar UI or repository exists in this codebase yet."));
  tiles.push(notConnectedTile("zoom-gmeet-upcoming", 1, "Zoom / Google Meet upcoming meetings", "No Zoom or Google Meet integration exists in this codebase yet."));
  tiles.push(notConnectedTile("social-alert-feed", 1, "X / LinkedIn / Meta / WhatsApp Business alerts", "Provider-connection status is real (see External signals), but no live alert-count repository exists yet.", "/integrations"));
  tiles.push(notConnectedTile("crm-leads-deals", 1, "CRM leads / deals", "No Lead/Deal domain entity or repository exists in this codebase yet."));

  // --- Tier 2: AI operating infrastructure + business intelligence ---

  const documentHealthResult = documentIndexingHealthPolicy(input.liveMetrics.ragReadyDocuments);
  tiles.push(tile({
    id: "document-indexing-health",
    tier: 2,
    title: "Document indexing health",
    value: String(input.liveMetrics.ragReadyDocuments),
    detail: documentHealthResult.rationale,
    priority: documentHealthResult.priority,
    criticality: documentHealthResult.criticality,
    dataState: "live",
    route: "/knowledge",
    rationale: documentHealthResult.rationale,
  }));

  const timelineActivityResult = workflowTimelineActivityPolicy(input.workflowTimelineEventCount);
  tiles.push(tile({
    id: "workflow-timeline-activity",
    tier: 2,
    title: "Workflow timeline activity",
    value: String(input.workflowTimelineEventCount),
    detail: timelineActivityResult.rationale,
    priority: timelineActivityResult.priority,
    criticality: timelineActivityResult.criticality,
    dataState: "live",
    route: "/dashboard",
    rationale: timelineActivityResult.rationale,
  }));

  const integrationHealthResult = integrationHealthPolicy(input.liveMetrics.integrationConfigured);
  tiles.push(tile({
    id: "integration-health",
    tier: 2,
    title: "Integration health",
    value: input.liveMetrics.integrationConfigured > 0 ? "Connected" : "Gated",
    detail: integrationHealthResult.rationale,
    priority: integrationHealthResult.priority,
    criticality: integrationHealthResult.criticality,
    dataState: "live",
    route: "/integrations",
    rationale: integrationHealthResult.rationale,
  }));

  tiles.push(notConnectedTile("ai-token-usage-spend", 2, "AI token usage / spend", "The spend-tracking backend exists (aiSpendGuard.ts), but no client-facing summary endpoint surfaces it to this dashboard yet."));

  // --- Tier 3: compliance, audit, governance, policy ---

  const auditLogLoaded = input.auditLogCount !== undefined;
  const auditGapResult = auditLogGapPolicy(input.auditLogCount ?? 0);
  tiles.push(tile({
    id: "audit-log-gap",
    tier: 3,
    title: "Audit trail",
    value: auditLogLoaded ? String(input.auditLogCount) : "--",
    detail: auditGapResult.rationale,
    priority: auditGapResult.priority,
    criticality: auditGapResult.criticality,
    dataState: auditLogLoaded ? "live" : "partial",
    route: "/admin/audit-logs",
    rationale: auditGapResult.rationale,
  }));

  tiles.push(notConnectedTile("budget-deficit-overshoot", 3, "Budget deficit / overshoot", "No budget domain entity or repository exists in this codebase yet."));
  tiles.push(notConnectedTile("bank-account-thresholds", 3, "Bank account balance thresholds", "No bank-account domain entity or repository exists in this codebase yet."));
  tiles.push(notConnectedTile("accounts-actionables", 3, "Accounts actionables", "No accounts/finance domain entity or repository exists in this codebase yet."));

  return tiles;
}
