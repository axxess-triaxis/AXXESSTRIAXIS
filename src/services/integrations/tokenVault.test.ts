import { describe, expect, it } from "vitest";
import { openTokenBundle, sealTokenBundle } from "./tokenVault";

describe("encrypted token vault", () => {
  const env = {
    AXXESS_TOKEN_VAULT_KEY: "test-token-vault-key-with-at-least-32-characters",
    AXXESS_TOKEN_VAULT_KEY_ID: "test-key",
  } as unknown as NodeJS.ProcessEnv;

  it("seals and opens OAuth token bundles without exposing raw tokens in the vault record", () => {
    const record = sealTokenBundle({
      providerId: "gmail",
      organizationId: "org-1",
      userId: "user-1",
      accessToken: "live-access-token",
      refreshToken: "live-refresh-token",
      scope: ["https://www.googleapis.com/auth/gmail.readonly"],
      expiresAt: "2026-07-15T12:00:00.000Z",
      rawTokenType: "Bearer",
    }, env);

    expect(record.tokenReference).toMatch(/^vault:gmail:/);
    expect(JSON.stringify(record)).not.toContain("live-access-token");
    expect(JSON.stringify(record)).not.toContain("live-refresh-token");
    expect(openTokenBundle(record, env)).toMatchObject({
      providerId: "gmail",
      organizationId: "org-1",
      userId: "user-1",
      accessToken: "live-access-token",
      refreshToken: "live-refresh-token",
    });
  });

  it("rejects vault records moved across tenants", () => {
    const record = sealTokenBundle({
      providerId: "gmail",
      organizationId: "org-1",
      userId: "user-1",
      accessToken: "access-token",
      scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    }, env);

    expect(() => openTokenBundle({ ...record, organizationId: "org-2" }, env)).toThrow("associated data");
  });
});
