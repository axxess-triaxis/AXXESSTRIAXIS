import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { getMetaBusinessDashboardSignals } from "../../../../services/dashboard/metaBusinessDashboardSignals";

// Executive Dashboard Redesign Sprint ED-R4. organization_id is derived from the authenticated
// server session only -- never accepted from the client.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const signals = await getMetaBusinessDashboardSignals(session.user.organizationId);
  return NextResponse.json(signals);
}
