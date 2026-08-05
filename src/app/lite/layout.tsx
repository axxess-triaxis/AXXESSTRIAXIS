import type { ReactNode } from "react";
import { AuthProvider } from "../../auth/AuthProvider";
import { LiteShell } from "../../features/lite/LiteShell";
import { AnalyticsProviderShell } from "../../services/analytics";

// XL-1 (2026-08-05): the AXXESS Lite route tree's own layout. This does NOT render
// workspace-page.tsx/App.tsx (X0's shared SPA shell) -- it reuses only the shared-core auth and
// analytics providers (per docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md
// Section 4) and wraps everything in AXXESS Lite's own, much smaller LiteShell instead of
// AppShell/Sidebar/TopBar.
export default function LiteLayout({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProviderShell>
      <AuthProvider>
        <LiteShell>{children}</LiteShell>
      </AuthProvider>
    </AnalyticsProviderShell>
  );
}
