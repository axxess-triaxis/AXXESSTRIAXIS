"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { isNativeMobileSurface } from "../../features/mobile/isNativeMobileSurface";

// Separate from PostHogAnalyticsProvider.ts (this codebase's lightweight, event-only integration
// that POSTs directly to /capture/ with no SDK and no session data). This component adds the
// official posthog-js SDK specifically for autocapture and session replay -- a deliberate,
// founder-directed scope expansion (2026-07-27) for enterprise analytics, not a replacement for
// the existing event tracking. Both send to the same PostHog project via the same public token;
// they are complementary data streams (autocaptured UI interactions + session replay vs. named
// business events), not a conflict.
//
// Session replay records what's rendered on screen. PostHog masks form inputs by default (not
// disabled here); it does not automatically exclude rendered document/PII content elsewhere on
// screen. This product renders real institutional documents, stakeholder records, and audit data
// -- deciding whether specific screens need explicit replay exclusion is a product/compliance
// decision, not one this component makes for you.
//
// MN-5 (2026-08-23): that unresolved gap is exactly what Android Beta 0.9's mobile screens hit
// hardest -- Knowledge Hub renders document titles/summaries, Ask AI renders real answers and
// citation excerpts, Stakeholders renders names/notes, Approvals renders descriptions, all on
// screens with no per-route masking built. Rather than leaving replay running unmasked against
// that surface, it's disabled entirely inside the real Capacitor app (autocapture and named event
// tracking are unaffected -- both already go through sanitizeAnalyticsPayload). Desktop/web
// behavior is unchanged; this is a mobile-scoped hardening decision, not a broader privacy policy
// change this sprint wasn't asked to make.
export function PostHogSessionReplayInit() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!token || posthog.__loaded) return;

    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      defaults: "2026-05-30",
      disable_session_recording: isNativeMobileSurface(),
    });
  }, []);

  return null;
}
