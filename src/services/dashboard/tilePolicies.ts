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

// --- Executive Dashboard Redesign Sprint ED-R2 ---

// Per the ED-R2 sprint spec: count 0 = low; 1-2 = yellow/orange by age; 3-5 or older than 2 days =
// amber; >5 or older than 5 days = red.
export function mailNeedingReplyPolicy(needingReplyCount: number, oldestNeedingReplyDays: number | null): PolicyResult {
  const age = oldestNeedingReplyDays ?? 0;
  if (needingReplyCount === 0) return { priority: 1, criticality: "green", rationale: "No mail awaiting a reply decision." };
  if (needingReplyCount > 5 || age > 5) {
    return { priority: 5, criticality: "red", rationale: `${needingReplyCount} message(s) awaiting reply, oldest ${age} day(s) old.` };
  }
  if (needingReplyCount >= 3 || age > 2) {
    return { priority: 4, criticality: "amber", rationale: `${needingReplyCount} message(s) awaiting reply, oldest ${age} day(s) old.` };
  }
  if (age > 1) return { priority: 3, criticality: "orange", rationale: `${needingReplyCount} message(s) awaiting reply, oldest ${age} day(s) old.` };
  return { priority: 2, criticality: "yellow", rationale: `${needingReplyCount} message(s) awaiting reply.` };
}

// Open pipeline volume is informational, not itself a risk signal -- deliberately low/flat
// severity regardless of count, distinct from the overdue/stalled policies below.
export function openLeadsPolicy(openLeadsCount: number): PolicyResult {
  if (openLeadsCount === 0) return { priority: 1, criticality: "green", rationale: "No open leads yet." };
  return { priority: 1, criticality: "green", rationale: `${openLeadsCount} open lead(s) in the pipeline.` };
}

export function crmFollowUpsDuePolicy(dueCount: number): PolicyResult {
  if (dueCount === 0) return { priority: 1, criticality: "green", rationale: "No follow-ups are overdue." };
  if (dueCount === 1) return { priority: 3, criticality: "yellow", rationale: "1 follow-up is overdue." };
  if (dueCount <= 3) return { priority: 4, criticality: "orange", rationale: `${dueCount} follow-ups are overdue.` };
  return { priority: 5, criticality: "red", rationale: `${dueCount} follow-ups are overdue -- pipeline momentum at risk.` };
}

export function crmStalledLeadsPolicy(stalledCount: number): PolicyResult {
  if (stalledCount === 0) return { priority: 1, criticality: "green", rationale: "No stalled opportunities." };
  if (stalledCount <= 2) return { priority: 3, criticality: "amber", rationale: `${stalledCount} opportunity(ies) stalled.` };
  return { priority: 4, criticality: "red", rationale: `${stalledCount} opportunities stalled -- pipeline health at risk.` };
}

export function criticalSocialAlertsPolicy(criticalCount: number): PolicyResult {
  if (criticalCount === 0) return { priority: 1, criticality: "green", rationale: "No unreviewed critical social alerts." };
  if (criticalCount <= 2) return { priority: 4, criticality: "amber", rationale: `${criticalCount} unreviewed critical alert(s).` };
  return { priority: 5, criticality: "red", rationale: `${criticalCount} unreviewed critical alerts.` };
}

export function socialProviderHealthPolicy(xConfigured: boolean, facebookConfigured: boolean): PolicyResult {
  if (xConfigured || facebookConfigured) return { priority: 1, criticality: "green", rationale: "At least one social monitoring provider is configured." };
  return { priority: 2, criticality: "yellow", rationale: "No social monitoring provider credentials are configured." };
}

// --- Executive Dashboard Redesign Sprint ED-R3 ---

// A meeting within the next hour is "elevated but not necessarily red" per the sprint spec -- a
// timing prompt, not a risk signal.
export function calendarTodayPolicy(todayCount: number, hasMeetingWithinHour: boolean): PolicyResult {
  if (todayCount === 0) return { priority: 1, criticality: "green", rationale: "No meetings scheduled today." };
  if (hasMeetingWithinHour) return { priority: 3, criticality: "yellow", rationale: `${todayCount} meeting(s) today, one starting within the hour.` };
  return { priority: 1, criticality: "green", rationale: `${todayCount} meeting(s) scheduled today.` };
}

export function upcomingMeetingsPolicy(upcomingCount: number): PolicyResult {
  return { priority: 1, criticality: "green", rationale: `${upcomingCount} meeting(s) scheduled in the next 7 days.` };
}

