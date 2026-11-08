import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { buildStackWorkflowSnapshot } from "../../../../services/agents/stackWorkflowSnapshot";

const adminRoles = ["Super Admin", "Organization Admin"];

// Stack status page (2026-11-08): the caller's own organization only, admins only, same gate as
// GET /api/agents/activity.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Only organization admins can view stack workflow runs." }, { status: 403 });
  }

  return NextResponse.json(await buildStackWorkflowSnapshot(session.user.organizationId));
}
