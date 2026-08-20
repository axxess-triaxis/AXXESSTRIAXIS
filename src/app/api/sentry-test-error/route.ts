import * as Sentry from "@sentry/nextjs";

// TEMPORARY (2026-08-20): verifies the Sentry server-side wiring just added actually captures a
// real unhandled error through the app's own route-handler code path, not a standalone script that
// bypasses Sentry.init(). Delete this file once a real event is confirmed in the Sentry dashboard.
//
// TEMPORARY diagnostic (2026-08-20): onRequestError's automatic capture produced zero visible
// Sentry SDK output in `vercel logs` across multiple production hits, including with debug:true --
// every log line this session has ever surfaced from this app has been level:"error", suggesting
// console.log-based debug output may simply not reach the log stream. This manually calls
// captureException + flush and reports the *result* via console.error (which does reliably show
// up), to settle definitively whether the client is initialized and whether the send succeeds,
// rather than inferring from silence.
export async function GET() {
  const client = Sentry.getClient();
  console.error("[sentry-test-error] client initialized:", !!client, "dsn set:", !!process.env.SENTRY_DSN);
  const eventId = Sentry.captureException(new Error("Sentry test error -- delete me (src/app/api/sentry-test-error/route.ts) [manual capture]"));
  console.error("[sentry-test-error] captureException returned eventId:", eventId);
  const flushed = await Sentry.flush(5000);
  console.error("[sentry-test-error] flush() result:", flushed);
  throw new Error("Sentry test error -- delete me (src/app/api/sentry-test-error/route.ts)");
}
