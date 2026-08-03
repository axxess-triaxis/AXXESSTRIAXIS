import { useEffect, useState } from "react";
import type { FinancialWatchItem } from "../domain";
import type { TenantScope } from "../repositories/interfaces";

type FinancialWatchItemsResponse = { items?: FinancialWatchItem[] };

export function useFinancialWatchItems(scope?: TenantScope, refreshToken = 0) {
  const [items, setItems] = useState<FinancialWatchItem[] | undefined>(undefined);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/financial-watch", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
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
