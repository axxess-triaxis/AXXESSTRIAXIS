import { useEffect, useState } from "react";

const TABLET_BREAKPOINT = 768;

// MN-2 (2026-08-23): reuses the same 768px threshold src/app/components/ui/use-mobile.ts's
// useIsMobile() already established for this codebase, just inverted in purpose -- inside
// MobileShell (which only ever renders at all once isNativeMobileSurface() is true, see MN-1),
// a viewport at or above this width means "tablet-sized Capacitor app," which the roadmap
// checklist requires a two-pane list/detail layout for on Tasks, Approvals, Knowledge, and CRM.
// SSR-safe default (false) matching every other window-dependent hook in this codebase.
export function useMobileTabletLayout(): boolean {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`);
    const onChange = () => setIsTablet(window.innerWidth >= TABLET_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsTablet(window.innerWidth >= TABLET_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isTablet;
}
