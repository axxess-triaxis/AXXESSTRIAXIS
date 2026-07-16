import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import {
  auditLogsRepository,
  documentPermissionsRepository,
  documentsRepository,
  documentVersionsRepository,
  knowledgeArticlesRepository,
  tasksRepository,
  tenantScopeFromUser,
} from "../../../../repositories/supabaseEnterpriseRepositories";
import { ingestTenantDocument } from "../../../../services/rag/tenantRagWorkflow";
import { recordWorkflowTimelineEvent, upsertWorkflowProgressRecords } from "../../../../services/workflows/liveTenantWorkflow";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    title?: string;
    bodyText?: string;
    fileName?: string;
    mimeType?: string;
    visibility?: "private" | "team" | "department" | "organization" | "shared";
    classification?: "public" | "internal" | "confidential" | "restricted";
    tags?: string[];
    projectId?: string;
  };

  try {
    const scope = tenantScopeFromUser(session.user, session.accessToken);
    const result = await ingestTenantDocument({
      documentsRepository,
      documentVersionsRepository,
      documentPermissionsRepository,
      knowledgeArticlesRepository,
      tasksRepository,
      auditLogsRepository,
    }, scope, {
      title: body.title ?? "",
      bodyText: body.bodyText ?? "",
      fileName: body.fileName,
      mimeType: body.mimeType,
      visibility: body.visibility,
      classification: body.classification,
      tags: body.tags,
      projectId: body.projectId,
    });
    const timelineEvent = await recordWorkflowTimelineEvent({
      organizationId: scope.organizationId,
      resourceType: "document",
      resourceId: result.document.id,
      eventType: "document_indexed",
      title: "Document indexed for governed retrieval",
      description: result.document.title ?? result.document.name,
      actorUserId: scope.userId,
      actorLabel: scope.role,
      sourceType: "manual-upload",
      sourceId: result.indexId,
      metadata: {
        chunkCount: result.chunkCount,
        tags: result.tags,
        humanReviewRequired: result.humanReviewRequired,
      },
    }).catch(() => undefined);
    await upsertWorkflowProgressRecords([
      {
        organizationId: scope.organizationId,
        stepId: "knowledge-ingestion",
        status: "complete",
        lastEventId: timelineEvent?.id,
        completedAt: new Date().toISOString(),
        metadata: { documentId: result.document.id, indexId: result.indexId, chunkCount: result.chunkCount },
      },
      {
        organizationId: scope.organizationId,
        stepId: "grounded-question",
        status: "ready",
        lastEventId: timelineEvent?.id,
        metadata: { documentId: result.document.id, indexId: result.indexId },
      },
    ]).catch(() => undefined);
    return NextResponse.json({ ...result, timelineEvent }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document ingestion failed." }, { status: 400 });
  }
}
