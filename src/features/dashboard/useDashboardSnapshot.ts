// A-96 (2026-08-04): extracted from DashboardSection.tsx so the same real Priority x Criticality
// scored-tile stack (Tier 1/2/3, see docs/readiness/EXECUTIVE_DASHBOARD_REDESIGN_PLAN_2026_08_01.md)
// can be reused on the Analytics page too, per the founder's direction that Analytics should share
// "almost fully similar" logic with the Executive Dashboard rather than a second, parallel
// implementation. Every hook call here is identical to what DashboardSection.tsx called inline
// before this extraction -- no new data source, no behavior change for the Executive Dashboard.
import { useMemo } from "react";
import { isDemoModeEnabled } from "../../demo/demoMode";
import type { TenantScope } from "../../repositories/interfaces";
import { useAuditLogCount } from "../../hooks/useAuditLogCount";
import { useCalendarSignals } from "../../hooks/useCalendarSignals";
import { useCrmLeads } from "../../hooks/useCrmLeads";
import { useExternalMeetingsSignals } from "../../hooks/useExternalMeetingsSignals";
import { useFinancialWatchItems } from "../../hooks/useFinancialWatchItems";
import { useLiveWorkspaceMetrics } from "../../hooks/useLiveWorkspaceMetrics";
import { useMailDashboardSignals } from "../../hooks/useMailDashboardSignals";
import { useMetaBusinessDashboardSignals } from "../../hooks/useMetaBusinessDashboardSignals";
import { useOverdueMeetingCount } from "../../hooks/useOverdueMeetingCount";
import { useOverdueTaskCount } from "../../hooks/useOverdueTaskCount";
import { usePendingAiReviewCount } from "../../hooks/usePendingAiReviewCount";
import { useSocialAlertsStatus } from "../../hooks/useSocialAlertsStatus";
import { useSocialDashboardSignals } from "../../hooks/useSocialDashboardSignals";
import { useThreadsDashboardSignals } from "../../hooks/useThreadsDashboardSignals";
import { useWorkflowTimeline } from "../../hooks/useWorkflowTimeline";
import { buildDashboardSnapshot } from "../../services/dashboard/buildDashboardSnapshot";

export function useDashboardSnapshot(
  tenantScope: TenantScope | undefined,
  refreshToken: number,
  projects: Array<{ risk: string }>,
) {
  const liveMetrics = useLiveWorkspaceMetrics(tenantScope, refreshToken);
  const pendingAiReviewCount = usePendingAiReviewCount(tenantScope, refreshToken);
  const socialAlertsStatus = useSocialAlertsStatus(tenantScope);
  const auditLogCount = useAuditLogCount(tenantScope, refreshToken);
  const workflowTimeline = useWorkflowTimeline(tenantScope, { limit: 6, refreshToken });
  const overdueTaskCount = useOverdueTaskCount(tenantScope, refreshToken);
  const overdueMeetingCount = useOverdueMeetingCount(tenantScope, refreshToken);
  const mailSignals = useMailDashboardSignals(tenantScope, refreshToken);
  const crmLeads = useCrmLeads(tenantScope, refreshToken);
  const socialSignals = useSocialDashboardSignals(tenantScope, refreshToken);
  const calendarSignals = useCalendarSignals(tenantScope, refreshToken);
  const externalMeetingsSignals = useExternalMeetingsSignals(tenantScope, refreshToken);
  const financialWatchItems = useFinancialWatchItems(tenantScope, refreshToken);
  const threadsSignals = useThreadsDashboardSignals(tenantScope, refreshToken);
  const metaBusinessSignals = useMetaBusinessDashboardSignals(tenantScope, refreshToken);

  const snapshot = useMemo(
    () => buildDashboardSnapshot({
      liveMetrics,
      overdueTaskCount,
      overdueMeetingCount,
      pendingAiReviewCount,
      auditLogCount,
      socialAlertsAnyLiveProviderConfigured: socialAlertsStatus.anyLiveProviderConfigured,
      workflowTimelineEventCount: workflowTimeline.timeline.length,
      projects,
      demoMode: isDemoModeEnabled(),
      mailSignals,
      crmLeads,
      socialSignals,
      calendarSignals,
      externalMeetingsSignals,
      financialWatchItems,
      threadsSignals,
      metaBusinessSignals,
    }),
    [liveMetrics, overdueTaskCount, overdueMeetingCount, pendingAiReviewCount, auditLogCount, socialAlertsStatus.anyLiveProviderConfigured, workflowTimeline.timeline.length, projects, mailSignals, crmLeads, socialSignals, calendarSignals, externalMeetingsSignals, financialWatchItems, threadsSignals, metaBusinessSignals],
  );

  // A-110 (2026-08-09): overdueTaskCount/overdueMeetingCount were already computed above for the
  // tile-scoring snapshot -- now also returned so the Executive Dashboard's Actionables sub-section
  // can compose them without a duplicate fetch.
  return { snapshot, liveMetrics, pendingAiReviewCount, auditLogCount, workflowTimeline, overdueTaskCount, overdueMeetingCount };
}
