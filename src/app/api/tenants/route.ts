import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { normalizeRole } from "../../../auth/supabaseUser";
import type { Organization } from "../../../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../repositories/supabaseAdmin";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";

type OrganizationMemberRow = {
  organization_id: string;
  status: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  sector: Organization["sector"];
  created_at: string;
  updated_at: string;
};

type UserRoleRow = {
  role?: { name?: string | null } | null;
};

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sector: row.sector,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ organizations: [] });

  const memberships = await supabaseAdminRest<OrganizationMemberRow[]>("organization_members", {
    query: new URLSearchParams({
      user_id: `eq.${session.user.id}`,
      status: "eq.active",
      select: "organization_id,status",
    }),
  });
  const organizationIds = memberships.map((membership) => membership.organization_id);
  if (organizationIds.length === 0) return NextResponse.json({ organizations: [] });

  const organizations = await supabaseAdminRest<OrganizationRow[]>("organizations", {
    query: new URLSearchParams({
      id: `in.(${organizationIds.join(",")})`,
      select: "id,name,slug,sector,created_at,updated_at",
      order: "name.asc",
    }),
  });

  return NextResponse.json({
    activeOrganizationId: session.user.organizationId,
    organizations: organizations.map(mapOrganization),
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Tenant selection requires server-side Supabase admin configuration." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { organizationId?: string };
  const organizationId = body.organizationId?.trim();
  if (!organizationId) return NextResponse.json({ error: "Organization id is required." }, { status: 400 });

  const memberships = await supabaseAdminRest<OrganizationMemberRow[]>("organization_members", {
    query: new URLSearchParams({
      organization_id: `eq.${organizationId}`,
      user_id: `eq.${session.user.id}`,
      status: "eq.active",
      select: "organization_id,status",
      limit: "1",
    }),
  });
  if (!memberships[0]) return NextResponse.json({ error: "You do not belong to this organization." }, { status: 403 });

  const roles = await supabaseAdminRest<UserRoleRow[]>("user_roles", {
    query: new URLSearchParams({
      organization_id: `eq.${organizationId}`,
      user_id: `eq.${session.user.id}`,
      select: "role:roles(name)",
      limit: "1",
    }),
  }).catch(() => []);
  const role = normalizeRole(roles[0]?.role?.name ?? session.user.role);

  await supabaseAdminRest("users", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${session.user.id}` }),
    body: { organization_id: organizationId, role },
  });

  const nextUser = { ...session.user, organizationId, role };
  await auditLogsRepository.record(tenantScopeFromUser(nextUser, session.accessToken), {
    action: "tenant.selected",
    resourceType: "organization",
    resourceId: organizationId,
    category: "authentication",
    metadata: { previousOrganizationId: session.user.organizationId },
  }).catch(() => undefined);

  return NextResponse.json({ user: nextUser });
}
