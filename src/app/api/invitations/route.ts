import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { canManageOrganization, isRoleName } from "../../../security/rbac";
import { auditLogsRepository, invitationsRepository, notificationsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";

type InvitationRequest = {
  organizationId?: string;
  email?: string;
  role?: string;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const invitations = await invitationsRepository.listPending(scope);
  return NextResponse.json(invitations);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as InvitationRequest | null;
  const organizationId = body?.organizationId ?? session.user.organizationId;
  const email = body?.email?.trim().toLowerCase();
  const role = body?.role;

  if (!email || !role || !isRoleName(role)) {
    return NextResponse.json({ error: "A valid email and role are required." }, { status: 400 });
  }

  if (!canManageOrganization(session.user, organizationId)) {
    return NextResponse.json({ error: "You do not have permission to invite users to this organization." }, { status: 403 });
  }

  const invitationToken = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const invitation = await invitationsRepository.create(scope, {
    organizationId,
    email,
    role,
    invitedByUserId: session.user.id,
    tokenHash: tokenHash(invitationToken),
    expiresAt,
  });

  await auditLogsRepository.record(scope, {
    action: "user.invited",
    resourceType: "invitation",
    resourceId: invitation.id,
    category: "user-management",
    metadata: { email, role, organizationId, emailProvider: "not-configured" },
  });

  await notificationsRepository.create(scope, {
    organizationId,
    userId: session.user.id,
    type: "admin",
    title: "User invited",
    body: `${email} was invited as ${role}.`,
    resourceType: "invitation",
    resourceId: invitation.id,
  }).catch(() => undefined);

  return NextResponse.json({ ...invitation, emailDelivery: "not-configured" });
}
