import { useEffect, useState } from "react";
import { demoMetaBusinessSignals } from "../demo/demoDashboardSignals";
import { isDemoModeEnabled } from "../demo/demoMode";
import type { TenantScope } from "../repositories/interfaces";
import type { MetaBusinessDashboardSignals } from "../services/dashboard/metaBusinessDashboardSignals";

export function useMetaBusinessDashboardSignals(scope?: TenantScope, refreshToken = 0) {
  const [signals, setSignals] = useState<MetaBusinessDashboardSignals | undefined>(undefined);

  useEffect(() => {
    // A-91: investor.triaxisventures.com only -- see useMailDashboardSignals.ts's comment.
    if (isDemoModeEnabled()) {
      setSignals(demoMetaBusinessSignals);
      return;
    }
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/dashboard/meta-business-signals", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => undefined) as MetaBusinessDashboardSignals | undefined;
        if (payload) setSignals(payload);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return signals;
}
