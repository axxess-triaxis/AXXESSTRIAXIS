import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { getSocialAlertProviderStatus, socialAlertsEnabled } from "../../../../services/alerts/socialAlerts";

// Executive Dashboard Sprint ED-2: getSocialAlertProviderStatus()/socialAlertsEnabled() read real
// process.env provider credentials (X_BEARER_TOKEN, META_APP_ID, etc.) -- they must be evaluated
// server-side. AlertsSection.tsx currently calls them directly from a client component, where
// process.env is not the real server environment; this route is the correct place for the
// Dashboard's External Signals tile (and future callers) to get an accurate answer.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const providers = getSocialAlertProviderStatus();
  const anyLiveProviderConfigured = providers.some((provider) => (provider.provider === "x" || provider.provider === "facebook") && provider.configured);

  return NextResponse.json({
    enabled: socialAlertsEnabled(),
    providers,
    anyLiveProviderConfigured,
  });
}
