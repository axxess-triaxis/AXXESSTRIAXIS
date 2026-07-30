import { describe, expect, it } from "vitest";
import { agentApiKeyHashMatches, generateAgentApiKey, getAgentConnectionVaultMissingConfiguration, hashAgentApiKey, isAgentConnectionVaultConfigured } from "./agentConnectionVault";

const env = { AXXESS_TOKEN_VAULT_KEY: "test-token-vault-key-with-at-least-32-characters" } as unknown as NodeJS.ProcessEnv;

describe("agentConnectionVault", () => {
  it("reports configured/missing off the same AXXESS_TOKEN_VAULT_KEY as the other vaults, no new secret to provision", () => {
    expect(isAgentConnectionVaultConfigured(env)).toBe(true);
    expect(isAgentConnectionVaultConfigured({} as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(getAgentConnectionVaultMissingConfiguration({} as unknown as NodeJS.ProcessEnv)).toContain("AXXESS_TOKEN_VAULT_KEY");
  });

  it("generates a high-entropy raw key whose prefix is a genuine substring, not a separately-derived value", () => {
    const { rawKey, prefix } = generateAgentApiKey();
    expect(rawKey.startsWith("axa_live_")).toBe(true);
    expect(rawKey.length).toBeGreaterThan(40);
    expect(rawKey.startsWith(prefix)).toBe(true);

    const second = generateAgentApiKey();
    expect(second.rawKey).not.toBe(rawKey);
  });

  it("hashes deterministically for the same key+secret, so a stored hash can be looked up again", () => {
    const { rawKey } = generateAgentApiKey();
    expect(hashAgentApiKey(rawKey, env)).toBe(hashAgentApiKey(rawKey, env));
  });

  it("never lets the raw key be recovered from the hash -- two different raw keys hash differently", () => {
    const first = generateAgentApiKey();
    const second = generateAgentApiKey();
    expect(hashAgentApiKey(first.rawKey, env)).not.toBe(hashAgentApiKey(second.rawKey, env));
  });

  it("throws rather than silently hashing with a missing/short vault secret", () => {
    expect(() => hashAgentApiKey("axa_live_x", {} as unknown as NodeJS.ProcessEnv)).toThrow();
  });

  it("matches identical hashes and rejects any mismatch, including differing lengths", () => {
    const { rawKey } = generateAgentApiKey();
    const hash = hashAgentApiKey(rawKey, env);
    expect(agentApiKeyHashMatches(hash, hash)).toBe(true);
    expect(agentApiKeyHashMatches(hash, "ab")).toBe(false);
    expect(agentApiKeyHashMatches(hash, hashAgentApiKey(generateAgentApiKey().rawKey, env))).toBe(false);
  });
});
