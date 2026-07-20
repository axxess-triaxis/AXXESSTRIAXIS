import { useEffect, useState } from "react";
import { applicationServices } from "../providers/serviceProvider";
import type { TenantScope } from "../repositories/interfaces";
import { isDemoModeEnabled } from "../demo/demoMode";
import { getFallbackLiveWorkspaceMetrics, getLiveWorkspaceMetrics, getZeroLiveWorkspaceMetrics, type LiveWorkspaceMetrics } from "../services/live-platform/livePlatform";

// getFallbackLiveWorkspaceMetrics() returns illustrative investor-demo numbers and must only ever
// be shown in demo mode. A real tenant sees genuinely zeroed metrics while data is loading or if a
// live fetch fails -- never fabricated numbers. See DEMO_DATA_LEAKAGE_AUDIT.md.
function initialMetrics(): LiveWorkspaceMetrics {
  return isDemoModeEnabled() ? getFallbackLiveWorkspaceMetrics() : getZeroLiveWorkspaceMetrics();
}

export function useLiveWorkspaceMetrics(scope?: TenantScope) {
  const [metrics, setMetrics] = useState<LiveWorkspaceMetrics>(() => initialMetrics());

  useEffect(() => {
    if (!scope) return;
    let mounted = true;
    void getLiveWorkspaceMetrics(applicationServices, scope)
      .then((value) => { if (mounted) setMetrics(value); })
      .catch(() => { if (mounted) setMetrics(initialMetrics()); });
    return () => { mounted = false; };
  }, [scope]);

  return metrics;
}

