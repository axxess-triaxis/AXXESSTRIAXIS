import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import { getSharedMeetingsList } from "./meetingsListCache";

// Executive Dashboard Redesign Sprint ED-R1, shared-fetch fix A-20 (2026-08-15): a real count of
// this tenant's meetings that are still "scheduled" but whose startsAt has passed (i.e. missed --
// never marked completed or cancelled), from the same generic, authenticated, tenant-scoped
// GET /api/repositories/meetings endpoint used elsewhere -- now shared via meetingsListCache.ts
// instead of its own independent fetch (see useCalendarSignals.ts's own comment for the same fix).
// Undefined until the first successful fetch, so callers can distinguish "not loaded yet" from
// "genuinely zero missed meetings."
export function useOverdueMeetingCount(scope?: TenantScope, refreshToken = 0) {
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!scope?.organizationId) return;
    let mounted = true;
    getSharedMeetingsList(scope)
      .then((rows) => {
        if (!mounted) return;
        const now = Date.now();
        const missed = rows.filter((meeting) => meeting.status === "scheduled" && new Date(meeting.startsAt).getTime() < now);
        setCount(missed.length);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [scope, refreshToken]);

  return count;
}
