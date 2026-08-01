import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import type { Meeting } from "../domain";

// Executive Dashboard Redesign Sprint ED-R1: a real count of this tenant's meetings that are
// still "scheduled" but whose startsAt has passed (i.e. missed -- never marked completed or
// cancelled), from the same generic, authenticated, tenant-scoped
// GET /api/repositories/meetings endpoint used elsewhere. Undefined until the first successful
// fetch, so callers can distinguish "not loaded yet" from "genuinely zero missed meetings."
export function useOverdueMeetingCount(scope?: TenantScope, refreshToken = 0) {
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/repositories/meetings?pageSize=500", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const rows = await response.json().catch(() => undefined) as Meeting[] | undefined;
        if (!Array.isArray(rows)) return;
        const now = Date.now();
        const missed = rows.filter((meeting) => meeting.status === "scheduled" && new Date(meeting.startsAt).getTime() < now);
        setCount(missed.length);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return count;
}
