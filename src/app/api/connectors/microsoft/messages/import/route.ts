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
import { previewSelectedEmailImport } from "../../../../../../services/integrations/connectorContract";
import { fetchMicrosoftGraphSelectedMessage } from "../../../../../../services/integrations/microsoftGraphSelectedMessage";
import { isTokenVaultConfigured, openTokenBundle, type OAuthTokenVaultRecord, type TokenVaultEncryptedPayload } from "../../../../../../services/integrations/tokenVault";
import { ingestTenantDocument } from "../../../../../../services/rag/tenantRagWorkflow";
import { recordWorkflowTimelineEvent, upsertWorkflowProgressRecords } from "../../../../../../services/workflows/liveTenantWorkflow";

type MicrosoftImportRequest = {
  messageId?: string;
  connectionId?: string;
  confirm?: boolean;
};

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

function maxBodyCharacters() {
  const configured = Number(process.env.MICROSOFT_GRAPH_IMPORT_MAX_BODY_CHARS ?? 30000);
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 100000) : 30000;
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

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as MicrosoftImportRequest;
  const messageId = body.messageId?.trim();
  if (!messageId) return NextResponse.json({ error: "Microsoft Graph message id is required." }, { status: 400 });

  if (!isSupabaseAdminConfigured() || !isTokenVaultConfigured()) {
    return NextResponse.json({
      status: "provider_gated",
      providerId: "microsoft",
      message: "Supabase service role access and AXXESS_TOKEN_VAULT_KEY are required for live Microsoft selected-message import.",
    }, { status: 503 });
  }

  const connection = await findMicrosoftConnection(session.user.organizationId, body.connectionId);
  if (!connection?.token_reference) {
    return NextResponse.json({
      status: "provider_gated",
      providerId: "microsoft",
      message: "A connected Microsoft account with an encrypted token vault reference is required first.",
    }, { status: 409 });
  }

  const vaultRow = await findVaultRecord(session.user.organizationId, connection.token_reference);
  if (!vaultRow) {
    return NextResponse.json({
      status: "provider_gated",
      providerId: "microsoft",
      message: "The Microsoft token vault record is unavailable or revoked. Reconnect Microsoft and retry.",
    }, { status: 409 });
  }

  const opened = openTokenBundle(vaultRecordFromRow(vaultRow));
  const selectedEmail = await fetchMicrosoftGraphSelectedMessage({
    messageId,
    accessToken: opened.accessToken,
    maxBodyCharacters: maxBodyCharacters(),
  });
  const preview = previewSelectedEmailImport(selectedEmail);
  const scope = tenantScopeFromUser(session.user, session.accessToken);

  if (!body.confirm) {
    await supabaseAdminRest("microsoft_selected_message_imports", {
      method: "POST",
      body: {
        organization_id: session.user.organizationId,
        user_id: session.user.id,
        connection_id: connection.id,
        message_id: selectedEmail.messageId,
        source_link: selectedEmail.sourceLink,
        subject: selectedEmail.subject,
        from_email: selectedEmail.from,
        received_at: selectedEmail.receivedAt ?? null,
        status: "previewed",
        import_preview: preview,
        body_excerpt: selectedEmail.bodyText.slice(0, 500),
      },
    }).catch(() => undefined);
    const auditLog = await auditLogsRepository.record(scope, {
      action: "connector.microsoft.email.previewed_live",
      resourceType: "email",
      category: "integrations",
      metadata: {
        messageId: selectedEmail.messageId,
        sourceLink: selectedEmail.sourceLink,
        subject: selectedEmail.subject,
        tasks: preview.tasks.length,
        decisions: preview.decisions.length,
        stakeholders: preview.stakeholders.length,
      },
    }).catch(() => undefined);
    await recordWorkflowTimelineEvent({
      organizationId: scope.organizationId,
      resourceType: "email",
      eventType: "source_imported",
      title: "Microsoft message previewed",
      description: selectedEmail.subject,
      actorUserId: scope.userId,
      actorLabel: scope.role,
      sourceType: "microsoft",
      sourceId: selectedEmail.messageId,
      auditLogId: auditLog?.id,
      metadata: {
        requiresConfirmation: true,
        sourceLink: selectedEmail.sourceLink,
        tasks: preview.tasks.length,
        decisions: preview.decisions.length,
        stakeholders: preview.stakeholders.length,
      },
    }).catch(() => undefined);

    return NextResponse.json({
      preview,
      requiresConfirmation: true,
      selectedEmail: {
        messageId: selectedEmail.messageId,
        sourceLink: selectedEmail.sourceLink,
        from: selectedEmail.from,
        subject: selectedEmail.subject,
        receivedAt: selectedEmail.receivedAt,
        bodyExcerpt: selectedEmail.bodyText.slice(0, 700),
      },
    });
  }

  const document = await ingestTenantDocument({
    documentsRepository,
    documentVersionsRepository,
    documentPermissionsRepository,
    knowledgeArticlesRepository,
    tasksRepository,
    auditLogsRepository,
  }, scope, {
    title: `Microsoft import - ${selectedEmail.subject}`,
    bodyText: selectedEmail.bodyText,
    fileName: `${selectedEmail.messageId ?? Date.now()}-microsoft-message.txt`,
    mimeType: "message/rfc822",
    visibility: "organization",
    classification: "internal",
    tags: ["microsoft-import", "selected-message", ...preview.tags.slice(0, 4)],
  });

  const tasks = await Promise.all(preview.tasks.slice(0, 3).map((taskTitle) => tasksRepository.create(scope, {
    organizationId: scope.organizationId,
    title: taskTitle,
    description: `Created from selected Microsoft message "${selectedEmail.subject}". Source: ${selectedEmail.sourceLink ?? "selected mailbox item"}`,
    assigneeId: scope.userId,
    priority: "medium",
    status: "pending",
    tags: ["microsoft-import", "selected-message"],
  }).catch(() => undefined)));

  const createdTasks = tasks.filter((task): task is NonNullable<typeof task> => Boolean(task));
  await supabaseAdminRest("microsoft_selected_message_imports", {
    method: "POST",
    body: {
      organization_id: session.user.organizationId,
      user_id: session.user.id,
      connection_id: connection.id,
      document_id: document.document.id,
      message_id: selectedEmail.messageId,
      source_link: selectedEmail.sourceLink,
      subject: selectedEmail.subject,
      from_email: selectedEmail.from,
      received_at: selectedEmail.receivedAt ?? null,
      status: "imported",
      import_preview: preview,
      body_excerpt: selectedEmail.bodyText.slice(0, 500),
      created_task_ids: createdTasks.map((task) => task.id),
      confirmed_at: new Date().toISOString(),
    },
  }).catch(() => undefined);

  const auditLog = await auditLogsRepository.record(scope, {
    action: "connector.microsoft.email.imported_live",
    resourceType: "document",
    resourceId: document.document.id,
    category: "integrations",
    metadata: {
      messageId: selectedEmail.messageId,
      sourceLink: selectedEmail.sourceLink,
      decisions: preview.decisions,
      stakeholders: preview.stakeholders,
      createdTaskIds: createdTasks.map((task) => task.id),
    },
  }).catch(() => undefined);
  const importedEvent = await recordWorkflowTimelineEvent({
    organizationId: scope.organizationId,
    resourceType: "document",
    resourceId: document.document.id,
    eventType: "document_indexed",
    title: "Microsoft message indexed",
    description: selectedEmail.subject,
    actorUserId: scope.userId,
    actorLabel: scope.role,
    sourceType: "microsoft",
    sourceId: selectedEmail.messageId,
    auditLogId: auditLog?.id,
    metadata: {
      sourceLink: selectedEmail.sourceLink,
      chunkCount: document.chunkCount,
      tags: document.tags,
      decisions: preview.decisions,
      stakeholders: preview.stakeholders,
    },
  }).catch(() => undefined);
  const actionEvent = createdTasks[0]
    ? await recordWorkflowTimelineEvent({
      organizationId: scope.organizationId,
      resourceType: "task",
      resourceId: createdTasks[0].id,
      eventType: "workflow_action_created",
      title: "Microsoft import created confirmed task",
      description: createdTasks[0].title,
      actorUserId: scope.userId,
      actorLabel: scope.role,
      sourceType: "microsoft",
      sourceId: selectedEmail.messageId,
      auditLogId: auditLog?.id,
      metadata: { createdTaskIds: createdTasks.map((task) => task.id) },
    }).catch(() => undefined)
    : undefined;
  await upsertWorkflowProgressRecords([
    {
      organizationId: scope.organizationId,
      stepId: "knowledge-ingestion",
      status: "complete",
      lastEventId: importedEvent?.id,
      completedAt: new Date().toISOString(),
      metadata: { providerId: "microsoft", documentId: document.document.id, messageId: selectedEmail.messageId },
    },
    {
      organizationId: scope.organizationId,
      stepId: "workflow-action",
      status: createdTasks.length > 0 ? "complete" : "ready",
      lastEventId: actionEvent?.id ?? importedEvent?.id,
      completedAt: createdTasks.length > 0 ? new Date().toISOString() : undefined,
      metadata: { providerId: "microsoft", createdTaskIds: createdTasks.map((task) => task.id) },
    },
    {
      organizationId: scope.organizationId,
      stepId: "audit-evidence",
      status: "needs_review",
      lastEventId: actionEvent?.id ?? importedEvent?.id,
      metadata: { auditLogId: auditLog?.id, providerId: "microsoft" },
    },
  ]).catch(() => undefined);

  return NextResponse.json({
    preview,
    document,
    tasks: createdTasks,
  }, { status: 201 });
}
