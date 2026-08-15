import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { buildAgentGovernanceSnapshot } from "../../../../services/agents/agentGovernanceSnapshot";

const adminRoles = ["Super Admin", "Organization Admin"];

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Only organization admins can view agent activity." }, { status: 403 });
  }

  const { activity, pendingApprovals, roster, summary } = await buildAgentGovernanceSnapshot(session.user.organizationId);
  return NextResponse.json({ activity, pendingApprovals, roster, summary });
}
