import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { ConnectorProviderId } from "./connectorContract";

const tokenVaultAlgorithm = "aes-256-gcm";
const tokenVaultVersion = 1;
const minimumVaultKeyLength = 24;

export type TokenVaultEncryptedPayload = {
  version: number;
  ciphertext: string;
  iv: string;
  authTag: string;
  aad: string;
};

export type TokenVaultBundleInput = {
  providerId: ConnectorProviderId;
  organizationId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  scope: string[];
  expiresAt?: string;
  oauthSubject?: string;
  rawTokenType?: string;
  tokenReference?: string;
};

export type OpenedTokenBundle = {
  providerId: ConnectorProviderId;
  organizationId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  scope: string[];
  expiresAt?: string;
  oauthSubject?: string;
  rawTokenType?: string;
  sealedAt: string;
};

export type OAuthTokenVaultRecord = {
  providerId: ConnectorProviderId;
  organizationId: string;
  userId: string;
  tokenReference: string;
  encryptedPayload: TokenVaultEncryptedPayload;
  algorithm: typeof tokenVaultAlgorithm;
  keyId: string;
  accessTokenHash: string;
  refreshTokenHash?: string;
  scope: string[];
  expiresAt?: string;
  oauthSubject?: string;
};

export function isTokenVaultConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.AXXESS_TOKEN_VAULT_KEY && env.AXXESS_TOKEN_VAULT_KEY.length >= minimumVaultKeyLength);
}

export function getTokenVaultMissingConfiguration(env: NodeJS.ProcessEnv = process.env) {
  return isTokenVaultConfigured(env) ? [] : ["AXXESS_TOKEN_VAULT_KEY"];
}

function vaultSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.AXXESS_TOKEN_VAULT_KEY;
  if (!secret || secret.length < minimumVaultKeyLength) {
    throw new Error("AXXESS_TOKEN_VAULT_KEY must be configured before connector tokens can be stored.");
  }
  return secret;
}

function vaultKey(keyId: string, env: NodeJS.ProcessEnv = process.env) {
  return scryptSync(vaultSecret(env), `axxess-token-vault:${keyId}:v${tokenVaultVersion}`, 32);
}

function fingerprint(value: string, env: NodeJS.ProcessEnv = process.env) {
  return scryptSync(`token-vault-fingerprint:${value}`, vaultSecret(env), 32).toString("hex");
}

function associatedData(record: Pick<OAuthTokenVaultRecord, "providerId" | "organizationId" | "userId" | "tokenReference">) {
  return Buffer.from(
    [
      "axxess-token-vault",
      record.providerId,
      record.organizationId,
      record.userId,
      record.tokenReference,
      String(tokenVaultVersion),
    ].join("|"),
    "utf8",
  );
}

export function sealTokenBundle(input: TokenVaultBundleInput, env: NodeJS.ProcessEnv = process.env): OAuthTokenVaultRecord {
  if (!input.accessToken.trim()) throw new Error("Access token is required before sealing a token bundle.");

  const keyId = env.AXXESS_TOKEN_VAULT_KEY_ID ?? "primary";
  const tokenReference = input.tokenReference ?? `vault:${input.providerId}:${fingerprint(
    `${input.providerId}:${input.organizationId}:${input.userId}:${input.accessToken}:${input.refreshToken ?? ""}`,
    env,
  ).slice(0, 28)}`;
  const recordIdentity = {
    providerId: input.providerId,
    organizationId: input.organizationId,
    userId: input.userId,
    tokenReference,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv(tokenVaultAlgorithm, vaultKey(keyId, env), iv);
  const aad = associatedData(recordIdentity);
  cipher.setAAD(aad);

  const clearText = JSON.stringify({
    providerId: input.providerId,
    organizationId: input.organizationId,
    userId: input.userId,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    scope: input.scope,
    expiresAt: input.expiresAt,
    oauthSubject: input.oauthSubject,
    rawTokenType: input.rawTokenType,
    sealedAt: new Date().toISOString(),
  } satisfies OpenedTokenBundle);
  const ciphertext = Buffer.concat([cipher.update(clearText, "utf8"), cipher.final()]);

  return {
    ...recordIdentity,
    encryptedPayload: {
      version: tokenVaultVersion,
      ciphertext: ciphertext.toString("base64url"),
      iv: iv.toString("base64url"),
      authTag: cipher.getAuthTag().toString("base64url"),
      aad: aad.toString("base64url"),
    },
    algorithm: tokenVaultAlgorithm,
    keyId,
    accessTokenHash: fingerprint(`access:${input.accessToken}`, env),
    refreshTokenHash: input.refreshToken ? fingerprint(`refresh:${input.refreshToken}`, env) : undefined,
    scope: input.scope,
    expiresAt: input.expiresAt,
    oauthSubject: input.oauthSubject,
  };
}

export function openTokenBundle(record: OAuthTokenVaultRecord, env: NodeJS.ProcessEnv = process.env): OpenedTokenBundle {
  if (record.algorithm !== tokenVaultAlgorithm) throw new Error(`Unsupported token vault algorithm: ${record.algorithm}`);
  if (record.encryptedPayload.version !== tokenVaultVersion) throw new Error("Unsupported token vault payload version.");

  const expectedAad = associatedData(record);
  if (record.encryptedPayload.aad !== expectedAad.toString("base64url")) {
    throw new Error("Token vault associated data does not match the record identity.");
  }

  const decipher = createDecipheriv(
    tokenVaultAlgorithm,
    vaultKey(record.keyId, env),
    Buffer.from(record.encryptedPayload.iv, "base64url"),
  );
  decipher.setAAD(expectedAad);
  decipher.setAuthTag(Buffer.from(record.encryptedPayload.authTag, "base64url"));
  const clearText = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedPayload.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  const opened = JSON.parse(clearText) as OpenedTokenBundle;
  if (
    opened.providerId !== record.providerId ||
    opened.organizationId !== record.organizationId ||
    opened.userId !== record.userId
  ) {
    throw new Error("Token vault payload identity does not match the vault record.");
  }
  return opened;
}
