import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import type { SnapshotPeriodResult } from "../services/dashboard/dashboardSnapshotPeriods";

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
export function useDashboardSnapshotPeriods(scope?: TenantScope, refreshToken = 0): DashboardSnapshotPeriods {
  const [periods, setPeriods] = useState<DashboardSnapshotPeriods>({});

  useEffect(() => {
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
  }, [scope?.organizationId, refreshToken]);

  return periods;
}
