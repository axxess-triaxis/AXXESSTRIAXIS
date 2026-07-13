import { useEffect, useState } from "react";
import { applicationServices } from "../providers/serviceProvider";
import type { TenantScope } from "../repositories/interfaces";
import { getFallbackLiveWorkspaceMetrics, getLiveWorkspaceMetrics, type LiveWorkspaceMetrics } from "../services/live-platform/livePlatform";

export function useLiveWorkspaceMetrics(scope?: TenantScope) {
  const [metrics, setMetrics] = useState<LiveWorkspaceMetrics>(() => getFallbackLiveWorkspaceMetrics());

  useEffect(() => {
    if (!scope) return;
    let mounted = true;
    void getLiveWorkspaceMetrics(applicationServices, scope)
      .then((value) => { if (mounted) setMetrics(value); })
      .catch(() => { if (mounted) setMetrics(getFallbackLiveWorkspaceMetrics()); });
    return () => { mounted = false; };
  }, [scope]);

  return metrics;
}

