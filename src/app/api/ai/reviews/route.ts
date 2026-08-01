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
import {
  approvalRequestsRepository,
  projectUpdatesRepository,
  stakeholderNotesRepository,
} from "../../../../repositories/workflowActionRepositories";
import { canDecideAiReview, canViewAiReview, getAiReviewById, listAiReviewInbox, recordAiReviewDecision } from "../../../../services/ai/reviewInbox";
import { createWorkflowActionFromAiReview } from "../../../../services/workflows/liveTenantWorkflow";
import type { ReviewWorkflowActionType } from "../../../../services/workflows/workflowEvidence";

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Sprint 5: this previously returned every review in the tenant to any authenticated member.
  // ai_operation_reviews' own RLS restricts SELECT to the review's creator, its assigned
  // reviewer, or a Super Admin/Organization Admin -- but this service reads via the service-role
  // client, so RLS never applies here. Mirror that same rule at the application layer.
  const allReviews = await listAiReviewInbox(session.user.organizationId);
  const reviews = allReviews.filter((review) => canViewAiReview(review, session.user.id, session.user.role));
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

  const scope = tenantScopeFromUser(session.user, session.accessToken);

  // Sprint 5: mirrors ai_operation_reviews_reviewer_update RLS -- only the assigned reviewer or
  // an admin role may decide a review. A review not found at all is reported the same as one the
  // caller isn't permitted to see, so this never confirms or denies another tenant's review ids.
  const targetReview = await getAiReviewById(session.user.organizationId, body.reviewId);
  if (!targetReview || !canDecideAiReview(targetReview, session.user.id, session.user.role)) {
    await auditLogsRepository.record(scope, {
      action: "ai.review.decision_denied",
      resourceType: "ai_operation_review",
      resourceId: body.reviewId,
      category: "ai-governance",
      metadata: { attemptedDecision: body.decision },
    }).catch(() => undefined);
    return NextResponse.json({ error: "This review is not assigned to you." }, { status: 403 });
  }

  const result = await recordAiReviewDecision({
    organizationId: session.user.organizationId,
    reviewId: body.reviewId,
    reviewerUserId: session.user.id,
    decision: body.decision,
    decisionReason: body.decisionReason,
  });
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
      approvalRequestsRepository,
      stakeholderNotesRepository,
      projectUpdatesRepository,
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
