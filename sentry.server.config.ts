import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  includeLocalVariables: true,
  enableLogs: true,
  // TEMPORARY (2026-08-20): tracing spans reach Sentry from production but the error event from
  // /api/sentry-test-error does not (confirmed via a direct repeat test + fresh vercel logs pull --
  // the request throws and returns 500 as expected, but no matching Sentry-side send/failure log
  // exists to explain why). debug:true is Sentry's own documented first troubleshooting step for
  // exactly this symptom (SDK docs troubleshooting table: "Events not appearing -- DSN misconfigured
  // or debug:false hiding errors -- Set debug:true temporarily"). Remove once the cause is found.
  debug: true,
});
