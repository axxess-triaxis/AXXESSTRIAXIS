import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { isTokenVaultConfigured, getTokenVaultMissingConfiguration } from "../integrations/tokenVault";

// Agentic Infrastructure Phase 1 (2026-07-30): unlike enterpriseConnectorVault.ts/tokenVault.ts,
// this vault is one-way -- an inbound agent API key only ever needs to be *verified*, never
// reconstructed, so a reversible AES-256-GCM seal would be strictly more capability than the
// server needs (and a bigger blast radius if AXXESS_TOKEN_VAULT_KEY were ever compromised). It
// reuses the same scrypt-fingerprint keying pattern tokenVault.ts/enterpriseConnectorVault.ts
// already use for their own hash fields, and the same AXXESS_TOKEN_VAULT_KEY configuration check,
// so no new secret needs provisioning.

const keyPrefixLength = 12;

export function isAgentConnectionVaultConfigured(env: NodeJS.ProcessEnv = process.env) {
  return isTokenVaultConfigured(env);
}

export function getAgentConnectionVaultMissingConfiguration(env: NodeJS.ProcessEnv = process.env) {
  return getTokenVaultMissingConfiguration(env);
}

function vaultSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.AXXESS_TOKEN_VAULT_KEY;
  if (!secret || secret.length < 24) {
    throw new Error("AXXESS_TOKEN_VAULT_KEY must be configured before agent connection keys can be issued.");
  }
  return secret;
}

/** Generates a new high-entropy raw API key. Shown to the caller exactly once -- never stored. */
export function generateAgentApiKey(): { rawKey: string; prefix: string } {
  const rawKey = `axa_live_${randomBytes(32).toString("base64url")}`;
  return { rawKey, prefix: rawKey.slice(0, keyPrefixLength) };
}

/** One-way fingerprint of a raw API key, safe to persist and index for lookup. */
export function hashAgentApiKey(rawKey: string, env: NodeJS.ProcessEnv = process.env): string {
  return scryptSync(`agent-connection-vault-fingerprint:${rawKey}`, vaultSecret(env), 32).toString("hex");
}

/** Constant-time comparison so a lookup mismatch can't be timed to leak hash bytes. */
export function agentApiKeyHashMatches(candidateHash: string, storedHash: string): boolean {
  const candidate = Buffer.from(candidateHash, "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
