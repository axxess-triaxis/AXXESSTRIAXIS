import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import type { RepositoryQuery } from "../../../repositories/interfaces";

type ModuleUsageEventRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  module: string;
  created_at: string;
};

const adminRoles = ["Super Admin", "Organization Admin"];

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return { url, anonKey };
}

async function jsonBody(request: Request) {
  const body = await request.json().catch(() => ({}));
  return typeof body === "object" && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

async function insertModuleUsageEvent(accessToken: string, row: Record<string, unknown>) {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/module_usage_events`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Module usage event insert failed: ${response.status} ${message}`);
  }

  const rows = await response.json() as ModuleUsageEventRow[];
  if (!rows[0]) throw new Error("Module usage event insert returned no record.");
  return rows[0];
}

function repositoryQueryFromUrl(url: URL): RepositoryQuery {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "100");
  return {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 100,
  };
}

async function listModuleUsageEvents(accessToken: string, organizationId: string, query: RepositoryQuery) {
  const { url, anonKey } = getSupabaseConfig();
  const pageSize = Math.min(Math.max(query.pageSize ?? 100, 1), 500);
  const page = Math.max(query.page ?? 1, 1);
  const params = new URLSearchParams({
    select: "id,organization_id,user_id,module,created_at",
    organization_id: `eq.${organizationId}`,
    order: "created_at.desc",
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
  });

  const response = await fetch(`${url}/rest/v1/module_usage_events?${params.toString()}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Module usage event list failed: ${response.status} ${message}`);
  }

  return await response.json() as ModuleUsageEventRow[];
}

function mapModuleUsageEvent(row: ModuleUsageEventRow) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    module: row.module,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const rows = await listModuleUsageEvents(
    session.accessToken,
    session.user.organizationId,
    repositoryQueryFromUrl(new URL(request.url)),
  );
  return NextResponse.json(rows.map(mapModuleUsageEvent));
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await jsonBody(request);
  const moduleId = typeof body.module === "string" ? body.module.trim().slice(0, 60) : "";
  if (!moduleId) return NextResponse.json({ error: "A module id is required." }, { status: 400 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const event = await insertModuleUsageEvent(session.accessToken, {
    organization_id: scope.organizationId,
    user_id: scope.userId,
    module: moduleId,
  });

  return NextResponse.json(mapModuleUsageEvent(event), { status: 201 });
}
