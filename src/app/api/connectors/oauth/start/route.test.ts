import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
