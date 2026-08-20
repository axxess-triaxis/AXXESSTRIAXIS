// TEMPORARY (2026-08-20): verifies the Sentry server-side wiring just added actually captures a
// real unhandled error through the app's own route-handler code path, not a standalone script that
// bypasses Sentry.init(). Delete this file once a real event is confirmed in the Sentry dashboard.
export async function GET() {
  throw new Error("Sentry test error -- delete me (src/app/api/sentry-test-error/route.ts)");
}
