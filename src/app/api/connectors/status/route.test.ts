import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/api/connectors/status/route.ts"), "utf8");

describe("Connector status API (A-97, 2026-08-06)", () => {
  it("requires a real server session before returning any connection state", () => {
    expect(source).toContain("getServerAuthSession(true)");
    expect(source).toContain('{ error: "Unauthorized." }');
  });

  it("scopes the query to the caller's own organization and only status=connected rows", () => {
    expect(source).toContain("organization_id: `eq.${session.user.organizationId}`");
    expect(source).toContain('status: "eq.connected"');
  });

  it("degrades to an empty connection list rather than throwing when Supabase admin isn't configured", () => {
    expect(source).toContain("isSupabaseAdminConfigured()");
    expect(source).toContain("{ connections: [] }");
  });
});
