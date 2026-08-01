import { describe, expect, it, vi } from "vitest";
import { buildIntegrationConnectionUpsert, createOAuthState, exchangeOAuthCode, getOAuthProviderConfiguration, verifyOAuthState } from "./oauthProvider";

describe("OAuth provider flow", () => {
  const env = {
    AXXESS_OAUTH_STATE_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "google-client",
    GOOGLE_CLIENT_SECRET: "google-secret",
    NEXT_PUBLIC_APP_URL: "https://app.axxess.test",
    AXXESS_TOKEN_VAULT_KEY: "test-token-vault-key-with-at-least-32-characters",
  } as unknown as NodeJS.ProcessEnv;

  it("creates and verifies signed tenant-bound OAuth state", () => {
    const state = createOAuthState({
      organizationId: "org-1",
      userId: "user-1",
      providerId: "gmail",
      nonce: "nonce-1",
      issuedAt: 1000,
      env,
    });

    const verified = verifyOAuthState(state, "gmail", { env, now: 2000 });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload.organizationId).toBe("org-1");
      expect(verified.payload.userId).toBe("user-1");
      expect(verified.stateHash).toHaveLength(64);
    }
  });

  it("exchanges a Gmail auth code without exposing raw tokens in connection metadata", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      token_type: "Bearer",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const exchange = await exchangeOAuthCode({
      providerId: "gmail",
      organizationId: "org-1",
      userId: "user-1",
      code: "code-1",
      redirectUri: "https://app.axxess.test/api/connectors/oauth/callback?provider=gmail",
      env,
      fetcher,
      now: 1000,
    });
    const upsert = buildIntegrationConnectionUpsert({
      organizationId: "org-1",
      userId: "user-1",
      exchange,
      stateHash: "state-hash",
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(exchange.tokenReference).toMatch(/^vault:gmail:/);
    expect(exchange.vaultRecord.encryptedPayload.ciphertext).toBeTruthy();
    expect(JSON.stringify(upsert)).not.toContain("access-token");
    expect(JSON.stringify(upsert)).not.toContain("refresh-token");
    expect(upsert.status).toBe("connected");
    expect(upsert.metadata.tokenStorage).toBe("encrypted-token-vault");
  });

  it("reports the correct missing env vars per provider, not hardcoded Google/Microsoft names", () => {
    // Regression test: getOAuthProviderConfiguration() used to hardcode
    // `${providerId === "gmail" ? "GOOGLE" : "MICROSOFT"}_...`, which would have silently
    // mislabeled Slack/Calendly's missing credentials as Microsoft's once those providers existed.
    const slackConfig = getOAuthProviderConfiguration("slack", { NEXT_PUBLIC_APP_URL: "https://app.axxess.test" } as unknown as NodeJS.ProcessEnv);
    expect(slackConfig.configured).toBe(false);
    expect(slackConfig.missing).toContain("SLACK_CLIENT_ID");
    expect(slackConfig.missing).toContain("SLACK_CLIENT_SECRET");
    expect(slackConfig.missing).not.toContain("MICROSOFT_CLIENT_ID");

    const calendlyConfig = getOAuthProviderConfiguration("calendly", { NEXT_PUBLIC_APP_URL: "https://app.axxess.test" } as unknown as NodeJS.ProcessEnv);
    expect(calendlyConfig.missing).toContain("CALENDLY_CLIENT_ID");
    expect(calendlyConfig.missing).toContain("CALENDLY_CLIENT_SECRET");
  });

  it("reports Zoom's own missing env vars, not Google/Microsoft's (Sprint SI-1)", () => {
    const zoomConfig = getOAuthProviderConfiguration("zoom", { NEXT_PUBLIC_APP_URL: "https://app.axxess.test" } as unknown as NodeJS.ProcessEnv);
    expect(zoomConfig.configured).toBe(false);
    expect(zoomConfig.missing).toContain("ZOOM_CLIENT_ID");
    expect(zoomConfig.missing).toContain("ZOOM_CLIENT_SECRET");
    expect(zoomConfig.missing).not.toContain("GOOGLE_CLIENT_ID");
    expect(zoomConfig.missing).not.toContain("MICROSOFT_CLIENT_ID");
  });

  it("Google Calendar and Teams report as configured once their shared Google/Microsoft credentials are present (Sprint SI-1)", () => {
    const sharedEnv = {
      GOOGLE_CLIENT_ID: "google-client",
      GOOGLE_CLIENT_SECRET: "google-secret",
      MICROSOFT_CLIENT_ID: "microsoft-client",
      MICROSOFT_CLIENT_SECRET: "microsoft-secret",
      NEXT_PUBLIC_APP_URL: "https://app.axxess.test",
      AXXESS_TOKEN_VAULT_KEY: "test-token-vault-key-with-at-least-32-characters",
    } as unknown as NodeJS.ProcessEnv;
    expect(getOAuthProviderConfiguration("google_calendar", sharedEnv).configured).toBe(true);
    expect(getOAuthProviderConfiguration("teams", sharedEnv).configured).toBe(true);
    expect(getOAuthProviderConfiguration("google_drive", sharedEnv).configured).toBe(true);
  });

  it("exchanges a Zoom auth code via the shared generic flow, using Zoom's own client credentials", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      access_token: "zoom-access-token",
      refresh_token: "zoom-refresh-token",
      expires_in: 3600,
      scope: "meeting:write meeting:read",
      token_type: "Bearer",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const exchange = await exchangeOAuthCode({
      providerId: "zoom",
      organizationId: "org-1",
      userId: "user-1",
      code: "code-1",
      redirectUri: "https://app.axxess.test/api/connectors/oauth/callback?provider=zoom",
      env: {
        AXXESS_OAUTH_STATE_SECRET: "test-secret",
        ZOOM_CLIENT_ID: "zoom-client",
        ZOOM_CLIENT_SECRET: "zoom-secret",
        NEXT_PUBLIC_APP_URL: "https://app.axxess.test",
        AXXESS_TOKEN_VAULT_KEY: "test-token-vault-key-with-at-least-32-characters",
      } as unknown as NodeJS.ProcessEnv,
      fetcher,
      now: 1000,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(exchange.tokenReference).toMatch(/^vault:zoom:/);
    expect(exchange.scope).toEqual(["meeting:write", "meeting:read"]);
  });

  it("sends Accept: application/json on the exchange request, fixing GitHub's default form-encoded token response (2026-07-30)", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      access_token: "github-access-token",
      scope: "repo,read:org",
      token_type: "bearer",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const exchange = await exchangeOAuthCode({
      providerId: "github",
      organizationId: "org-1",
      userId: "user-1",
      code: "code-1",
      redirectUri: "https://app.axxess.test/api/connectors/oauth/callback?provider=github",
      env: {
        AXXESS_OAUTH_STATE_SECRET: "test-secret",
        GITHUB_CLIENT_ID: "github-client",
        GITHUB_CLIENT_SECRET: "github-secret",
        NEXT_PUBLIC_APP_URL: "https://app.axxess.test",
        AXXESS_TOKEN_VAULT_KEY: "test-token-vault-key-with-at-least-32-characters",
      } as unknown as NodeJS.ProcessEnv,
      fetcher,
      now: 1000,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const requestInit = fetcher.mock.calls[0][1] as RequestInit;
    expect((requestInit.headers as Record<string, string>).Accept).toBe("application/json");
    expect(exchange.tokenReference).toMatch(/^vault:github:/);
  });

  it("reports each new connector batch provider's own missing env vars (2026-07-30)", () => {
    const emptyEnv = { NEXT_PUBLIC_APP_URL: "https://app.axxess.test" } as unknown as NodeJS.ProcessEnv;
    expect(getOAuthProviderConfiguration("linear", emptyEnv).missing).toContain("LINEAR_CLIENT_ID");
    expect(getOAuthProviderConfiguration("github", emptyEnv).missing).toContain("GITHUB_CLIENT_ID");
    expect(getOAuthProviderConfiguration("whatsapp_business", emptyEnv).missing).toContain("WHATSAPP_BUSINESS_CLIENT_ID");
    expect(getOAuthProviderConfiguration("x_twitter", emptyEnv).missing).toContain("X_CLIENT_ID");
  });

  it("exchanges a Slack auth code the same way as Gmail, via the shared generic flow", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      access_token: "slack-access-token",
      scope: "chat:write,channels:read",
      token_type: "Bearer",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const exchange = await exchangeOAuthCode({
      providerId: "slack",
      organizationId: "org-1",
      userId: "user-1",
      code: "code-1",
      redirectUri: "https://app.axxess.test/api/connectors/oauth/callback?provider=slack",
      env: {
        AXXESS_OAUTH_STATE_SECRET: "test-secret",
        SLACK_CLIENT_ID: "slack-client",
        SLACK_CLIENT_SECRET: "slack-secret",
        NEXT_PUBLIC_APP_URL: "https://app.axxess.test",
        AXXESS_TOKEN_VAULT_KEY: "test-token-vault-key-with-at-least-32-characters",
      } as unknown as NodeJS.ProcessEnv,
      fetcher,
      now: 1000,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(exchange.tokenReference).toMatch(/^vault:slack:/);
    // Slack returns scopes comma-separated (unlike Google/Microsoft's space-separated format) --
    // must come back as individual scopes, not one comma-joined string, or missingScopes checks
    // in pluginRuntime.ts would never clear for a fully-scoped Slack connection.
    expect(exchange.scope).toEqual(["chat:write", "channels:read"]);
  });
});
