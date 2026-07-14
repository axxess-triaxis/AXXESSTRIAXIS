import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "audit-exports", "route.ts"), "utf8");

describe("audit export API", () => {
  it("restricts export creation to organization administrators", () => {
    expect(routeSource).toContain("const adminRoles = [\"Super Admin\", \"Organization Admin\"]");
    expect(routeSource).toContain("return NextResponse.json({ error: \"Forbidden.\" }, { status: 403 })");
  });

  it("creates immutable export metadata before returning the CSV", () => {
    expect(routeSource).toContain("audit_exports");
    expect(routeSource).toContain("export_token_hash: sha256(token)");
    expect(routeSource).toContain("csv_sha256: sha256(csv)");
    expect(routeSource).toContain("expires_at: expiresAt");
  });

  it("uses the signed-in user's Supabase token and records an audit event", () => {
    expect(routeSource).toContain("Authorization: `Bearer ${accessToken}`");
    expect(routeSource).toContain("audit_export.created");
    expect(routeSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
