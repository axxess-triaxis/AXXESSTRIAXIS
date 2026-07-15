import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { listAiReviewInbox, recordAiReviewDecision } from "../../../../services/ai/reviewInbox";

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
  await auditLogsRepository.record(scope, {
    action: `ai.review.${body.decision}`,
    resourceType: "ai_operation_review",
    resourceId: body.reviewId,
    category: "ai-governance",
    metadata: {
      decisionReason: body.decisionReason,
    },
  }).catch(() => undefined);

  return NextResponse.json(result);
}
