// Executive Dashboard Redesign Sprint ED-R1: per-tile-type policy registry.
//
// Deliberately a set of small, explicit, pure functions (one per tile type), not a generic rules
// engine -- generalizes the same statusWeight/threshold pattern already used by
// enterpriseGoldenPath.ts and workflowEvidence.ts's buildTenantHealthIndicators. Each function is
// independently unit-testable and takes only the already-fetched live value(s) it needs; none of
// these functions perform their own network calls.
import type { CriticalityBand, PriorityLevel1to5 } from "./tileScoring";

export type PolicyResult = {
  priority: PriorityLevel1to5;
  criticality: CriticalityBand;
  rationale: string;
};

export function overdueTasksPolicy(overdueCount: number): PolicyResult {
  if (overdueCount <= 0) return { priority: 1, criticality: "green", rationale: "No overdue tasks." };
  if (overdueCount <= 2) return { priority: 3, criticality: "yellow", rationale: `${overdueCount} task(s) overdue.` };
  if (overdueCount <= 5) return { priority: 4, criticality: "orange", rationale: `${overdueCount} tasks overdue.` };
  if (overdueCount <= 10) return { priority: 4, criticality: "amber", rationale: `${overdueCount} tasks overdue -- approaching a critical backlog.` };
  return { priority: 5, criticality: "red", rationale: `${overdueCount} tasks overdue -- critical backlog.` };
}

export function overdueMeetingsPolicy(overdueCount: number): PolicyResult {
  if (overdueCount <= 0) return { priority: 1, criticality: "green", rationale: "No missed meetings." };
  if (overdueCount === 1) return { priority: 3, criticality: "yellow", rationale: "1 meeting was missed." };
  if (overdueCount <= 3) return { priority: 4, criticality: "orange", rationale: `${overdueCount} meetings were missed.` };
  return { priority: 5, criticality: "red", rationale: `${overdueCount} meetings were missed -- stakeholder follow-up at risk.` };
}

export function pendingAiReviewsPolicy(pendingCount: number): PolicyResult {
  if (pendingCount <= 0) return { priority: 1, criticality: "green", rationale: "No AI output awaiting review." };
  if (pendingCount <= 2) return { priority: 2, criticality: "yellow", rationale: `${pendingCount} AI output(s) awaiting review.` };
  if (pendingCount <= 5) return { priority: 3, criticality: "orange", rationale: `${pendingCount} AI outputs awaiting review.` };
  if (pendingCount <= 10) return { priority: 4, criticality: "amber", rationale: `${pendingCount} AI outputs awaiting review -- governance queue building up.` };
  return { priority: 5, criticality: "red", rationale: `${pendingCount} AI outputs awaiting review -- governance queue is backed up.` };
}

export function approvalSlaRiskPolicy(pendingApprovals: number): PolicyResult {
  if (pendingApprovals <= 0) return { priority: 1, criticality: "green", rationale: "No pending approvals." };
  if (pendingApprovals < 8) return { priority: 2, criticality: "yellow", rationale: `${pendingApprovals} approval(s) pending.` };
  if (pendingApprovals < 15) return { priority: 3, criticality: "orange", rationale: `${pendingApprovals} approvals pending -- governance discipline required.` };
  if (pendingApprovals < 20) return { priority: 4, criticality: "amber", rationale: `${pendingApprovals} approvals pending -- approaching SLA risk.` };
  return { priority: 5, criticality: "red", rationale: `${pendingApprovals} approvals pending -- SLA risk threshold breached.` };
}

// literalAuditLogCount is undefined until the first successful fetch (see useAuditLogCount.ts) --
// callers must not call this policy until the count has genuinely loaded, or "0" (genuinely no
// audit events) will read the same as "not loaded yet."
export function auditLogGapPolicy(auditLogCount: number): PolicyResult {
  if (auditLogCount > 0) return { priority: 1, criticality: "green", rationale: `${auditLogCount} audit events recorded.` };
  return { priority: 4, criticality: "amber", rationale: "No audit events recorded yet for this tenant." };
}