// Manually tracked, not bank-connected -- every rationale below says so explicitly, since this is
// a self-reported watchlist, not live account data.
export function financialBudgetThresholdsPolicy(count: number): PolicyResult {
  if (count === 0) return { priority: 1, criticality: "green", rationale: "No budget items are being manually tracked." };
  return { priority: 1, criticality: "green", rationale: `${count} budget item(s) manually tracked.` };
}

export function financialBudgetOvershootPolicy(overshootCount: number): PolicyResult {
  if (overshootCount === 0) return { priority: 1, criticality: "green", rationale: "No manually tracked budget items are currently over threshold." };
  if (overshootCount === 1) return { priority: 3, criticality: "amber", rationale: "1 manually tracked budget item is over threshold." };
  return { priority: 4, criticality: "red", rationale: `${overshootCount} manually tracked budget items are over threshold.` };
}

export function financialAccountsBelowThresholdPolicy(belowCount: number): PolicyResult {
  if (belowCount === 0) return { priority: 1, criticality: "green", rationale: "No manually tracked account balances are below threshold." };
  if (belowCount === 1) return { priority: 4, criticality: "amber", rationale: "1 manually tracked account balance is below threshold." };
  return { priority: 5, criticality: "red", rationale: `${belowCount} manually tracked account balances are below threshold.` };
}

export function financialAccountsActionablesPolicy(actionableCount: number, overdueCount: number): PolicyResult {
  if (actionableCount === 0) return { priority: 1, criticality: "green", rationale: "No manually tracked accounts actionables." };
  if (overdueCount === 0) return { priority: 2, criticality: "yellow", rationale: `${actionableCount} manually tracked accounts actionable(s).` };
  if (overdueCount === 1) return { priority: 3, criticality: "amber", rationale: `${actionableCount} accounts actionable(s), 1 overdue.` };
  return { priority: 4, criticality: "red", rationale: `${actionableCount} accounts actionable(s), ${overdueCount} overdue.` };
}

// --- Executive Dashboard Redesign Sprint ED-R4 ---
// Thresholds are conservative and deliberately not aggressive -- this is new, uncalibrated signal
// data (published_content_items/community_engagement_items only get populated once a tenant runs
// "Sync now" or the daily cron, MC-4), not a mature, tuned metric yet.

// Posting cadence is informational, not itself a risk signal -- mirrors
// workflowTimelineActivityPolicy's green/yellow-on-silence shape.
export function threadsActivityPolicy(recentPostCount: number): PolicyResult {
  if (recentPostCount > 0) return { priority: 1, criticality: "green", rationale: `${recentPostCount} Threads post(s) in the last 7 days.` };
  return { priority: 2, criticality: "yellow", rationale: "No Threads activity in the last 7 days." };
}

export function threadsEngagementBacklogPolicy(openReplyCount: number): PolicyResult {
  if (openReplyCount === 0) return { priority: 1, criticality: "green", rationale: "No open Threads replies awaiting a response." };
  if (openReplyCount <= 3) return { priority: 3, criticality: "yellow", rationale: `${openReplyCount} Threads repl(y/ies) awaiting a response.` };
  return { priority: 4, criticality: "amber", rationale: `${openReplyCount} Threads replies awaiting a response.` };
}

export function metaBusinessContentActivityPolicy(recentPostCount: number): PolicyResult {
  if (recentPostCount > 0) return { priority: 1, criticality: "green", rationale: `${recentPostCount} Meta Business Suite post(s) in the last 7 days.` };
  return { priority: 1, criticality: "yellow", rationale: "No Meta Business Suite content activity in the last 7 days." };
}

export function metaBusinessCampaignHealthPolicy(activeCampaignCount: number, overBudgetCampaignCount: number): PolicyResult {
  if (activeCampaignCount === 0) return { priority: 1, criticality: "green", rationale: "No active Meta Ads campaigns." };
  if (overBudgetCampaignCount === 0) return { priority: 1, criticality: "green", rationale: `${activeCampaignCount} active campaign(s), all within budget.` };
  if (overBudgetCampaignCount === 1) return { priority: 3, criticality: "amber", rationale: `${activeCampaignCount} active campaign(s), 1 over budget.` };
  return { priority: 4, criticality: "red", rationale: `${activeCampaignCount} active campaign(s), ${overBudgetCampaignCount} over budget.` };
}
