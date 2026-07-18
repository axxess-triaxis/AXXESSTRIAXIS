import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../../auth/serverSession";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../../../repositories/supabaseAdmin";
import { fetchMicrosoftGraphMailboxMessages } from "../../../../../../services/integrations/microsoftGraphMailbox";
import { isTokenVaultConfigured, openTokenBundle, type OAuthTokenVaultRecord, type TokenVaultEncryptedPayload } from "../../../../../../services/integrations/tokenVault";

type IntegrationConnectionRow = {
  id: string;
  organization_id: string;
  provider_id: "microsoft";
  status: string;
  token_reference: string | null;
  scopes: string[] | null;
};

type OAuthTokenVaultRow = {
  organization_id: string;
  user_id: string;
  provider_id: "microsoft";
  token_reference: string;
  encrypted_payload: TokenVaultEncryptedPayload;
  algorithm: OAuthTokenVaultRecord["algorithm"];
  key_id: string;
  access_token_hash: string;
  refresh_token_hash: string | null;
  scopes: string[] | null;
  expires_at: string | null;
  oauth_subject?: string | null;
  status: string;
};

function providerGated(message: string) {
  return NextResponse.json({
    providerId: "microsoft",
    providerGated: true,
    messages: [],
    message,
  });
}

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

async function findMicrosoftConnection(organizationId: string, connectionId?: string) {
  const query = new URLSearchParams({
    select: "id,organization_id,provider_id,status,token_reference,scopes",
    organization_id: `eq.${organizationId}`,
    provider_id: "eq.microsoft",
    status: "eq.connected",
    limit: "1",
  });
  if (connectionId) query.set("id", `eq.${connectionId}`);
  const rows = await supabaseAdminRest<IntegrationConnectionRow[]>("integration_connections", { query });
  return rows?.[0];
}

async function findVaultRecord(organizationId: string, tokenReference: string) {
  const rows = await supabaseAdminRest<OAuthTokenVaultRow[]>("oauth_token_vault", {
    query: new URLSearchParams({
      select: "organization_id,user_id,provider_id,token_reference,encrypted_payload,algorithm,key_id,access_token_hash,refresh_token_hash,scopes,expires_at,oauth_subject,status",
      organization_id: `eq.${organizationId}`,
      provider_id: "eq.microsoft",
      token_reference: `eq.${tokenReference}`,
      status: "eq.active",
      limit: "1",
    }),
  });
  return rows?.[0];
}

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connectionId") ?? undefined;
  const folderId = url.searchParams.get("folderId") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? 10);

  if (!isSupabaseAdminConfigured() || !isTokenVaultConfigured()) {
    return providerGated("Supabase service role access and AXXESS_TOKEN_VAULT_KEY are required for live Microsoft mailbox listing.");
  }

  const connection = await findMicrosoftConnection(session.user.organizationId, connectionId).catch(() => undefined);
  if (!connection?.token_reference) {
    return providerGated("A connected Microsoft account with an encrypted token vault reference is required before mailbox messages can be listed.");
  }

  const vaultRow = await findVaultRecord(session.user.organizationId, connection.token_reference).catch(() => undefined);
  if (!vaultRow) {
    return providerGated("The Microsoft token vault record is unavailable or revoked. Reconnect Microsoft and retry.");
  }

  const opened = openTokenBundle(vaultRecordFromRow(vaultRow));
  const messages = await fetchMicrosoftGraphMailboxMessages({
    accessToken: opened.accessToken,
    folderId,
    limit,
  });

  return NextResponse.json({
    providerId: "microsoft",
    providerGated: false,
    connectionId: connection.id,
    messages,
  });
}
