import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import type { MetaBusinessDashboardSignals } from "../services/dashboard/metaBusinessDashboardSignals";

export function useMetaBusinessDashboardSignals(scope?: TenantScope, refreshToken = 0) {
  const [signals, setSignals] = useState<MetaBusinessDashboardSignals | undefined>(undefined);

  useEffect(() => {
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
