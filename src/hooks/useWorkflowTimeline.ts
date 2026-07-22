import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";
import {
  fallbackWorkflowTimelineEvents,
  type WorkflowTimelineEvent,
  type WorkflowTimelineResourceType,
} from "../services/workflows/workflowEvidence";
import { isDemoModeEnabled } from "../demo/demoMode";

type TimelineResponse = {
  timeline?: WorkflowTimelineEvent[];
  error?: string;
};

export function useWorkflowTimeline(
  scope?: TenantScope,
  options: { limit?: number; resourceType?: WorkflowTimelineResourceType; resourceId?: string } = {},
) {
  const [timeline, setTimeline] = useState<WorkflowTimelineEvent[]>(() => isDemoModeEnabled() ? fallbackWorkflowTimelineEvents(scope?.organizationId ?? "demo-tenant") : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: String(options.limit ?? 12) });
    if (options.resourceType) params.set("resourceType", options.resourceType);
    if (options.resourceId) params.set("resourceId", options.resourceId);

    const demoMode = isDemoModeEnabled();
    const limit = options.limit ?? 12;
    setTimeline(demoMode ? fallbackWorkflowTimelineEvents(scope.organizationId).slice(0, limit) : []);
    setLoading(true);
    fetch(`/api/workflows/timeline?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as TimelineResponse;
        if (!response.ok) throw new Error(payload.error ?? "Workflow timeline could not be loaded.");
        setTimeline(payload.timeline?.length ? payload.timeline : demoMode ? fallbackWorkflowTimelineEvents(scope.organizationId).slice(0, limit) : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTimeline(demoMode ? fallbackWorkflowTimelineEvents(scope.organizationId).slice(0, limit) : []);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [options.limit, options.resourceId, options.resourceType, scope?.organizationId]);

  return { timeline, loading };
}
