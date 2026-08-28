import { Suspense } from "react";
import { LiteIntegrationsSection } from "../../../../features/lite/sections/LiteIntegrationsSection";

// 2026-08-28: LiteIntegrationsSection calls useSearchParams() (to read ?provider=&status= after
// the OAuth redirect back from /api/connectors/oauth/callback) -- Next.js requires that be wrapped
// in a Suspense boundary for static generation, or the build fails outright on some deployments
// (confirmed live: investor.triaxisventures.com's production build failed with "useSearchParams()
// should be wrapped in a suspense boundary," which also cascaded into skipping the
// lite.triaxisventures.com deploy entirely in the same workflow run).
export default function LiteIntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <LiteIntegrationsSection />
    </Suspense>
  );
}
