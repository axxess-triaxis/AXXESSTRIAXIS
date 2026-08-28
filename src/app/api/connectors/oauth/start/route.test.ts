import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/api/connectors/oauth/start/route.ts"), "utf8");

describe("Connector OAuth start API (Sprint 4 -- Gmail/Microsoft readiness audit)", () => {
  it("requires an authenticated session before starting any provider OAuth flow", () => {
    expect(source).toContain("getServerAuthSession(true)");
    expect(source).toContain('{ error: "Unauthorized." }, { status: 401 }');
  });

  it("returns a truthful provider_gated status instead of a fake authorization redirect when credentials are missing", () => {
    expect(source).toContain("getOAuthProviderConfiguration(contract.providerId)");
    expect(source).toContain("if (!config.configured)");
    expect(source).toContain('status: "provider_gated"');
    expect(source).toContain("missing: config.missing");
  });

  it("only redirects to a real provider authorization URL once fully configured", () => {
    const configuredBlock = source.slice(source.indexOf("const codeVerifier"));
    expect(configuredBlock).toContain("buildConnectorOAuthUrl(");
    expect(configuredBlock).toContain("NextResponse.redirect(authorizationUrl)");
  });

  it("writes an audit event for every OAuth start attempt, configured or not", () => {
    expect(source).toContain('action: `connector.${contract.providerId}.oauth.started`');
  });
});

// Lite Settings real-modules pass (2026-08-27): real behavioral proof that a Lite host request for
// a provider outside Lite's 12-item list is rejected even though the provider is a genuinely valid
// X0 connector (linear) -- this could not be proven by string-matching the source alone.
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

describe("Connector OAuth start API: Lite host narrowing", () => {
  afterEach(() => {
    state.session = null;
    vi.unstubAllEnvs();
  });

  it("rejects a Lite host request for a provider outside Lite's list, even though it's a real X0 connector", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Employee" }, accessToken: "token-1" };

    const response = await GET(new Request("https://lite.triaxisventures.com/api/connectors/oauth/start?provider=linear", {
      headers: { host: "lite.triaxisventures.com" },
    }));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("This connector is not available on AXXESS Lite.");
  });

  it("does not block a Lite-allowed provider on a Lite host", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Employee" }, accessToken: "token-1" };

    const response = await GET(new Request("https://lite.triaxisventures.com/api/connectors/oauth/start?provider=gmail", {
      headers: { host: "lite.triaxisventures.com" },
    }));
    const body = await response.json() as { error?: string; status?: string };

    expect(body.error).not.toBe("This connector is not available on AXXESS Lite.");
    // gmail OAuth env vars aren't configured in this test environment either way -- the meaningful
    // assertion is that it fails *after* the Lite check, with the normal provider_gated response.
    expect(body.status).toBe("provider_gated");
  });

  it("does not apply the Lite restriction to an X0 host at all", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Employee" }, accessToken: "token-1" };

    const response = await GET(new Request("https://landing.triaxisventures.com/api/connectors/oauth/start?provider=linear", {
      headers: { host: "landing.triaxisventures.com" },
    }));
    const body = await response.json() as { error?: string; status?: string };

    expect(body.error).not.toBe("This connector is not available on AXXESS Lite.");
    expect(body.status).toBe("provider_gated");
  });
});
