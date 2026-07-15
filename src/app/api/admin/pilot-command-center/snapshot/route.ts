import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { canManageOrganization } from "../../../../../security/rbac";
import { persistCommandCenterSnapshot } from "../../../../../services/platform/commandCenterScheduler";

export async function POST() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageOrganization(session.user, session.user.organizationId)) {
    return NextResponse.json({ error: "Organization admin access is required." }, { status: 403 });
  }

  const result = await persistCommandCenterSnapshot({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    userRole: session.user.role,
    env: process.env,
    seededPilotEvidence: process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true" || process.env.AXXESS_PILOT_COMMAND_CENTER_MODE === "preview",
  });

  return NextResponse.json(result);
}
