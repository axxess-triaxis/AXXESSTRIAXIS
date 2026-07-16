import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import {
  auditLogsRepository,
  documentPermissionsRepository,
  documentsRepository,
  documentVersionsRepository,
  knowledgeArticlesRepository,
  tasksRepository,
  tenantScopeFromUser,
} from "../../../../../repositories/supabaseEnterpriseRepositories";
import { getConnectorContract, previewSelectedEmailImport, type SelectedEmailImport } from "../../../../../services/integrations/connectorContract";
import { ingestTenantDocument } from "../../../../../services/rag/tenantRagWorkflow";
import { recordWorkflowTimelineEvent, upsertWorkflowProgressRecords } from "../../../../../services/workflows/liveTenantWorkflow";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as Partial<SelectedEmailImport> & { confirm?: boolean };
  const providerId = body.providerId ?? "gmail";
  const contract = getConnectorContract(providerId);
  if (!contract) return NextResponse.json({ error: "Unsupported email provider." }, { status: 400 });
  if (!body.subject?.trim() || !body.from?.trim() || !body.bodyText?.trim()) {
    return NextResponse.json({ error: "Email subject, sender and selected body text are required." }, { status: 400 });
  }

  const selectedEmail: SelectedEmailImport = {
    providerId: contract.providerId,
    messageId: body.messageId,
    sourceLink: body.sourceLink,
    from: body.from,
    subject: body.subject,
    receivedAt: body.receivedAt,
    bodyText: body.bodyText,
  };
  const preview = previewSelectedEmailImport(selectedEmail);
  const scope = tenantScopeFromUser(session.user, session.accessToken);

  if (!body.confirm) {
    const auditLog = await auditLogsRepository.record(scope, {
      action: `connector.${contract.providerId}.email.previewed`,
      resourceType: "email",
      category: "integrations",
      metadata: {
        subject: selectedEmail.subject,
        sourceLink: selectedEmail.sourceLink,
        tasks: preview.tasks.length,
        decisions: preview.decisions.length,
        stakeholders: preview.stakeholders.length,
      },
    }).catch(() => undefined);
    await recordWorkflowTimelineEvent({
      organizationId: scope.organizationId,
      resourceType: "email",
      eventType: "source_imported",
      title: `${contract.displayName} message previewed`,
      description: selectedEmail.subject,
      actorUserId: scope.userId,
      actorLabel: scope.role,
      sourceType: contract.providerId,
      sourceId: selectedEmail.messageId ?? selectedEmail.sourceLink ?? selectedEmail.subject,
      auditLogId: auditLog?.id,
      metadata: {
        requiresConfirmation: true,
        tasks: preview.tasks.length,
        decisions: preview.decisions.length,
        stakeholders: preview.stakeholders.length,
      },
    }).catch(() => undefined);
    return NextResponse.json({ preview, requiresConfirmation: true });
  }

  const document = await ingestTenantDocument({
    documentsRepository,
    documentVersionsRepository,
    documentPermissionsRepository,
    knowledgeArticlesRepository,
    tasksRepository,
    auditLogsRepository,
  }, scope, {
    title: `Email import - ${selectedEmail.subject}`,
    bodyText: selectedEmail.bodyText,
    fileName: `${selectedEmail.messageId ?? Date.now()}-email.txt`,
    mimeType: "message/rfc822",
    visibility: "organization",
    classification: "internal",
    tags: ["email-import", contract.providerId, ...preview.tags.slice(0, 4)],
  });

  const tasks = await Promise.all(preview.tasks.slice(0, 3).map((taskTitle) => tasksRepository.create(scope, {
    organizationId: scope.organizationId,
    title: taskTitle,
    description: `Created from ${contract.displayName} email "${selectedEmail.subject}". Source: ${selectedEmail.sourceLink ?? "selected mailbox item"}`,
    assigneeId: scope.userId,
    priority: "medium",
    status: "pending",
    tags: ["email-import", contract.providerId],
  }).catch(() => undefined)));

  const auditLog = await auditLogsRepository.record(scope, {
    action: `connector.${contract.providerId}.email.imported`,
    resourceType: "document",
    resourceId: document.document.id,
    category: "integrations",
    metadata: {
      subject: selectedEmail.subject,
      sourceLink: selectedEmail.sourceLink,
      decisions: preview.decisions,
      stakeholders: preview.stakeholders,
      createdTaskIds: tasks.filter(Boolean).map((task) => task?.id),
    },
  }).catch(() => undefined);
  const createdTasks = tasks.filter((task): task is NonNullable<typeof task> => Boolean(task));
  const sourceId = selectedEmail.messageId ?? selectedEmail.sourceLink ?? selectedEmail.subject;
  const importedEvent = await recordWorkflowTimelineEvent({
    organizationId: scope.organizationId,
    resourceType: "document",
    resourceId: document.document.id,
    eventType: "document_indexed",
    title: `${contract.displayName} message indexed`,
    description: selectedEmail.subject,
    actorUserId: scope.userId,
    actorLabel: scope.role,
    sourceType: contract.providerId,
    sourceId,
    auditLogId: auditLog?.id,
    metadata: {
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
      resourceId: createdTasks[0]?.id,
      eventType: "workflow_action_created",
      title: "Email import created confirmed task",
      description: createdTasks[0]?.title,
      actorUserId: scope.userId,
      actorLabel: scope.role,
      sourceType: contract.providerId,
      sourceId,
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
      metadata: { providerId: contract.providerId, documentId: document.document.id, sourceId },
    },
    {
      organizationId: scope.organizationId,
      stepId: "workflow-action",
      status: createdTasks.length > 0 ? "complete" : "ready",
      lastEventId: actionEvent?.id ?? importedEvent?.id,
      completedAt: createdTasks.length > 0 ? new Date().toISOString() : undefined,
      metadata: { providerId: contract.providerId, createdTaskIds: createdTasks.map((task) => task.id) },
    },
    {
      organizationId: scope.organizationId,
      stepId: "audit-evidence",
      status: "needs_review",
      lastEventId: actionEvent?.id ?? importedEvent?.id,
      metadata: { auditLogId: auditLog?.id, providerId: contract.providerId },
    },
  ]).catch(() => undefined);

  return NextResponse.json({
    preview,
    document,
    tasks: createdTasks,
  }, { status: 201 });
}
