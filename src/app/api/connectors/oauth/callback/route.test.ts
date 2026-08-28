import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    // Lite Settings real-modules pass (2026-08-27): the redirect target is now Lite-aware
    // (integrationsPagePath), not the hardcoded /integrations literal this test used to check for.
    expect(source).toContain("`${integrationsPagePath}?provider=${provider}&status=${finalStatus}`");
  });

  it("still gates the real token vault and integration_connections writes behind isSupabaseAdminConfigured()", () => {
    expect(source).toContain("if (adminConfigured) {");
    expect(source).toContain('"oauth_token_vault"');
    expect(source).toContain('"integration_connections"');
  });

  it("A-100 (2026-08-07): recognizes Meta's error_code/error_message shape, not just a plain error param", () => {
    // Founder live-tested "Connect WhatsApp Business" and Meta rejected the redirect with
    // ?error_code=1349168&error_message=URL+Blocked..., not a plain ?error=. The old
    // `url.searchParams.get("error")` check missed this entirely, so the request fell through to
    // the generic 400 JSON ("OAuth code and state are required.") instead of a real error toast.
    expect(source).toContain('url.searchParams.get("error") ?? url.searchParams.get("error_message") ?? url.searchParams.get("error_code")');
  });
});

// Lite Settings real-modules pass (2026-08-27): real behavioral proof, not just string-matching --
// a Lite host callback for a provider outside Lite's list is rejected before any state/exchange
// logic runs, and a Lite host's error redirect targets /lite/settings/integrations, not /integrations.
const state = { session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken: string } };

vi.mock("../../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));
vi.mock("../../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: { record: async () => undefined },
}));
vi.mock("../../../../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => false,
  supabaseAdminRest: async () => undefined,
}));

import { GET } from "./route";

describe("Connector OAuth callback: Lite host narrowing", () => {
  afterEach(() => {
    state.session = null;
  });

  it("rejects a Lite host callback for a provider outside Lite's list before touching OAuth state", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Employee" }, accessToken: "token-1" };

    const response = await GET(new Request("https://lite.triaxisventures.com/api/connectors/oauth/callback?provider=linear&code=abc&state=xyz", {
      headers: { host: "lite.triaxisventures.com" },
    }));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("This connector is not available on AXXESS Lite.");
  });

  it("a Lite host's own OAuth error redirects to /lite/settings/integrations, not X0's /integrations", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Employee" }, accessToken: "token-1" };

    const response = await GET(new Request("https://lite.triaxisventures.com/api/connectors/oauth/callback?provider=gmail&error=access_denied", {
      headers: { host: "lite.triaxisventures.com" },
    }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/lite/settings/integrations?provider=gmail&status=error");
  });

  it("an X0 host's own OAuth error still redirects to /integrations, unchanged", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Employee" }, accessToken: "token-1" };

    const response = await GET(new Request("https://landing.triaxisventures.com/api/connectors/oauth/callback?provider=gmail&error=access_denied", {
      headers: { host: "landing.triaxisventures.com" },
    }));

    expect(response.headers.get("location")).toContain("/integrations?provider=gmail&status=error");
    expect(response.headers.get("location")).not.toContain("/lite/settings/integrations");
  });
});