export function documentIndexingHealthPolicy(ragReadyDocuments: number): PolicyResult {
  if (ragReadyDocuments > 0) return { priority: 1, criticality: "green", rationale: `${ragReadyDocuments} document(s) indexed and RAG-ready.` };
  return { priority: 3, criticality: "orange", rationale: "No documents indexed yet -- grounded AI answers are blocked." };
}

// AI token usage/spend has a real backend (src/services/ai/aiSpendGuard.ts), but no client-facing
// summary endpoint exists yet to surface it to this dashboard -- so this policy function is
// implemented and tested per the sprint's requirement, but buildDashboardSnapshot renders this
// tile as not-connected in Phase 1 until that endpoint exists (a fast follow-up, not a Phase 2
// integration, since the underlying spend-tracking table and guard already exist).
export function aiTokenUsageSpendPolicy(spendRatio: number): PolicyResult {
  if (spendRatio < 0.5) return { priority: 1, criticality: "green", rationale: `AI spend at ${Math.round(spendRatio * 100)}% of budget.` };
  if (spendRatio < 0.75) return { priority: 2, criticality: "yellow", rationale: `AI spend at ${Math.round(spendRatio * 100)}% of budget.` };
  if (spendRatio < 0.9) return { priority: 3, criticality: "orange", rationale: `AI spend at ${Math.round(spendRatio * 100)}% of budget.` };
  if (spendRatio < 1) return { priority: 4, criticality: "amber", rationale: `AI spend at ${Math.round(spendRatio * 100)}% of budget -- approaching the cap.` };
  return { priority: 5, criticality: "red", rationale: "AI spend has reached or exceeded budget." };
}

export function projectHealthPolicy(atRiskCount: number, totalProjects: number): PolicyResult {
  if (totalProjects === 0) return { priority: 1, criticality: "green", rationale: "No projects yet." };
  const ratio = atRiskCount / totalProjects;
  if (ratio === 0) return { priority: 1, criticality: "green", rationale: "No projects flagged at risk." };
  if (ratio <= 0.15) return { priority: 3, criticality: "yellow", rationale: `${atRiskCount} of ${totalProjects} projects flagged at risk.` };
  if (ratio <= 0.35) return { priority: 4, criticality: "orange", rationale: `${atRiskCount} of ${totalProjects} projects flagged at risk.` };
  if (ratio <= 0.6) return { priority: 4, criticality: "amber", rationale: `${atRiskCount} of ${totalProjects} projects flagged at risk -- portfolio health declining.` };
  return { priority: 5, criticality: "red", rationale: `${atRiskCount} of ${totalProjects} projects flagged at risk -- portfolio health critical.` };
}

export function workflowTimelineActivityPolicy(eventCountLast7Days: number): PolicyResult {
  if (eventCountLast7Days > 0) return { priority: 1, criticality: "green", rationale: `${eventCountLast7Days} workflow event(s) in the last 7 days.` };
  return { priority: 2, criticality: "yellow", rationale: "No workflow activity recorded in the last 7 days." };
}

export function integrationHealthPolicy(integrationConfigured: number): PolicyResult {
  if (integrationConfigured > 0) return { priority: 1, criticality: "green", rationale: `${integrationConfigured} integration(s) connected.` };
  return { priority: 2, criticality: "yellow", rationale: "No integrations connected yet." };
}

export function socialAlertsProviderGatedPolicy(anyLiveProviderConfigured: boolean): PolicyResult {
  if (anyLiveProviderConfigured) return { priority: 1, criticality: "green", rationale: "A social/RSS alert provider is connected." };
  return { priority: 2, criticality: "yellow", rationale: "Connect X or Facebook to enable live social alert ingestion." };
}
