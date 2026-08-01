import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";

type SocialAlertsStatusResponse = { anyLiveProviderConfigured?: boolean };

// Executive Dashboard Sprint ED-2: real, server-evaluated provider-gated status for the External
// Signals tile, replacing a hardcoded 0 that could never reflect whether X/Facebook are actually
// connected. No live alert-count query exists yet (no repository sits on top of
// social_alert_events/social_alert_rules) -- an honest connected/not-connected status is the
// sanctioned outcome for this sprint, not a fabricated count.
export function useSocialAlertsStatus(scope?: TenantScope) {
  const [anyLiveProviderConfigured, setAnyLiveProviderConfigured] = useState(false);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/social-alerts/status", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({})) as SocialAlertsStatusResponse;
        setAnyLiveProviderConfigured(Boolean(payload.anyLiveProviderConfigured));
      })
      .catch(() => {
        if (!controller.signal.aborted) setAnyLiveProviderConfigured(false);
      });
    return () => controller.abort();
  }, [scope?.organizationId]);

  return { anyLiveProviderConfigured };
}
