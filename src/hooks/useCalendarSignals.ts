import { useEffect, useState } from "react";
import type { Meeting } from "../domain";
import { demoCalendarSignals } from "../demo/demoDashboardSignals";
import { isDemoModeEnabled } from "../demo/demoMode";
import type { TenantScope } from "../repositories/interfaces";
import { computeCalendarDashboardSignals, type CalendarDashboardSignals } from "../services/dashboard/calendarDashboardSignals";

// Executive Dashboard Redesign Sprint ED-R3. Same generic, authenticated, tenant-scoped
// GET /api/repositories/meetings endpoint used by useOverdueMeetingCount.ts, fetched separately
// here (a second call to the same endpoint) rather than refactoring that already-shipped ED-R1
// hook -- a deliberate, documented tradeoff to avoid destabilizing verified, deployed code for a
// minor efficiency gain. undefined until the first successful fetch.
export function useCalendarSignals(scope?: TenantScope, refreshToken = 0) {
  const [signals, setSignals] = useState<CalendarDashboardSignals | undefined>(undefined);

  useEffect(() => {
    // A-91: investor.triaxisventures.com only -- see useMailDashboardSignals.ts's comment.
    if (isDemoModeEnabled()) {
      setSignals(demoCalendarSignals);
      return;
    }
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/repositories/meetings?pageSize=500", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const rows = await response.json().catch(() => undefined) as Meeting[] | undefined;
        if (Array.isArray(rows)) setSignals(computeCalendarDashboardSignals(rows));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return signals;
}
