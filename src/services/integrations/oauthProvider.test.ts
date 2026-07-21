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
