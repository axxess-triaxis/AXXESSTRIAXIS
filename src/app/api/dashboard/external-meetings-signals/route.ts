import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { getExternalMeetingsDashboardSignals } from "../../../../services/dashboard/externalMeetingsDashboardSignals";

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const signals = await getExternalMeetingsDashboardSignals(session.user.organizationId);
  return NextResponse.json(signals);
}
