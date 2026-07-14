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
    await auditLogsRepository.record(scope, {
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

  await auditLogsRepository.record(scope, {
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

  return NextResponse.json({
    preview,
    document,
    tasks: tasks.filter(Boolean),
  }, { status: 201 });
}
