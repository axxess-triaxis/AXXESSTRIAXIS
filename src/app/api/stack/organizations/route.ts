import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { listOrganizations } from "../../../../repositories/orgAgentSettingsRepository";
import { canManageStackAgentsForAnyOrganization } from "../../../../security/rbac";

// Triaxis only (customer-fireable stack, PR 5, 2026-11-20): the organizations the platform operator
// can set up agents for, by id and name.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageStackAgentsForAnyOrganization(session.user)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  return NextResponse.json({ organizations: await listOrganizations() });
}
