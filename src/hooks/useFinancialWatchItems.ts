import { useEffect, useState } from "react";
import type { FinancialWatchItem } from "../domain";
import { demoFinancialWatchItems } from "../demo/demoDashboardSignals";
import { isDemoModeEnabled } from "../demo/demoMode";
import type { TenantScope } from "../repositories/interfaces";

type FinancialWatchItemsResponse = { items?: FinancialWatchItem[] };

// undefined while loading, null when this role is refused.
export function useFinancialWatchItems(scope?: TenantScope, refreshToken = 0) {
  const [items, setItems] = useState<FinancialWatchItem[] | null | undefined>(undefined);

  useEffect(() => {
    // A-91: investor.triaxisventures.com only -- see useMailDashboardSignals.ts's comment.
    if (isDemoModeEnabled()) {
      setItems(demoFinancialWatchItems);
      return;
    }
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/financial-watch", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 403) {
          setItems(null);
          return;
        }
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({})) as FinancialWatchItemsResponse;
        setItems(payload.items ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setItems([]);
      });
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return items;
}
