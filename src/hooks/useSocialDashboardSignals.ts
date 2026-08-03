import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import type { SocialDashboardSignals } from "../services/dashboard/socialDashboardSignals";

export function useSocialDashboardSignals(scope?: TenantScope, refreshToken = 0) {
  const [signals, setSignals] = useState<SocialDashboardSignals | undefined>(undefined);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/dashboard/social-signals", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => undefined) as SocialDashboardSignals | undefined;
        if (payload) setSignals(payload);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return signals;
}
