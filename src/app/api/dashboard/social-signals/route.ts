import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { getSocialDashboardSignals } from "../../../../services/dashboard/socialDashboardSignals";

// Executive Dashboard Redesign Sprint ED-R2. organization_id is derived from the authenticated
// server session only -- never accepted from the client.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const signals = await getSocialDashboardSignals(session.user.organizationId);
  return NextResponse.json(signals);
}
