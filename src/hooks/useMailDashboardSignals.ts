import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import type { MailDashboardSignals } from "../services/dashboard/mailDashboardSignals";

// Executive Dashboard Redesign Sprint ED-R2. undefined until the first successful fetch, so
// callers can distinguish "not loaded yet" from "genuinely zero" -- same pattern as
// useAuditLogCount.ts / useOverdueTaskCount.ts.
export function useMailDashboardSignals(scope?: TenantScope, refreshToken = 0) {
  const [signals, setSignals] = useState<MailDashboardSignals | undefined>(undefined);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/dashboard/mail-signals", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => undefined) as MailDashboardSignals | undefined;
        if (payload) setSignals(payload);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return signals;
}
