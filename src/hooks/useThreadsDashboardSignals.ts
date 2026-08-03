import { useEffect, useState } from "react";
import { demoThreadsSignals } from "../demo/demoDashboardSignals";
import { isDemoModeEnabled } from "../demo/demoMode";
import type { TenantScope } from "../repositories/interfaces";
import type { ThreadsDashboardSignals } from "../services/dashboard/threadsDashboardSignals";

export function useThreadsDashboardSignals(scope?: TenantScope, refreshToken = 0) {
  const [signals, setSignals] = useState<ThreadsDashboardSignals | undefined>(undefined);

  useEffect(() => {
    // A-91: investor.triaxisventures.com only -- see useMailDashboardSignals.ts's comment.
    if (isDemoModeEnabled()) {
      setSignals(demoThreadsSignals);
      return;
    }
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/dashboard/threads-signals", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => undefined) as ThreadsDashboardSignals | undefined;
        if (payload) setSignals(payload);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return signals;
}
