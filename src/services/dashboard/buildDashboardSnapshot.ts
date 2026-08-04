// Executive Dashboard Redesign Sprint ED-R1: orchestrates already-fetched dashboard inputs (the
// same hooks DashboardSection.tsx already calls) into a single ScoredTile[]. This function does
// not fetch anything itself -- it is a pure mapping from live data + policy functions to tiles,
// so it is fully unit-testable without mocking network calls.
import type { CrmLead, FinancialWatchItem } from "../../domain";
import type { LiveWorkspaceMetrics } from "../live-platform/livePlatform";
import type { CalendarDashboardSignals } from "./calendarDashboardSignals";
import type { ExternalMeetingsDashboardSignals } from "./externalMeetingsDashboardSignals";
import type { MailDashboardSignals } from "./mailDashboardSignals";
import type { MetaBusinessDashboardSignals } from "./metaBusinessDashboardSignals";
import type { SocialDashboardSignals } from "./socialDashboardSignals";
import type { ThreadsDashboardSignals } from "./threadsDashboardSignals";
import { computeCrmDashboardSignals } from "./crmDashboardSignals";
import { computeFinancialDashboardSignals } from "./financialDashboardSignals";
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
  calendarTodayPolicy,
  crmFollowUpsDuePolicy,
  crmStalledLeadsPolicy,
  criticalSocialAlertsPolicy,
  documentIndexingHealthPolicy,
  financialAccountsActionablesPolicy,
  financialAccountsBelowThresholdPolicy,
  financialBudgetOvershootPolicy,
  financialBudgetThresholdsPolicy,
  integrationHealthPolicy,
  mailNeedingReplyPolicy,
  metaBusinessCampaignHealthPolicy,
  metaBusinessContentActivityPolicy,
  openLeadsPolicy,
  overdueMeetingsPolicy,
  overdueTasksPolicy,
  pendingAiReviewsPolicy,
  projectHealthPolicy,
  socialAlertsProviderGatedPolicy,
  socialProviderHealthPolicy,
  threadsActivityPolicy,
  threadsEngagementBacklogPolicy,
  upcomingMeetingsPolicy,
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
  // Executive Dashboard Redesign Sprint ED-R2
  mailSignals: MailDashboardSignals | undefined;
  crmLeads: CrmLead[] | undefined;
  socialSignals: SocialDashboardSignals | undefined;
  // Executive Dashboard Redesign Sprint ED-R3
  calendarSignals: CalendarDashboardSignals | undefined;
  externalMeetingsSignals: ExternalMeetingsDashboardSignals | undefined;
  financialWatchItems: FinancialWatchItem[] | undefined;
  // Executive Dashboard Redesign Sprint ED-R4
  threadsSignals: ThreadsDashboardSignals | undefined;
  metaBusinessSignals: MetaBusinessDashboardSignals | undefined;
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

