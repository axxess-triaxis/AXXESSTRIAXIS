"use client";

import { useEffect, useState } from "react";
import { isNativeMobileSurface } from "./isNativeMobileSurface";

// MN-4 (2026-08-23): real offline-state detection via the Capacitor Network plugin's own bridge
// global (window.Capacitor.Plugins.Network), the same dependency-free pattern as
// isNativeMobileSurface.ts -- @capacitor/network is not a root src/ dependency. Starts `true`
// (assume online) so a slow/unresolved status check never falsely shows the offline banner; only
// flips to `false` on a real, confirmed disconnected status. A no-op (always reports online)
// outside the real Capacitor app, where the browser's own network handling already applies.
export function useMobileNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!isNativeMobileSurface()) return;
    const networkPlugin = window.Capacitor?.Plugins?.Network;
    if (!networkPlugin?.addListener) return;

    let handle: { remove: () => void } | undefined;
    let cancelled = false;

    networkPlugin.getStatus?.().then((status) => {
      if (!cancelled) setIsOnline(status.connected);
    });

    networkPlugin
      .addListener("networkStatusChange", (status) => setIsOnline(status.connected))
      .then((registered) => {
        if (cancelled) registered.remove();
        else handle = registered;
      });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);

  return isOnline;
}
