import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "module-usage-events", "route.ts"), "utf8");

describe("module usage events API", () => {
  it("requires an authenticated session for both GET and POST", () => {
    expect(routeSource).toContain('if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });');
    const getIndex = routeSource.indexOf("export async function GET");
    const postIndex = routeSource.indexOf("export async function POST");
    expect(getIndex).toBeGreaterThan(-1);
    expect(postIndex).toBeGreaterThan(-1);
  });

  it("restricts GET to admin roles, matching the pilot-readiness-events route's gate", () => {
    expect(routeSource).toContain('const adminRoles = ["Super Admin", "Organization Admin"];');
    expect(routeSource).toContain('if (!adminRoles.includes(session.user.role)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });');
  });

  it("validates and sanitizes the module id, never trusting a raw client value", () => {
    expect(routeSource).toContain('const moduleId = typeof body.module === "string" ? body.module.trim().slice(0, 60) : "";');
    expect(routeSource).toContain('if (!moduleId) return NextResponse.json({ error: "A module id is required." }, { status: 400 });');
  });

  it("inserts through the authenticated Supabase token, tenant-scoped, never a client-supplied organization id", () => {
    expect(routeSource).toContain("Authorization: `Bearer ${accessToken}`");
    expect(routeSource).toContain("organization_id: scope.organizationId");
    expect(routeSource).not.toMatch(/organization_id:\s*body\./);
    expect(routeSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("lists tenant-scoped events ordered newest first", () => {
    expect(routeSource).toContain("organization_id: `eq.${organizationId}`");
    expect(routeSource).toContain('order: "created_at.desc"');
    expect(routeSource).toContain("mapModuleUsageEvent");
  });
});
