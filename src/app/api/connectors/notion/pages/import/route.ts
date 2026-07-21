import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../../auth/serverSession";
import {
  auditLogsRepository,
  documentPermissionsRepository,
  documentsRepository,
  documentVersionsRepository,
  knowledgeArticlesRepository,
  tasksRepository,
  tenantScopeFromUser,
} from "../../../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../../../repositories/supabaseAdmin";
import { fetchNotionPageBodyText } from "../../../../../../services/integrations/notionPages";
import { ingestTenantDocument } from "../../../../../../services/rag/tenantRagWorkflow";
import { isTokenVaultConfigured, openTokenBundle, type OAuthTokenVaultRecord, type TokenVaultEncryptedPayload } from "../../../../../../services/integrations/tokenVault";

type IntegrationConnectionRow = {
  id: string;
  organization_id: string;
  provider_id: "notion";
  status: string;
  token_reference: string | null;
};

type OAuthTokenVaultRow = {
  organization_id: string;
  user_id: string;
  provider_id: "notion";
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

async function findNotionConnection(organizationId: string, connectionId?: string) {
  const query = new URLSearchParams({
    select: "id,organization_id,provider_id,status,token_reference",
    organization_id: `eq.${organizationId}`,
    provider_id: "eq.notion",
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
      provider_id: "eq.notion",
      token_reference: `eq.${tokenReference}`,
      status: "eq.active",
      limit: "1",
    }),
  });
  return rows?.[0];
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { connectionId?: string; pageId?: string; title?: string; confirm?: boolean };
  if (!body.pageId?.trim()) return NextResponse.json({ error: "A Notion pageId is required." }, { status: 400 });

  if (!isSupabaseAdminConfigured() || !isTokenVaultConfigured()) {
    return NextResponse.json({ error: "Supabase service role access and AXXESS_TOKEN_VAULT_KEY are required for live Notion import." }, { status: 400 });
  }

  const connection = await findNotionConnection(session.user.organizationId, body.connectionId).catch(() => undefined);
  if (!connection?.token_reference) {
    return NextResponse.json({ error: "A connected Notion account is required before pages can be imported." }, { status: 400 });
  }
  const vaultRow = await findVaultRecord(session.user.organizationId, connection.token_reference).catch(() => undefined);
  if (!vaultRow) {
    return NextResponse.json({ error: "The Notion token vault record is unavailable or revoked. Reconnect Notion and retry." }, { status: 400 });
  }

  const opened = openTokenBundle(vaultRecordFromRow(vaultRow));
  const bodyText = await fetchNotionPageBodyText({ accessToken: opened.accessToken, pageId: body.pageId });
  const title = body.title?.trim() || "Untitled Notion page";

  if (!bodyText.trim()) {
    return NextResponse.json({ error: "This Notion page has no importable text content (only unsupported block types, e.g. embeds or nested toggles)." }, { status: 400 });
  }

  if (!body.confirm) {
    return NextResponse.json({
      preview: { title, bodyPreview: bodyText.slice(0, 500) },
      requiresConfirmation: true,
    });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const document = await ingestTenantDocument({
    documentsRepository,
    documentVersionsRepository,
    documentPermissionsRepository,
    knowledgeArticlesRepository,
    tasksRepository,
    auditLogsRepository,
  }, scope, {
    title: `Notion import - ${title}`,
    bodyText,
    fileName: `${body.pageId}-notion.txt`,
    mimeType: "text/plain",
    visibility: "organization",
    classification: "internal",
    tags: ["notion-import"],
  });

  await auditLogsRepository.record(scope, {
    action: "connector.notion.page.imported",
    resourceType: "document",
    resourceId: document.document.id,
    category: "integrations",
    metadata: { pageId: body.pageId, title },
  }).catch(() => undefined);

  return NextResponse.json({ document }, { status: 201 });
}
