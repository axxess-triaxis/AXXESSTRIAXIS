import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canGrantRole } from "./rbac";

// Regression tests for audit findings L1, L16, M7, M21 and M22
// (docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md). The database half of these
// fixes is proven against a real Supabase by scripts/verify-access-integrity.mjs.

function source(...parts: string[]) {
  return readFileSync(join(process.cwd(), "src", "app", "api", ...parts, "route.ts"), "utf8");
}

describe("canGrantRole (L16)", () => {
  it("lets only a Super Admin grant Super Admin", () => {
    expect(canGrantRole("Super Admin", "Super Admin")).toBe(true);
    for (const actor of ["Organization Admin", "Executive", "Manager", "Employee", "Consultant", "Guest"] as const) {
      expect(canGrantRole(actor, "Super Admin")).toBe(false);
    }
  });

  it("leaves every other role to the existing admin checks", () => {
    expect(canGrantRole("Organization Admin", "Manager")).toBe(true);
    expect(canGrantRole("Organization Admin", "Organization Admin")).toBe(true);
  });
});

describe("role grant checks in routes (L16)", () => {
  it("POST /api/invitations refuses a role the caller cannot grant", () => {
    const route = source("invitations");
    expect(route).toContain("canGrantRole(session.user.role, role)");
  });

  it("POST and PATCH /api/repositories refuse a role the caller cannot grant", () => {
    const route = source("repositories", "[resource]");
    const post = route.slice(route.indexOf("export async function POST"), route.indexOf("export async function PATCH"));
    const patch = route.slice(route.indexOf("export async function PATCH"));
    expect(post).toContain("isRefusedRoleGrant(resourceName, body, session.user.role)");
    expect(patch).toContain("isRefusedRoleGrant(resourceName, body, session.user.role)");
  });

  it("PATCH maps the database guard's refusal to 403, not 500", () => {
    const route = source("repositories", "[resource]");
    expect(route).toContain("isDatabaseRefusal(error)");
  });
});

describe("suspended sign-in (L1)", () => {
  it("returns a distinct 403 from POST /api/auth/login", () => {
    const route = source("auth", "login");
    expect(route).toContain("AccountSuspendedError");
    expect(route).toContain('code: "account_suspended"');
    expect(route).toMatch(/account_suspended[\s\S]{0,60}status: 403/);
  });
});

describe("accepted invitations (M7)", () => {
  it("does not fail an accepted invitation when its audit write fails", () => {
    const route = source("invitations", "accept");
    expect(route).toContain("recordAuditBestEffort(");
    expect(route).not.toContain("await auditLogsRepository.record(");
  });
});

describe("refused writes are logged (M22)", () => {
  const routes: Array<[string, string[]]> = [
    ["repositories", ["repositories", "[resource]"]],
    ["invitations", ["invitations"]],
    ["agent connections", ["agents", "connections"]],
    ["agent connection grants", ["agents", "connections", "[id]", "grants"]],
    ["agent profiles", ["agents", "profiles"]],
    ["agent profile item", ["agents", "profiles", "[id]"]],
    ["connector credentials", ["connectors", "enterprise", "credentials"]],
    ["mobile release", ["admin", "mobile-release"]],
    ["pilot acceptance", ["admin", "pilot-acceptance"]],
    ["pilot snapshot", ["admin", "pilot-command-center", "snapshot"]],
    ["live ops", ["admin", "customer-success", "live-ops"]],
  ];

  it.each(routes)("%s records the refusal", (_name, parts) => {
    expect(source(...parts)).toContain("recordDeniedAttempt(");
  });
});
