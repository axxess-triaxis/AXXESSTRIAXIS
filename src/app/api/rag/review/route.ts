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
import { reviewTenantRagAnswer } from "../../../../services/rag/tenantRagWorkflow";
import { recordWorkflowTimelineEvent, upsertWorkflowProgressRecords } from "../../../../services/workflows/liveTenantWorkflow";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    aiOutputAuditId?: string;
    decision?: "approved" | "rejected";
    notes?: string;
    createTask?: boolean;
    taskTitle?: string;
  };
  if (!body.aiOutputAuditId || (body.decision !== "approved" && body.decision !== "rejected")) {
    return NextResponse.json({ error: "AI output id and review decision are required." }, { status: 400 });
  }

  try {
    const scope = tenantScopeFromUser(session.user, session.accessToken);
    const result = await reviewTenantRagAnswer({
      documentsRepository,
      documentVersionsRepository,
      documentPermissionsRepository,
      knowledgeArticlesRepository,
      tasksRepository,
      auditLogsRepository,
    }, scope, {
      aiOutputAuditId: body.aiOutputAuditId,
      decision: body.decision,
      notes: body.notes,
      createTask: body.createTask,
      taskTitle: body.taskTitle,
    });
    const decisionEvent = await recordWorkflowTimelineEvent({
      organizationId: scope.organizationId,
      resourceType: "ai_review",
      resourceId: body.aiOutputAuditId,
      eventType: "human_decision",
      title: `RAG answer ${body.decision}`,
      description: body.notes,
      actorUserId: scope.userId,
      actorLabel: scope.role,
      sourceType: "ai_output_audit",
      sourceId: body.aiOutputAuditId,
      metadata: {
        createTask: Boolean(result.task),
        reviewId: result.reviewId,
      },
    }).catch(() => undefined);
    const actionEvent = result.task
      ? await recordWorkflowTimelineEvent({
        organizationId: scope.organizationId,
        resourceType: "task",
        resourceId: result.task.id,
        eventType: "workflow_action_created",
        title: "Task created from approved RAG answer",
        description: result.task.title,
        actorUserId: scope.userId,
        actorLabel: scope.role,
        sourceType: "ai_output_audit",
        sourceId: body.aiOutputAuditId,
        metadata: { reviewId: result.reviewId },
      }).catch(() => undefined)
      : undefined;
    await upsertWorkflowProgressRecords([
      {
        organizationId: scope.organizationId,
        stepId: "human-review",
        status: "complete",
        lastEventId: decisionEvent?.id,
        completedAt: new Date().toISOString(),
        metadata: { aiOutputAuditId: body.aiOutputAuditId, decision: body.decision },
      },
      {
        organizationId: scope.organizationId,
        stepId: "workflow-action",
        status: result.task ? "complete" : "ready",
        lastEventId: actionEvent?.id ?? decisionEvent?.id,
        completedAt: result.task ? new Date().toISOString() : undefined,
        metadata: { aiOutputAuditId: body.aiOutputAuditId, taskId: result.task?.id },
      },
      {
        organizationId: scope.organizationId,
        stepId: "audit-evidence",
        status: "needs_review",
        lastEventId: actionEvent?.id ?? decisionEvent?.id,
        metadata: { aiOutputAuditId: body.aiOutputAuditId, reviewId: result.reviewId },
      },
    ]).catch(() => undefined);
    return NextResponse.json({ ...result, timelineEvents: [decisionEvent, actionEvent].filter(Boolean) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "RAG review failed." }, { status: 400 });
  }
}
