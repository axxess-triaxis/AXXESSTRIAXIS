import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/api/connectors/oauth/callback/route.ts"), "utf8");

describe("OAuth connector callback (A-97, 2026-08-06)", () => {
  it("no longer unconditionally reports status=connected -- the redirect reflects whether the admin write actually ran", () => {
    // Before this fix: `return NextResponse.redirect(new URL(\`/integrations?provider=${provider}&status=connected\`, url.origin));`
    // was unconditional, so a deployment/environment missing SUPABASE_SERVICE_ROLE_KEY would tell
    // the user "connected" even though isSupabaseAdminConfigured() gated the whole write block off
    // and nothing was persisted. Confirmed via direct production DB query (2026-08-06) that the
    // write path itself succeeds when admin *is* configured -- this fix covers the case where it
    // is not, in this or any future environment.
    expect(source).not.toContain("`/integrations?provider=${provider}&status=connected`");
    expect(source).toContain("const adminConfigured = isSupabaseAdminConfigured();");
    expect(source).toContain('const finalStatus = adminConfigured ? "connected" : "not_configured";');
    expect(source).toContain("`/integrations?provider=${provider}&status=${finalStatus}`");
  });

  it("still gates the real token vault and integration_connections writes behind isSupabaseAdminConfigured()", () => {
    expect(source).toContain("if (adminConfigured) {");
    expect(source).toContain('"oauth_token_vault"');
    expect(source).toContain('"integration_connections"');
  });
});
