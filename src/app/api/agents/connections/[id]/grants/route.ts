import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../../auth/serverSession";
import { listGrants, revokeGrant } from "../../../../../../services/agents/agentGrantsRepository";

const adminRoles = ["Super Admin", "Organization Admin"];

async function requireAdminSession() {
  const session = await getServerAuthSession(true);
  if (!session) return { ok: false as const, error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  if (!adminRoles.includes(session.user.role)) {
    return { ok: false as const, error: NextResponse.json({ error: "Only organization admins can manage agent connections." }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

// Agentic Infrastructure Phase 2 (2026-07-30): surfaces the "Always Allow" grants a connection
// has accumulated (created via PATCH /api/approvals/[id] with alwaysAllow:true) so a tenant admin
// can see and revoke them -- a grant should never be invisible/unmanageable once created.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;
  const { id } = await params;

  const grants = await listGrants(authResult.session.user.organizationId, id);
  return NextResponse.json({ grants });
}

export async function DELETE(request: Request) {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;

  const grantId = new URL(request.url).searchParams.get("grantId");
  if (!grantId) return NextResponse.json({ error: "grantId is required." }, { status: 400 });

  await revokeGrant(authResult.session.user.organizationId, grantId);
  return NextResponse.json({ ok: true });
}
