import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { getMailDashboardSignals } from "../../../../services/dashboard/mailDashboardSignals";

// Executive Dashboard Redesign Sprint ED-R2. organization_id is derived from the authenticated
// server session only -- never accepted from the client -- matching this sprint's tenant-safety
// non-negotiables.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const signals = await getMailDashboardSignals(session.user.organizationId);
  return NextResponse.json(signals);
}
