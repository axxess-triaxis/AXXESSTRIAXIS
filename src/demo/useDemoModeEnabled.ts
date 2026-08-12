"use client";

import { useEffect, useState } from "react";
import { demoModeChangedEvent, demoResetEvent, isDemoModeEnabled, isDemoModeSsrSafe } from "./demoMode";

// Split out of demoMode.ts (2026-08-11): this was the only hook-based export in that module, but
// its top-level `react` import made Turbopack treat every plain, server-safe export in demoMode.ts
// (isDemoModeEnabled, getRuntimeMode, etc.) as client-only too, breaking server-only consumers
// (src/app/api/admin/customer-success/live-ops/route.ts, WorkflowRecordsPage.tsx) that only ever
// imported the hook-free functions. See "Turbopack build failed... You're importing a module that
// depends on useEffect into a React Server Component module" in the PR #221 build log.
//
// Hydration-safe replacement for calling isDemoModeEnabled() directly in a component's render body.
// Seeds state with the SSR-safe value (matching what the server actually rendered), then corrects to
// the real, localStorage-aware answer in an effect once the client has mounted -- the standard fix for
// this class of mismatch. Costs one extra render after mount for the narrow set of visitors whose
// answer actually differs (accepted trade-off: a brief content swap instead of a hydration crash).
// Also re-resolves on demoModeChangedEvent so an in-session demo-mode toggle still updates live.
export function useDemoModeEnabled(): boolean {
  const [enabled, setEnabled] = useState(isDemoModeSsrSafe);

  useEffect(() => {
    setEnabled(isDemoModeEnabled());
    function handleChange() {
      setEnabled(isDemoModeEnabled());
    }
    window.addEventListener(demoModeChangedEvent, handleChange);
    window.addEventListener(demoResetEvent, handleChange);
    return () => {
      window.removeEventListener(demoModeChangedEvent, handleChange);
      window.removeEventListener(demoResetEvent, handleChange);
    };
  }, []);

  return enabled;
}
