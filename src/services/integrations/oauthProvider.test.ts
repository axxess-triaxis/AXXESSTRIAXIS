import { describe, expect, it, vi } from "vitest";
import { buildIntegrationConnectionUpsert, createOAuthState, exchangeOAuthCode, verifyOAuthState } from "./oauthProvider";

describe("OAuth provider flow", () => {
  const env = {
    AXXESS_OAUTH_STATE_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "google-client",
    GOOGLE_CLIENT_SECRET: "google-secret",
    NEXT_PUBLIC_APP_URL: "https://app.axxess.test",
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
    expect(exchange.tokenReference).toMatch(/^oauth:gmail:/);
    expect(JSON.stringify(upsert)).not.toContain("access-token");
    expect(JSON.stringify(upsert)).not.toContain("refresh-token");
    expect(upsert.status).toBe("connected");
  });
});
