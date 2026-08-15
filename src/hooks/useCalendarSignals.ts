import { useEffect, useState } from "react";
import { demoCalendarSignals } from "../demo/demoDashboardSignals";
import { isDemoModeEnabled } from "../demo/demoMode";
import type { TenantScope } from "../repositories/interfaces";
import { computeCalendarDashboardSignals, type CalendarDashboardSignals } from "../services/dashboard/calendarDashboardSignals";
import { getSharedMeetingsList } from "./meetingsListCache";

// Executive Dashboard Redesign Sprint ED-R3, shared-fetch fix A-20 (2026-08-15). Same generic,
// authenticated, tenant-scoped GET /api/repositories/meetings endpoint used by
// useOverdueMeetingCount.ts -- previously fetched separately here (a documented, deliberate
// duplicate). Now shares one in-flight/cached fetch via meetingsListCache.ts instead, matching
// useLiveWorkspaceMetrics.ts's own consumer pattern for its shared cache -- no AbortController
// (a shared fetch can't be cancelled per-consumer), just a `mounted` flag guarding the state
// update. undefined until the first successful fetch.
export function useCalendarSignals(scope?: TenantScope, refreshToken = 0) {
  const [signals, setSignals] = useState<CalendarDashboardSignals | undefined>(undefined);

  useEffect(() => {
    // A-91: investor.triaxisventures.com only -- see useMailDashboardSignals.ts's comment.
    if (isDemoModeEnabled()) {
      setSignals(demoCalendarSignals);
      return;
    }
    if (!scope?.organizationId) return;
    let mounted = true;
    getSharedMeetingsList(scope)
      .then((rows) => { if (mounted) setSignals(computeCalendarDashboardSignals(rows)); })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [scope, refreshToken]);

  return signals;
}
