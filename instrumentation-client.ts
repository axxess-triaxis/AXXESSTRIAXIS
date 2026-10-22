import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enableLogs: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

const token = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (!token) {
  // Warn, never throw: a throw here aborts client bootstrap, so the page renders server HTML but
  // never hydrates and every click is dead. That kept the Pilot Golden Path gate (dev server, no
  // PostHog key) red on main since this file was added -- ledger #77.
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This warning stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured",
    );
  }
} else {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
