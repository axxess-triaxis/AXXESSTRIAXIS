import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import {
  auditLogsRepository,
  meetingsRepository,
  notificationsRepository,
  projectsRepository,
  tasksRepository,
  tenantScopeFromUser,
} from "../../../../repositories/supabaseEnterpriseRepositories";
import { listAiReviewInbox, recordAiReviewDecision } from "../../../../services/ai/reviewInbox";
import { createWorkflowActionFromAiReview } from "../../../../services/workflows/liveTenantWorkflow";
import type { ReviewWorkflowActionType } from "../../../../services/workflows/workflowEvidence";

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const reviews = await listAiReviewInbox(session.user.organizationId);
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    reviewId?: string;
    decision?: "approved" | "edited" | "rejected" | "escalated";
    decisionReason?: string;
    createAction?: boolean;
    actionType?: ReviewWorkflowActionType;
    actionTitle?: string;
  };
  if (!body.reviewId || !body.decision) {
    return NextResponse.json({ error: "Review id and decision are required." }, { status: 400 });
  }

  const result = await recordAiReviewDecision({
    organizationId: session.user.organizationId,
    reviewId: body.reviewId,
    reviewerUserId: session.user.id,
    decision: body.decision,
    decisionReason: body.decisionReason,
  });
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const auditLog = await auditLogsRepository.record(scope, {
    action: `ai.review.${body.decision}`,
    resourceType: "ai_operation_review",
    resourceId: body.reviewId,
    category: "ai-governance",
    metadata: {
      decisionReason: body.decisionReason,
    },
  }).catch(() => undefined);

  if (body.createAction && body.decision === "approved") {
    const reviews = await listAiReviewInbox(session.user.organizationId);
    const review = reviews.find((item) => item.id === body.reviewId) ?? {
      id: body.reviewId,
      organizationId: session.user.organizationId,
      sourceAuditId: auditLog?.id,
      taskCategory: "workflow_generation",
      status: "approved" as const,
      confidence: 0.72,
      humanReviewFlag: true,
      answerExcerpt: body.actionTitle ?? "Approved AI output requires accountable workflow action.",
      citations: [],
      createdAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      decisionReason: body.decisionReason,
    };
    const workflowAction = await createWorkflowActionFromAiReview({
      tasksRepository,
      projectsRepository,
      meetingsRepository,
      notificationsRepository,
      auditLogsRepository,
    }, scope, {
      review,
      decision: body.decision,
      actionType: body.actionType ?? "task",
      actionTitle: body.actionTitle,
      notes: body.decisionReason,
    });

    return NextResponse.json({ ...result, workflowAction });
  }

  return NextResponse.json({ ...result, auditLog });
}
