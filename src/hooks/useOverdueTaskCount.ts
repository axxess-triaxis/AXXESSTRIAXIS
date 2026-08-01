import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import type { Task } from "../domain";

// Executive Dashboard Redesign Sprint ED-R1: a real count of this tenant's open tasks whose
// dueDate has passed, from the same generic, authenticated, tenant-scoped
// GET /api/repositories/tasks endpoint used elsewhere (see useAuditLogCount.ts for the identical
// pattern). Undefined until the first successful fetch, so callers can distinguish "not loaded
// yet" from "genuinely zero overdue tasks."
export function useOverdueTaskCount(scope?: TenantScope, refreshToken = 0) {
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/repositories/tasks?pageSize=500", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const rows = await response.json().catch(() => undefined) as Task[] | undefined;
        if (!Array.isArray(rows)) return;
        const now = Date.now();
        const overdue = rows.filter((task) => task.status !== "completed" && task.dueDate && new Date(task.dueDate).getTime() < now);
        setCount(overdue.length);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return count;
}
