// MC-4 (2026-08-02): resolves a connected tenant OAuth connection + its opened access token for a
// social provider (meta_business, threads). Same lookup shape as
// api/connectors/microsoft/messages/list/route.ts's inline pattern, factored out here since it's
// needed from multiple call sites (manual "Sync now" routes + the cron fan-out route) for two
// providers, unlike that single-route case.
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";
import { isTokenVaultConfigured, openTokenBundle, type OAuthTokenVaultRecord, type TokenVaultEncryptedPayload } from "../integrations/tokenVault";

export type SocialProviderId = "meta_business" | "threads";

type IntegrationConnectionRow = {
  id: string;
  organization_id: string;
  provider_id: SocialProviderId;
  status: string;
  token_reference: string | null;
};

type OAuthTokenVaultRow = {
  organization_id: string;
  user_id: string;
  provider_id: SocialProviderId;
  token_reference: string;
  encrypted_payload: TokenVaultEncryptedPayload;
  algorithm: OAuthTokenVaultRecord["algorithm"];
  key_id: string;
  access_token_hash: string;
  refresh_token_hash: string | null;
  scopes: string[] | null;
  expires_at: string | null;
  oauth_subject?: string | null;
};

function vaultRecordFromRow(row: OAuthTokenVaultRow): OAuthTokenVaultRecord {
  return {
    providerId: row.provider_id,
    organizationId: row.organization_id,
    userId: row.user_id,
    tokenReference: row.token_reference,
    encryptedPayload: row.encrypted_payload,
    algorithm: row.algorithm,
    keyId: row.key_id,
    accessTokenHash: row.access_token_hash,
    refreshTokenHash: row.refresh_token_hash ?? undefined,
    scope: row.scopes ?? [],
    expiresAt: row.expires_at ?? undefined,
    oauthSubject: row.oauth_subject ?? undefined,
  };
}

export type ResolvedSocialConnection = { connectionId: string; organizationId: string; accessToken: string };

export async function resolveSocialConnectionToken(organizationId: string, providerId: SocialProviderId, connectionId?: string): Promise<ResolvedSocialConnection | undefined> {
  if (!isSupabaseAdminConfigured() || !isTokenVaultConfigured()) return undefined;

  const connectionQuery = new URLSearchParams({
    select: "id,organization_id,provider_id,status,token_reference",
    organization_id: `eq.${organizationId}`,
    provider_id: `eq.${providerId}`,
    status: "eq.connected",
    limit: "1",
  });
  if (connectionId) connectionQuery.set("id", `eq.${connectionId}`);
  const connections = await supabaseAdminRest<IntegrationConnectionRow[]>("integration_connections", { query: connectionQuery }).catch(() => []);
  const connection = connections?.[0];
  if (!connection?.token_reference) return undefined;

  const vaultRows = await supabaseAdminRest<OAuthTokenVaultRow[]>("oauth_token_vault", {
    query: new URLSearchParams({
      select: "organization_id,user_id,provider_id,token_reference,encrypted_payload,algorithm,key_id,access_token_hash,refresh_token_hash,scopes,expires_at,oauth_subject",
      organization_id: `eq.${organizationId}`,
      provider_id: `eq.${providerId}`,
      token_reference: `eq.${connection.token_reference}`,
      status: "eq.active",
      limit: "1",
    }),
  }).catch(() => []);
  const vaultRow = vaultRows?.[0];
  if (!vaultRow) return undefined;

  const opened = openTokenBundle(vaultRecordFromRow(vaultRow));
  return { connectionId: connection.id, organizationId: connection.organization_id, accessToken: opened.accessToken };
}

// All connected connections for a provider across every tenant -- used by the cron fan-out route.
export async function listConnectedSocialConnections(providerId: SocialProviderId, limit = 100): Promise<Array<{ id: string; organizationId: string }>> {
  if (!isSupabaseAdminConfigured()) return [];
  const query = new URLSearchParams({
    select: "id,organization_id",
    provider_id: `eq.${providerId}`,
    status: "eq.connected",
    limit: String(limit),
  });
  const rows = await supabaseAdminRest<Array<{ id: string; organization_id: string }>>("integration_connections", { query }).catch(() => []);
  return rows.map((row) => ({ id: row.id, organizationId: row.organization_id }));
}