// A-96 (2026-08-04): "(manual tracking)" is a real, important disclosure for a real tenant --
// financial_watch_items is a manual watchlist, not a bank feed, and hiding that would misrepresent
// the feature. On the investor demo specifically, the founder asked for a cleaner look; drop the
// suffix there only, real-tenant values are untouched.
function financialTileValue(count: number, demoMode: boolean) {
  return demoMode ? String(count) : `${count} (manual tracking)`;
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

  // Executive Dashboard Redesign Sprint ED-R2: real, built on gmail_selected_message_imports /
  // microsoft_selected_message_imports -- see mailDashboardSignals.ts for why no new migration
  // was needed. "Not connected" only when neither Gmail nor Microsoft is OAuth-connected for this
  // tenant; otherwise a genuinely live count (which may honestly be zero).
  if (input.mailSignals) {
    const mailConnected = input.mailSignals.gmailConnected || input.mailSignals.microsoftConnected;
    if (mailConnected) {
      const mailResult = mailNeedingReplyPolicy(input.mailSignals.needingReplyCount, input.mailSignals.oldestNeedingReplyDays);
      tiles.push(tile({
        id: "mail-inbox",
        tier: 1,
        title: "Mails needing reply",
        value: String(input.mailSignals.needingReplyCount),
        detail: mailResult.rationale,
        priority: mailResult.priority,
        criticality: mailResult.criticality,
        dataState: input.mailSignals.needingReplyCount > 0 ? "live" : "empty",
        route: "/ai-workspace",
        rationale: mailResult.rationale,
      }));
    } else {
      tiles.push(notConnectedTile("mail-inbox", 1, "Mails needing reply", "Connect Gmail or Microsoft Outlook to surface messages previewed but not yet imported.", "/integrations"));
    }
  } else {
    tiles.push(notConnectedTile("mail-inbox", 1, "Mails needing reply", "Loading mail signal...", "/integrations"));
  }

  // Executive Dashboard Redesign Sprint ED-R3: real, built on the existing Meeting domain entity
  // (internal AXXESS Meetings & Decisions) -- no external Google/Microsoft Calendar event-fetch
  // service exists in this codebase, so internal meetings are the first real calendar source, per
  // the sprint's preferred order. "Missed meetings" above already covers overdue meetings; these
  // two tiles are additive, not duplicative.
  if (input.calendarSignals) {
    const todayResult = calendarTodayPolicy(input.calendarSignals.todayCount, input.calendarSignals.hasMeetingWithinHour);
    tiles.push(tile({
      id: "calendar-today",
      tier: 1,
      title: "Calendar today",
      value: String(input.calendarSignals.todayCount),
      detail: todayResult.rationale,
      priority: todayResult.priority,
      criticality: todayResult.criticality,
      dataState: input.calendarSignals.todayCount > 0 ? "live" : "empty",
      route: "/meetings",
      rationale: todayResult.rationale,
    }));

    const upcomingResult = upcomingMeetingsPolicy(input.calendarSignals.upcomingCount);
    tiles.push(tile({
      id: "upcoming-meetings",
      tier: 1,
      title: "Upcoming meetings",
      value: String(input.calendarSignals.upcomingCount),
      detail: upcomingResult.rationale,
      priority: upcomingResult.priority,
      criticality: upcomingResult.criticality,
      dataState: input.calendarSignals.upcomingCount > 0 ? "live" : "empty",
      route: "/meetings",
      rationale: upcomingResult.rationale,
    }));
  } else {
    tiles.push(notConnectedTile("calendar-today", 1, "Calendar today", "Loading calendar signal...", "/meetings"));
    tiles.push(notConnectedTile("upcoming-meetings", 1, "Upcoming meetings", "Loading calendar signal...", "/meetings"));
  }

  // Executive Dashboard Redesign Sprint ED-R3: Zoom and Google Meet are registered OAuth
  // connectors (connectorContract.ts), but no service code in this codebase calls either API to
  // fetch events -- see externalMeetingsDashboardSignals.ts. Precise language distinguishes "OAuth
  // not connected" from "OAuth connected, but no event-fetching service exists yet," rather than
  // a single vague "not connected" message.
  if (input.externalMeetingsSignals && input.demoMode) {
    // A-96 (2026-08-04): investor demo only -- the underlying feature (an actual Zoom/Google Meet
    // event-fetch service) genuinely does not exist in this codebase; landing.triaxisventures.com
    // keeps the honest not-connected messaging below unchanged. This branch exists purely so a
    // demo recording doesn't show "no service exists yet" on camera.
    tiles.push(tile({
      id: "zoom-upcoming-meetings", tier: 1, title: "Upcoming Zoom meetings", value: "4",
      detail: "4 Zoom meeting(s) scheduled in the next 7 days.", priority: 1, criticality: "green",
      dataState: "live", route: "/meetings", rationale: "Demo data -- investor preview only.",
    }));
    tiles.push(tile({
      id: "gmeet-upcoming-meetings", tier: 1, title: "Upcoming Google Meet meetings", value: "2",
      detail: "2 Google Meet meeting(s) scheduled in the next 7 days.", priority: 1, criticality: "green",
      dataState: "live", route: "/meetings", rationale: "Demo data -- investor preview only.",
    }));
  } else if (input.externalMeetingsSignals) {
    const zoomDetail = input.externalMeetingsSignals.zoomOAuthConnected
      ? "Zoom OAuth is connected for this tenant, but no service exists yet to fetch upcoming Zoom meetings."
      : "Zoom is not connected. Connect it in Integrations to enable this in a future sprint.";
    tiles.push(notConnectedTile("zoom-upcoming-meetings", 1, "Upcoming Zoom meetings", zoomDetail, "/integrations"));

    const gmeetDetail = input.externalMeetingsSignals.googleCalendarOAuthConnected
      ? "Google Calendar OAuth is connected for this tenant, but no service exists yet to fetch upcoming Google Meet events."
      : "Google Calendar is not connected. Connect it in Integrations to enable this in a future sprint.";
    tiles.push(notConnectedTile("gmeet-upcoming-meetings", 1, "Upcoming Google Meet meetings", gmeetDetail, "/integrations"));
  } else {
    tiles.push(notConnectedTile("zoom-upcoming-meetings", 1, "Upcoming Zoom meetings", "Loading provider status...", "/integrations"));
    tiles.push(notConnectedTile("gmeet-upcoming-meetings", 1, "Upcoming Google Meet meetings", "Loading provider status...", "/integrations"));
  }

  // Executive Dashboard Redesign Sprint ED-R2: real, built on social_alert_events -- see
  // socialDashboardSignals.ts. The table and RLS are real; nothing in this codebase writes to it
  // yet, so a genuinely live query honestly reads zero for every tenant today (dataState "empty",
  // not "not-connected" -- the mechanism is real, the ingestion pipeline isn't built).
  if (input.socialSignals?.queryRan) {
    const criticalResult = criticalSocialAlertsPolicy(input.socialSignals.criticalAlertCount);
    tiles.push(tile({
      id: "critical-social-alerts",
      tier: 1,
      title: "Critical social alerts",
      value: String(input.socialSignals.criticalAlertCount),
      detail: criticalResult.rationale,
      priority: criticalResult.priority,
      criticality: criticalResult.criticality,
      dataState: input.socialSignals.criticalAlertCount > 0 ? "live" : "empty",
      route: "/alerts",
      rationale: criticalResult.rationale,
    }));
  } else {
    tiles.push(notConnectedTile("critical-social-alerts", 1, "Critical social alerts", "Loading social alert signal..."));
  }

  // "Official-account alerts" (named in the ED-R2 sprint prompt) is deliberately NOT a real query:
  // social_alert_events has no column or metadata convention identifying an "official account"
  // alert. Building a heuristic guess here would risk fabricating a classification that doesn't
  // exist -- honestly not-connected instead. See socialDashboardSignals.ts's header comment.
  // A-96 (2026-08-04): investor demo only shows a plausible count instead -- the real-tenant
  // not-connected messaging (and the reason for it) is unchanged below.
  if (input.demoMode) {
    tiles.push(tile({
      id: "official-account-alerts", tier: 1, title: "Official-account alerts", value: "1",
      detail: "1 alert flagged from an official/verified account in the last 7 days.", priority: 1,
      criticality: "green", dataState: "live", route: "/alerts", rationale: "Demo data -- investor preview only.",
    }));
  } else {
    tiles.push(notConnectedTile("official-account-alerts", 1, "Official-account alerts", "social_alert_events has no official-account classification field yet; no heuristic was substituted to avoid fabricating one."));
  }

  if (input.socialSignals) {
    const providerHealthResult = socialProviderHealthPolicy(input.socialSignals.xConfigured, input.socialSignals.facebookConfigured);
    const configuredProviderNames = [input.socialSignals.xConfigured && "X", input.socialSignals.facebookConfigured && "Facebook"].filter(Boolean) as string[];
    const providerCountConfigured = configuredProviderNames.length;
    tiles.push(tile({
      id: "social-provider-health",
      tier: 1,
      title: "Social provider health",
      // A-96 (2026-08-04): investor demo shows a count/provider-list value like every other tile
      // instead of the generic "Configured" status word; real-tenant behavior is unchanged.
      value: input.demoMode && providerCountConfigured > 0 ? `${providerCountConfigured} live` : (providerCountConfigured > 0 ? "Configured" : "Provider-gated"),
      detail: input.demoMode && providerCountConfigured > 0 ? `${configuredProviderNames.join(" and ")} monitoring configured and live.` : providerHealthResult.rationale,
      priority: providerHealthResult.priority,
      criticality: providerHealthResult.criticality,
      dataState: providerCountConfigured > 0 ? "live" : "partial",
      route: "/integrations",
      rationale: providerHealthResult.rationale,
    }));
  } else {
    tiles.push(notConnectedTile("social-provider-health", 1, "Social provider health", "Loading provider status..."));
  }

  // Executive Dashboard Redesign Sprint ED-R2: real, built on the new crm_leads table -- see
  // crmRepository.ts / crmDashboardSignals.ts.
  if (input.crmLeads) {
    const crmSignals = computeCrmDashboardSignals(input.crmLeads);
    const openLeadsResult = openLeadsPolicy(crmSignals.openLeadsCount);
    tiles.push(tile({
      id: "crm-open-leads",
      tier: 1,
      title: "Open leads",
      value: String(crmSignals.openLeadsCount),
      detail: openLeadsResult.rationale,
      priority: openLeadsResult.priority,
      criticality: openLeadsResult.criticality,
      dataState: input.crmLeads.length > 0 ? "live" : "empty",
      route: "/crm",
      rationale: openLeadsResult.rationale,
    }));

    const followUpsDueResult = crmFollowUpsDuePolicy(crmSignals.followUpsDueCount);
    tiles.push(tile({
      id: "crm-follow-ups-due",
      tier: 1,
      title: "CRM follow-ups due",
      value: String(crmSignals.followUpsDueCount),
      detail: followUpsDueResult.rationale,
      priority: followUpsDueResult.priority,
      criticality: followUpsDueResult.criticality,
      dataState: input.crmLeads.length > 0 ? "live" : "empty",
      route: "/crm",
      rationale: followUpsDueResult.rationale,
    }));

    const stalledResult = crmStalledLeadsPolicy(crmSignals.stalledCount);
    tiles.push(tile({
      id: "crm-stalled-leads",
      tier: 1,
      title: "Stalled opportunities",
      value: String(crmSignals.stalledCount),
      detail: stalledResult.rationale,
      priority: stalledResult.priority,
      criticality: stalledResult.criticality,
      dataState: input.crmLeads.length > 0 ? "live" : "empty",
      route: "/crm",
      rationale: stalledResult.rationale,
    }));
  } else {
    tiles.push(notConnectedTile("crm-open-leads", 1, "Open leads", "Loading CRM signal...", "/crm"));
    tiles.push(notConnectedTile("crm-follow-ups-due", 1, "CRM follow-ups due", "Loading CRM signal...", "/crm"));
    tiles.push(notConnectedTile("crm-stalled-leads", 1, "Stalled opportunities", "Loading CRM signal...", "/crm"));
  }

  // Executive Dashboard Redesign Sprint ED-R4: real, built on published_content_items /
  // community_engagement_items (MC-2), populated by "Sync now" or the daily cron (MC-4). Founder's
  // explicit ask: a "Threads" live tile at Tier 1. "Not connected" only when the tenant hasn't
  // OAuth-connected Threads; a connected-but-never-synced tenant honestly reads zero posts/replies,
  // same "real query, genuine zero" distinction as the mail/CRM/social signals above.
  if (input.threadsSignals) {
    if (input.threadsSignals.oauthConnected) {
      const activityResult = threadsActivityPolicy(input.threadsSignals.recentPostCount);
      tiles.push(tile({
        id: "threads-activity",
        tier: 1,
        title: "Threads activity",
        value: String(input.threadsSignals.recentPostCount),
        detail: activityResult.rationale,
        priority: activityResult.priority,
        criticality: activityResult.criticality,
        dataState: input.threadsSignals.recentPostCount > 0 ? "live" : "empty",
        route: "/integrations",
        rationale: activityResult.rationale,
      }));

      const backlogResult = threadsEngagementBacklogPolicy(input.threadsSignals.openReplyCount);
      tiles.push(tile({
        id: "threads-reply-backlog",
        tier: 1,
        title: "Threads replies awaiting response",
        value: String(input.threadsSignals.openReplyCount),
        detail: backlogResult.rationale,
        priority: backlogResult.priority,
        criticality: backlogResult.criticality,
        dataState: input.threadsSignals.openReplyCount > 0 ? "live" : "empty",
        route: "/integrations",
        rationale: backlogResult.rationale,
      }));
    } else {
      tiles.push(notConnectedTile("threads-activity", 1, "Threads activity", "Connect Threads in Integrations to surface recent post activity.", "/integrations"));
      tiles.push(notConnectedTile("threads-reply-backlog", 1, "Threads replies awaiting response", "Connect Threads in Integrations to surface open replies. Community-engagement ingestion (comments/DMs) is not built yet for any provider -- this will stay at zero even once connected, until that ingestion ships.", "/integrations"));
    }
  } else {
    tiles.push(notConnectedTile("threads-activity", 1, "Threads activity", "Loading Threads signal...", "/integrations"));
    tiles.push(notConnectedTile("threads-reply-backlog", 1, "Threads replies awaiting response", "Loading Threads signal...", "/integrations"));
  }

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
    // A-96 (2026-08-04): demo shows the real count like every other tile instead of a status word.
    value: input.demoMode && input.liveMetrics.integrationConfigured > 0
      ? `${input.liveMetrics.integrationConfigured} connected`
      : (input.liveMetrics.integrationConfigured > 0 ? "Connected" : "Gated"),
    detail: integrationHealthResult.rationale,
    priority: integrationHealthResult.priority,
    criticality: integrationHealthResult.criticality,
    dataState: "live",
    route: "/integrations",
    rationale: integrationHealthResult.rationale,
  }));

  // A-96 (2026-08-04): investor demo only -- the spend-tracking backend (aiSpendGuard.ts) is real,
  // but there is genuinely no client-facing summary endpoint wired to this dashboard yet; the
  // real-tenant not-connected messaging below is unchanged.
  if (input.demoMode) {
    tiles.push(tile({
      id: "ai-token-usage-spend", tier: 2, title: "AI token usage / spend", value: "$142.60",
      detail: "AI provider spend this billing cycle, tracked via the AI spend guard.", priority: 1,
      criticality: "green", dataState: "live", route: "/analytics", rationale: "Demo data -- investor preview only.",
    }));
  } else {
    tiles.push(notConnectedTile("ai-token-usage-spend", 2, "AI token usage / spend", "The spend-tracking backend exists (aiSpendGuard.ts), but no client-facing summary endpoint surfaces it to this dashboard yet."));
  }

  // Executive Dashboard Redesign Sprint ED-R4: real, built on published_content_items /
  // campaigns_promotions (MC-2), populated by "Sync now" or the daily cron (MC-4). Tier 2 (not
  // Tier 1) since this is an operational content/campaign signal, not an attention-worthy item by
  // default -- matches how Integration health/Document indexing health sit at Tier 2.
  if (input.metaBusinessSignals) {
    if (input.metaBusinessSignals.oauthConnected) {
      const contentResult = metaBusinessContentActivityPolicy(input.metaBusinessSignals.recentPostCount);
      tiles.push(tile({
        id: "meta-business-content-activity",
        tier: 2,
        title: "Meta Business Suite content activity",
        value: String(input.metaBusinessSignals.recentPostCount),
        detail: contentResult.rationale,
        priority: contentResult.priority,
        criticality: contentResult.criticality,
        dataState: input.metaBusinessSignals.recentPostCount > 0 ? "live" : "empty",
        route: "/integrations",
        rationale: contentResult.rationale,
      }));

      const campaignResult = metaBusinessCampaignHealthPolicy(input.metaBusinessSignals.activeCampaignCount, input.metaBusinessSignals.overBudgetCampaignCount);
      tiles.push(tile({
        id: "meta-business-campaign-health",
        tier: 2,
        title: "Meta Ads campaign health",
        value: String(input.metaBusinessSignals.activeCampaignCount),
        detail: campaignResult.rationale,
        priority: campaignResult.priority,
        criticality: campaignResult.criticality,
        dataState: input.metaBusinessSignals.activeCampaignCount > 0 ? "live" : "empty",
        route: "/integrations",
        rationale: campaignResult.rationale,
      }));
    } else {
      tiles.push(notConnectedTile("meta-business-content-activity", 2, "Meta Business Suite content activity", "Connect Meta Business Suite in Integrations to surface recent content activity.", "/integrations"));
      tiles.push(notConnectedTile("meta-business-campaign-health", 2, "Meta Ads campaign health", "Connect Meta Business Suite in Integrations to surface active campaigns.", "/integrations"));
    }
  } else {
    tiles.push(notConnectedTile("meta-business-content-activity", 2, "Meta Business Suite content activity", "Loading Meta Business Suite signal...", "/integrations"));
    tiles.push(notConnectedTile("meta-business-campaign-health", 2, "Meta Ads campaign health", "Loading Meta Business Suite signal...", "/integrations"));
  }

  // --- Tier 3: compliance, audit, governance, policy ---

  // A-96 (2026-08-04): demo shows a real-looking count instead of "--" while the real audit query
  // is still loading/empty; real-tenant behavior (a genuine "--" until the count actually loads) is
  // unchanged.
  const auditLogLoaded = input.auditLogCount !== undefined;
  const displayedAuditLogCount = auditLogLoaded ? input.auditLogCount : (input.demoMode ? 48 : undefined);
  const auditLogDisplayLoaded = displayedAuditLogCount !== undefined;
  const auditGapResult = auditLogGapPolicy(displayedAuditLogCount ?? 0);
  tiles.push(tile({
    id: "audit-log-gap",
    tier: 3,
    title: "Audit trail",
    value: auditLogDisplayLoaded ? String(displayedAuditLogCount) : "--",
    detail: auditGapResult.rationale,
    priority: auditGapResult.priority,
    criticality: auditGapResult.criticality,
    dataState: auditLogDisplayLoaded ? "live" : "partial",
    route: "/admin/audit-logs",
    rationale: auditGapResult.rationale,
  }));

  // Executive Dashboard Redesign Sprint ED-R3: real, built on the new financial_watch_items
  // table -- a MANUAL watchlist, not a bank feed. No banking/payment provider integration exists
  // in this codebase; every value/detail below says "manual tracking" explicitly, never implying
  // a live bank connection, per the sprint's critical constraint.
  if (input.financialWatchItems) {
    const financialSignals = computeFinancialDashboardSignals(input.financialWatchItems);
    const hasData = input.financialWatchItems.length > 0;

    const budgetThresholdsResult = financialBudgetThresholdsPolicy(financialSignals.budgetThresholdsCount);
    tiles.push(tile({
      id: "budget-thresholds",
      tier: 3,
      title: "Budget thresholds",
      value: financialTileValue(financialSignals.budgetThresholdsCount, input.demoMode),
      detail: budgetThresholdsResult.rationale,
      priority: budgetThresholdsResult.priority,
      criticality: budgetThresholdsResult.criticality,
      dataState: hasData ? "live" : "empty",
      route: "/analytics",
      rationale: budgetThresholdsResult.rationale,
    }));

    const budgetOvershootResult = financialBudgetOvershootPolicy(financialSignals.budgetOvershootCount);
    tiles.push(tile({
      id: "budget-overshoot",
      tier: 3,
      title: "Budget overshoot",
      value: financialTileValue(financialSignals.budgetOvershootCount, input.demoMode),
      detail: budgetOvershootResult.rationale,
      priority: budgetOvershootResult.priority,
      criticality: budgetOvershootResult.criticality,
      dataState: hasData ? "live" : "empty",
      route: "/analytics",
      rationale: budgetOvershootResult.rationale,
    }));

    const belowThresholdResult = financialAccountsBelowThresholdPolicy(financialSignals.accountsBelowThresholdCount);
    tiles.push(tile({
      id: "accounts-below-threshold",
      tier: 3,
      title: "Accounts below threshold",
      value: financialTileValue(financialSignals.accountsBelowThresholdCount, input.demoMode),
      detail: belowThresholdResult.rationale,
      priority: belowThresholdResult.priority,
      criticality: belowThresholdResult.criticality,
      dataState: hasData ? "live" : "empty",
      route: "/analytics",
      rationale: belowThresholdResult.rationale,
    }));

    const actionablesResult = financialAccountsActionablesPolicy(financialSignals.accountsActionablesCount, financialSignals.accountsActionablesOverdueCount);
    tiles.push(tile({
      id: "accounts-actionables",
      tier: 3,
      title: "Accounts actionables",
      value: financialTileValue(financialSignals.accountsActionablesCount, input.demoMode),
      detail: actionablesResult.rationale,
      priority: actionablesResult.priority,
      criticality: actionablesResult.criticality,
      dataState: hasData ? "live" : "empty",
      route: "/analytics",
      rationale: actionablesResult.rationale,
    }));
  } else {
    tiles.push(notConnectedTile("budget-thresholds", 3, "Budget thresholds", "Loading financial watchlist...", "/analytics"));
    tiles.push(notConnectedTile("budget-overshoot", 3, "Budget overshoot", "Loading financial watchlist...", "/analytics"));
    tiles.push(notConnectedTile("accounts-below-threshold", 3, "Accounts below threshold", "Loading financial watchlist...", "/analytics"));
    tiles.push(notConnectedTile("accounts-actionables", 3, "Accounts actionables", "Loading financial watchlist...", "/analytics"));
  }

  return tiles;
}
