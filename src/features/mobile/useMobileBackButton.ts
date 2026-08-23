"use client";

import { useEffect, useRef } from "react";
import { isNativeMobileSurface } from "./isNativeMobileSurface";
import { useMobileBackDispatch } from "./MobileBackHandlerContext";

// MN-4 (2026-08-23): Android hardware/software back-button handling, per the roadmap's own "Native
// Feel" checklist item ("Android back button handled") that MN-1/MN-2 explicitly left unchecked.
// Order of precedence on every back press, matching the sprint prompt's exact spec:
//   1. The currently-mounted screen's own registered handler (see MobileBackHandlerContext) --
//      e.g. a detail view closes back to its own list. If it reports it handled the press, stop.
//   2. Otherwise, if not already on the Home tab, go to Home (one step back up the tab hierarchy,
//      never a dead-end or blank screen).
//   3. Otherwise (already at Home, nothing left to pop) minimize the app via App.minimizeApp() --
//      Android's own recommended behavior for a root screen, not App.exitApp() (which force-kills
//      the process) and never anything that touches auth/session, so this can never cause an
//      accidental logout.
// Registers the native listener only inside the real Capacitor app (isNativeMobileSurface()) --
// this hook is a no-op everywhere else (desktop web, mobile web in a browser).
export function useMobileBackButton(isAtHome: boolean, goHome: () => void): void {
  const dispatch = useMobileBackDispatch();
  const stateRef = useRef({ isAtHome, goHome });
  stateRef.current = { isAtHome, goHome };

  useEffect(() => {
    if (!isNativeMobileSurface()) return;
    const appPlugin = window.Capacitor?.Plugins?.App;
    if (!appPlugin?.addListener) return;

    let handle: { remove: () => void } | undefined;
    let cancelled = false;

    appPlugin
      .addListener("backButton", () => {
        if (dispatch()) return;
        const { isAtHome: atHome, goHome: navigateHome } = stateRef.current;
        if (!atHome) {
          navigateHome();
          return;
        }
        void appPlugin.minimizeApp?.();
      })
      .then((registered) => {
        if (cancelled) registered.remove();
        else handle = registered;
      });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [dispatch]);
}
