import { useEffect, useState } from "react";
import type { CrmLead } from "../domain";
import { demoCrmLeads } from "../demo/demoDashboardSignals";
import { isDemoModeEnabled } from "../demo/demoMode";
import type { TenantScope } from "../repositories/interfaces";

type CrmLeadsResponse = { leads?: CrmLead[] };

// undefined until the first successful fetch, so callers can distinguish "not loaded yet" from a
// genuinely empty pipeline.
export function useCrmLeads(scope?: TenantScope, refreshToken = 0) {
  const [leads, setLeads] = useState<CrmLead[] | undefined>(undefined);

  useEffect(() => {
    // A-91: investor.triaxisventures.com only -- see useMailDashboardSignals.ts's comment.
    if (isDemoModeEnabled()) {
      setLeads(demoCrmLeads);
      return;
    }
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/crm/leads", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({})) as CrmLeadsResponse;
        setLeads(payload.leads ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLeads([]);
      });
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return leads;
}
