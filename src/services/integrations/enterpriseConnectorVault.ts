import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { isTokenVaultConfigured, getTokenVaultMissingConfiguration } from "./tokenVault";

const vaultAlgorithm = "aes-256-gcm";
const vaultVersion = 1;

export type EnterpriseConnectorProviderId = "auth0" | "clickhouse" | "mssql" | "snowflake" | "s3" | "paddle" | "stripe";

export const enterpriseConnectorProviders: Record<EnterpriseConnectorProviderId, {
  displayName: string;
  category: "identity" | "data-warehouse" | "storage" | "billing";
  purpose: string;
  credentialFields: Array<{ key: string; label: string; secret: boolean }>;
}> = {
  auth0: {
    displayName: "Auth0",
    category: "identity",
    purpose: "Enterprise SSO configuration for this organization's own workforce login -- stored ahead of full identity-federation wiring (see MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md section 1.3/3).",
    credentialFields: [
      { key: "domain", label: "Auth0 domain", secret: false },
      { key: "clientId", label: "Client ID", secret: false },
      { key: "clientSecret", label: "Client secret", secret: true },
    ],
  },
  clickhouse: {
    displayName: "ClickHouse",
    category: "data-warehouse",
    purpose: "Enterprise data-warehouse connectivity for analytics/AI Workspace sourcing.",
    credentialFields: [
      { key: "host", label: "Host", secret: false },
      { key: "port", label: "Port", secret: false },
      { key: "database", label: "Database", secret: false },
      { key: "username", label: "Username", secret: false },
      { key: "password", label: "Password", secret: true },
    ],
  },
  mssql: {
    displayName: "Microsoft SQL Server",
    category: "data-warehouse",
    purpose: "Enterprise data-warehouse connectivity for analytics/AI Workspace sourcing.",
    credentialFields: [
      { key: "host", label: "Host", secret: false },
      { key: "port", label: "Port", secret: false },
      { key: "database", label: "Database", secret: false },
      { key: "username", label: "Username", secret: false },
      { key: "password", label: "Password", secret: true },
    ],
  },
  snowflake: {
    displayName: "Snowflake",
    category: "data-warehouse",
    purpose: "Enterprise data-warehouse connectivity for analytics/AI Workspace sourcing.",
    credentialFields: [
      { key: "accountIdentifier", label: "Account identifier", secret: false },
      { key: "warehouse", label: "Warehouse", secret: false },
      { key: "username", label: "Username", secret: false },
      { key: "password", label: "Password", secret: true },
    ],
  },
  s3: {
    displayName: "Amazon S3",
    category: "storage",
    purpose: "Alternate document-storage backend alongside Supabase Storage.",
    credentialFields: [
      { key: "bucket", label: "Bucket", secret: false },
      { key: "region", label: "Region", secret: false },
      { key: "accessKeyId", label: "Access key ID", secret: false },
      { key: "secretAccessKey", label: "Secret access key", secret: true },
    ],
  },
  paddle: {
    displayName: "Paddle",
    category: "billing",
    purpose: "Billing/subscription management for the five-tier pricing model (see MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md section 1). Configuration only -- no live checkout flow is wired yet.",
    credentialFields: [
      { key: "vendorId", label: "Vendor ID", secret: false },
      { key: "apiKey", label: "API key", secret: true },
    ],
  },
  stripe: {
    displayName: "Stripe",
    category: "billing",
    purpose: "Billing/subscription management for the five-tier pricing model (see MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md section 1). Configuration only -- no live checkout flow is wired yet.",
    credentialFields: [
      { key: "apiKey", label: "Secret API key", secret: true },
    ],
  },
};

export type EnterpriseConnectorEncryptedPayload = {
  version: number;
  ciphertext: string;
  iv: string;
  authTag: string;
  aad: string;
};

export type EnterpriseConnectorVaultRecord = {
  providerId: EnterpriseConnectorProviderId;
  organizationId: string;
  encryptedPayload: EnterpriseConnectorEncryptedPayload;
  algorithm: typeof vaultAlgorithm;
  keyId: string;
  payloadHash: string;
};

export function isEnterpriseConnectorVaultConfigured(env: NodeJS.ProcessEnv = process.env) {
  return isTokenVaultConfigured(env);
}

export function getEnterpriseConnectorVaultMissingConfiguration(env: NodeJS.ProcessEnv = process.env) {
  return getTokenVaultMissingConfiguration(env);
}

function vaultSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.AXXESS_TOKEN_VAULT_KEY;
  if (!secret || secret.length < 24) {
    throw new Error("AXXESS_TOKEN_VAULT_KEY must be configured before enterprise connector credentials can be stored.");
  }
  return secret;
}

function vaultKey(keyId: string, env: NodeJS.ProcessEnv = process.env) {
  return scryptSync(vaultSecret(env), `axxess-enterprise-connector-vault:${keyId}:v${vaultVersion}`, 32);
}

function fingerprint(value: string, env: NodeJS.ProcessEnv = process.env) {
  return scryptSync(`enterprise-connector-vault-fingerprint:${value}`, vaultSecret(env), 32).toString("hex");
}

function associatedData(providerId: EnterpriseConnectorProviderId, organizationId: string) {
  return Buffer.from(["axxess-enterprise-connector-vault", providerId, organizationId, String(vaultVersion)].join("|"), "utf8");
}

export function sealEnterpriseConnectorCredentials(input: {
  providerId: EnterpriseConnectorProviderId;
  organizationId: string;
  credentials: Record<string, string>;
  env?: NodeJS.ProcessEnv;
}): EnterpriseConnectorVaultRecord {
  const keyId = input.env?.AXXESS_TOKEN_VAULT_KEY_ID ?? process.env.AXXESS_TOKEN_VAULT_KEY_ID ?? "primary";
  const iv = randomBytes(12);
  const cipher = createCipheriv(vaultAlgorithm, vaultKey(keyId, input.env), iv);
  const aad = associatedData(input.providerId, input.organizationId);
  cipher.setAAD(aad);

  const clearText = JSON.stringify(input.credentials);
  const ciphertext = Buffer.concat([cipher.update(clearText, "utf8"), cipher.final()]);

  return {
    providerId: input.providerId,
    organizationId: input.organizationId,
    encryptedPayload: {
      version: vaultVersion,
      ciphertext: ciphertext.toString("base64url"),
      iv: iv.toString("base64url"),
      authTag: cipher.getAuthTag().toString("base64url"),
      aad: aad.toString("base64url"),
    },
    algorithm: vaultAlgorithm,
    keyId,
    payloadHash: fingerprint(clearText, input.env),
  };
}

export function openEnterpriseConnectorCredentials(record: EnterpriseConnectorVaultRecord, env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  if (record.algorithm !== vaultAlgorithm) throw new Error(`Unsupported enterprise connector vault algorithm: ${record.algorithm}`);
  if (record.encryptedPayload.version !== vaultVersion) throw new Error("Unsupported enterprise connector vault payload version.");

  const expectedAad = associatedData(record.providerId, record.organizationId);
  if (record.encryptedPayload.aad !== expectedAad.toString("base64url")) {
    throw new Error("Enterprise connector vault associated data does not match the record identity.");
  }

  const decipher = createDecipheriv(vaultAlgorithm, vaultKey(record.keyId, env), Buffer.from(record.encryptedPayload.iv, "base64url"));
  decipher.setAAD(expectedAad);
  decipher.setAuthTag(Buffer.from(record.encryptedPayload.authTag, "base64url"));
  const clearText = Buffer.concat([
    decipher.update(Buffer.from(record.encryptedPayload.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(clearText) as Record<string, string>;
}
