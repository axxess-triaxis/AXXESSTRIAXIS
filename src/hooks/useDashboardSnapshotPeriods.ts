import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import { buildDemoSnapshotPeriod, demoYoyEarliestActivityDate, type SnapshotPeriodResult } from "../services/dashboard/dashboardSnapshotPeriods";

export type DashboardSnapshotPeriods = {
  daily?: SnapshotPeriodResult;
  weekly?: SnapshotPeriodResult;
  monthly?: SnapshotPeriodResult;
  /** Real, tenant-specific earliest recorded activity date -- used only to render the honest YoY
   * empty-state copy, never to attempt an actual year-over-year comparison. */
  yoyEarliestActivityDate?: string;
};

// A-110 (2026-08-09): same shape as useAuditLogCount.ts -- undefined until the first successful
// fetch, so the UI can distinguish "not loaded yet" from "genuinely zero." Fetches all 3 real
// periods plus the yoy earliest-activity-date lookup in parallel.
// demoMode (2026-08-14): the investor-demo persona has no real Supabase auth session, so the
// underlying /api/dashboard/snapshot-periods route (gated on getServerAuthSession) always
// returned 401 and this bar was stuck on "Loading..." forever -- see dashboardSnapshotPeriods.ts's
// buildDemoSnapshotPeriod for the fallback. Real-tenant behavior (the fetch path below) is
// unchanged when false.
export function useDashboardSnapshotPeriods(scope?: TenantScope, refreshToken = 0, demoMode = false): DashboardSnapshotPeriods {
  const [periods, setPeriods] = useState<DashboardSnapshotPeriods>({});

  useEffect(() => {
    if (demoMode) {
      setPeriods({
        daily: buildDemoSnapshotPeriod("daily"),
        weekly: buildDemoSnapshotPeriod("weekly"),
        monthly: buildDemoSnapshotPeriod("monthly"),
        yoyEarliestActivityDate: demoYoyEarliestActivityDate,
      });
      return;
    }

    if (!scope?.organizationId) return;
    const controller = new AbortController();

    (["daily", "weekly", "monthly"] as const).forEach((period) => {
      fetch(`/api/dashboard/snapshot-periods?period=${period}`, { credentials: "include", cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return;
          const payload = await response.json().catch(() => undefined) as { snapshot?: SnapshotPeriodResult } | undefined;
          if (payload?.snapshot) setPeriods((current) => ({ ...current, [period]: payload.snapshot }));
        })
        .catch(() => undefined);
    });

    fetch("/api/dashboard/snapshot-periods?period=yoy", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => undefined) as { earliestActivityDate?: string } | undefined;
        if (payload?.earliestActivityDate) setPeriods((current) => ({ ...current, yoyEarliestActivityDate: payload.earliestActivityDate }));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [scope?.organizationId, refreshToken, demoMode]);

  return periods;
}
