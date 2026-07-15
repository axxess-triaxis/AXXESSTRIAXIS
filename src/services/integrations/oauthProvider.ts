import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { ConnectorProviderId } from "./connectorContract";
import { getConnectorContract } from "./connectorContract";

export type OAuthStatePayload = {
  organizationId: string;
  userId: string;
  providerId: ConnectorProviderId;
  nonce: string;
  issuedAt: number;
};

export type OAuthTokenExchangeResult = {
  providerId: ConnectorProviderId;
  tokenReference: string;
  accessTokenHash: string;
  refreshTokenHash?: string;
  scope: string[];
  expiresAt?: string;
  oauthSubject?: string;
  rawTokenType?: string;
};

type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function oauthStateSecret(env: NodeJS.ProcessEnv = process.env) {
  return env.AXXESS_OAUTH_STATE_SECRET ?? env.NEXTAUTH_SECRET ?? env.SUPABASE_JWT_SECRET ?? "axxess-local-oauth-state-secret";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function signatureFor(payload: string, env: NodeJS.ProcessEnv = process.env) {
  return createHmac("sha256", oauthStateSecret(env)).update(payload).digest("base64url");
}

function providerClient(providerId: ConnectorProviderId, env: NodeJS.ProcessEnv = process.env) {
  if (providerId === "gmail") {
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }
  return {
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
  };
}

function decodeJwtSubject(idToken?: string) {
  if (!idToken) return undefined;
  const [, payload] = idToken.split(".");
  if (!payload) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; oid?: string };
    return parsed.sub ?? parsed.oid;
  } catch {
    return undefined;
  }
}

export function createOAuthState(input: {
  organizationId: string;
  userId: string;
  providerId: ConnectorProviderId;
  nonce?: string;
  issuedAt?: number;
  env?: NodeJS.ProcessEnv;
}) {
  const payload: OAuthStatePayload = {
    organizationId: input.organizationId,
    userId: input.userId,
    providerId: input.providerId,
    nonce: input.nonce ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    issuedAt: input.issuedAt ?? Date.now(),
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signatureFor(encodedPayload, input.env)}`;
}

export function hashOAuthState(state: string) {
  return digest(state);
}

export function verifyOAuthState(state: string, providerId: ConnectorProviderId, options: {
  env?: NodeJS.ProcessEnv;
  now?: number;
  maxAgeMs?: number;
} = {}) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return { ok: false as const, reason: "OAuth state is malformed." };
  const expected = signatureFor(payload, options.env);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return { ok: false as const, reason: "OAuth state signature is invalid." };
  }

  let parsed: OAuthStatePayload;
  try {
    parsed = JSON.parse(fromBase64Url(payload)) as OAuthStatePayload;
  } catch {
    return { ok: false as const, reason: "OAuth state payload is invalid." };
  }

  const age = (options.now ?? Date.now()) - parsed.issuedAt;
  if (parsed.providerId !== providerId) return { ok: false as const, reason: "OAuth state provider does not match callback provider." };
  if (age < 0 || age > (options.maxAgeMs ?? 15 * 60 * 1000)) return { ok: false as const, reason: "OAuth state has expired." };
  return { ok: true as const, payload: parsed, stateHash: hashOAuthState(state) };
}

export function getOAuthProviderConfiguration(providerId: ConnectorProviderId, env: NodeJS.ProcessEnv = process.env) {
  const contract = getConnectorContract(providerId);
  const client = providerClient(providerId, env);
  const appUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return {
    configured: Boolean(contract && client.clientId && client.clientSecret && appUrl),
    providerId,
    contract,
    client,
    redirectUri: appUrl ? `${appUrl}/api/connectors/oauth/callback?provider=${providerId}` : undefined,
    missing: [
      !client.clientId ? `${providerId === "gmail" ? "GOOGLE" : "MICROSOFT"}_CLIENT_ID` : undefined,
      !client.clientSecret ? `${providerId === "gmail" ? "GOOGLE" : "MICROSOFT"}_CLIENT_SECRET` : undefined,
      !appUrl ? "NEXT_PUBLIC_APP_URL" : undefined,
    ].filter((item): item is string => Boolean(item)),
  };
}

export async function exchangeOAuthCode(input: {
  providerId: ConnectorProviderId;
  code: string;
  redirectUri: string;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  now?: number;
}): Promise<OAuthTokenExchangeResult> {
  const contract = getConnectorContract(input.providerId);
  if (!contract) throw new Error("Unsupported OAuth connector provider.");
  const client = providerClient(input.providerId, input.env);
  if (!client.clientId || !client.clientSecret) throw new Error("OAuth client credentials are not configured.");

  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
  });
  const response = await (input.fetcher ?? fetch)(contract.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as OAuthTokenResponse;
  if (!response.ok || payload.error || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? `OAuth token exchange failed with status ${response.status}.`);
  }

  const tokenFingerprint = digest(`${input.providerId}:${payload.access_token}:${payload.refresh_token ?? ""}`);
  const expiresAt = payload.expires_in
    ? new Date((input.now ?? Date.now()) + payload.expires_in * 1000).toISOString()
    : undefined;

  return {
    providerId: input.providerId,
    tokenReference: `oauth:${input.providerId}:${tokenFingerprint.slice(0, 20)}`,
    accessTokenHash: digest(payload.access_token),
    refreshTokenHash: payload.refresh_token ? digest(payload.refresh_token) : undefined,
    scope: payload.scope?.split(/\s+/).filter(Boolean) ?? contract.requiredScopes,
    expiresAt,
    oauthSubject: decodeJwtSubject(payload.id_token),
    rawTokenType: payload.token_type,
  };
}

export function buildIntegrationConnectionUpsert(input: {
  organizationId: string;
  userId: string;
  exchange: OAuthTokenExchangeResult;
  stateHash: string;
}) {
  return {
    organization_id: input.organizationId,
    provider_id: input.exchange.providerId,
    status: "connected",
    scopes: input.exchange.scope,
    webhook_enabled: false,
    configured_by: input.userId,
    oauth_subject: input.exchange.oauthSubject ?? null,
    token_reference: input.exchange.tokenReference,
    token_expires_at: input.exchange.expiresAt ?? null,
    oauth_state_hash: input.stateHash,
    connected_at: new Date().toISOString(),
    last_error: null,
    metadata: {
      tokenType: input.exchange.rawTokenType,
      accessTokenHash: input.exchange.accessTokenHash,
      refreshTokenHash: input.exchange.refreshTokenHash,
      tokenStorage: "external-secret-reference-required",
    },
  };
}
