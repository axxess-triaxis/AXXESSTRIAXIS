import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { isRoleName } from "../../../../security/rbac";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

type RoleRow = {
  id: string;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function initialsFor(email: string) {
  return email.split("@")[0].slice(0, 2).toUpperCase() || "AU";
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Invitation acceptance requires server-side Supabase admin configuration." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { token?: string } | null;
  if (!body?.token) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }

  const params = new URLSearchParams({
    token_hash: `eq.${tokenHash(body.token)}`,
    status: "eq.pending",
    select: "id,organization_id,email,role,status,expires_at",
    limit: "1",
  });
  const invitations = await supabaseAdminRest<InvitationRow[]>("invitations", { query: params });
  const invitation = invitations[0];

  if (!invitation || new Date(invitation.expires_at).getTime() < Date.now() || !isRoleName(invitation.role)) {
    return NextResponse.json({ error: "Invitation is invalid or expired." }, { status: 400 });
  }

  if ((session.user.email ?? "").trim().toLowerCase() !== invitation.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "This invitation was sent to a different email address. Sign in as that account to accept it." }, { status: 403 });
  }

  const displayName = session.user.displayName ?? invitation.email.split("@")[0];
  await supabaseAdminRest("profiles", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "id" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: session.user.id,
      email: session.user.email ?? invitation.email,
      display_name: displayName,
      avatar_initials: session.user.avatarInitials ?? initialsFor(invitation.email),
    },
  });

  await supabaseAdminRest("users", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "id" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: session.user.id,
      organization_id: invitation.organization_id,
      email: session.user.email ?? invitation.email,
      display_name: displayName,
      avatar_initials: session.user.avatarInitials ?? initialsFor(invitation.email),
      role: invitation.role,
      status: "active",
    },
  });

  await supabaseAdminRest("organization_members", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,user_id" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: invitation.organization_id,
      user_id: session.user.id,
      status: "active",
    },
  });

  const roleParams = new URLSearchParams({
    organization_id: `eq.${invitation.organization_id}`,
    name: `eq.${invitation.role}`,
    select: "id",
    limit: "1",
  });
  let roles = await supabaseAdminRest<RoleRow[]>("roles", { query: roleParams });

  if (!roles[0]) {
    roles = await supabaseAdminRest<RoleRow[]>("roles", {
      method: "POST",
      body: {
        organization_id: invitation.organization_id,
        name: invitation.role,
        description: `${invitation.role} role`,
      },
    });
  }

  await supabaseAdminRest("user_roles", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,user_id,role_id" }),
    prefer: "resolution=ignore-duplicates,return=representation",
    body: {
      organization_id: invitation.organization_id,
      user_id: session.user.id,
      role_id: roles[0].id,
    },
  });

  await supabaseAdminRest("invitations", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${invitation.id}` }),
    body: {
      status: "accepted",
      accepted_at: new Date().toISOString(),
    },
  });

  await auditLogsRepository.record(tenantScopeFromUser({
    ...session.user,
    organizationId: invitation.organization_id,
    role: invitation.role,
  }, session.accessToken), {
    action: "invitation.accepted",
    resourceType: "invitation",
    resourceId: invitation.id,
    category: "user-management",
    metadata: { email: invitation.email, role: invitation.role },
  });

  return NextResponse.json({ ok: true });
}
