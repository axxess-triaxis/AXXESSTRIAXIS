import { useEffect, useState } from "react";
import { demoExternalMeetingsSignals } from "../demo/demoDashboardSignals";
import { isDemoModeEnabled } from "../demo/demoMode";
import type { TenantScope } from "../repositories/interfaces";
import type { ExternalMeetingsDashboardSignals } from "../services/dashboard/externalMeetingsDashboardSignals";

export function useExternalMeetingsSignals(scope?: TenantScope, refreshToken = 0) {
  const [signals, setSignals] = useState<ExternalMeetingsDashboardSignals | undefined>(undefined);

  useEffect(() => {
    // A-91: investor.triaxisventures.com only -- see useMailDashboardSignals.ts's comment.
    if (isDemoModeEnabled()) {
      setSignals(demoExternalMeetingsSignals);
      return;
    }
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/dashboard/external-meetings-signals", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => undefined) as ExternalMeetingsDashboardSignals | undefined;
        if (payload) setSignals(payload);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return signals;
}
