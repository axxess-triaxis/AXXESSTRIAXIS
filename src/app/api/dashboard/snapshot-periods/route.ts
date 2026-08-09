import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { buildSnapshotPeriod, earliestTenantActivityDate, type SnapshotPeriodKey } from "../../../../services/dashboard/dashboardSnapshotPeriods";

// A-110 (2026-08-09): Daily/Weekly/Monthly Executive Dashboard snapshots. Server-side because
// buildSnapshotPeriod uses supabaseAdminRest (SUPABASE_SERVICE_ROLE_KEY, server-only), the same
// pattern every other src/services/dashboard/*Signals.ts service that talks to Supabase directly
// already uses. period=yoy is a distinct, lighter-weight query -- it never attempts a real
// comparison (no real tenant can have 12 months of history yet), only returns the tenant's real
// earliest recorded activity date, used to render an honest, tenant-specific empty state client-side.
export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const period = url.searchParams.get("period");
  if (period !== "daily" && period !== "weekly" && period !== "monthly" && period !== "yoy") {
    return NextResponse.json({ error: "Unknown period." }, { status: 400 });
  }

  if (period === "yoy") {
    const earliestActivityDate = await earliestTenantActivityDate(session.user.organizationId);
    return NextResponse.json({ earliestActivityDate });
  }

  const snapshot = await buildSnapshotPeriod(session.user.organizationId, period as Exclude<SnapshotPeriodKey, "yoy">);
  return NextResponse.json({ snapshot });
}
