import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";

// Executive Dashboard Sprint ED-2: a real count of this tenant's audit_logs rows, from the same
// generic, authenticated, tenant-scoped GET /api/repositories/audit_logs the rest of the app uses --
// replacing the "Audit readiness" tile's prior proxy heuristic (unread notifications OR onboarding
// completion >= 70%) with an actual measurement. Capped at pageSize; undefined until the first
// successful fetch, so callers can distinguish "not loaded yet" from "genuinely zero."
export function useAuditLogCount(scope?: TenantScope, refreshToken = 0) {
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/repositories/audit_logs?pageSize=500", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        // A non-ok response or network error means "we don't know," not "genuinely zero" -- leave
        // count as-is (undefined until a real answer arrives) rather than reporting a false zero.
        if (!response.ok) return;
        const rows = await response.json().catch(() => undefined) as unknown[] | undefined;
        if (Array.isArray(rows)) setCount(rows.length);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return count;
}
