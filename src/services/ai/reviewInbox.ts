import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type AiReviewInboxStatus = "pending" | "approved" | "edited" | "rejected" | "escalated";

export type AiReviewInboxItem = {
  id: string;
  organizationId: string;
  sourceAuditId?: string;
  taskCategory: string;
  status: AiReviewInboxStatus;
  confidence: number;
  humanReviewFlag: boolean;
  answerExcerpt: string;
  citations: Array<{ title?: string; sourceId?: string; excerpt?: string; score?: number }>;
  createdAt: string;
  reviewedAt?: string;
  decisionReason?: string;
};

type AiReviewRow = {
  id: string;
  organization_id: string;
  source_audit_id: string | null;
  task_category: string;
  status: AiReviewInboxStatus;
  confidence: number | string;
  human_review_flag: boolean;
  answer_excerpt: string | null;
  citations: AiReviewInboxItem["citations"] | null;
  created_at: string;
  reviewed_at: string | null;
  decision_reason: string | null;
};

function toInboxItem(row: AiReviewRow): AiReviewInboxItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sourceAuditId: row.source_audit_id ?? undefined,
    taskCategory: row.task_category,
    status: row.status,
    confidence: Number(row.confidence),
    humanReviewFlag: row.human_review_flag,
    answerExcerpt: row.answer_excerpt ?? "Cited AI output is awaiting tenant review.",
    citations: row.citations ?? [],
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? undefined,
    decisionReason: row.decision_reason ?? undefined,
  };
}

export function fallbackAiReviewInbox(organizationId: string): AiReviewInboxItem[] {
  return [
    {
      id: "review-oxygen-risk",
      organizationId,
      sourceAuditId: "pilot-command-ai-review-1",
      taskCategory: "risk_assessment",
      status: "pending",
      confidence: 0.74,
      humanReviewFlag: true,
      answerExcerpt: "District oxygen resilience summary requires human review before operational action.",
      citations: [{ title: "Oxygen Resilience Risk Register", sourceId: "demo-risk-register", excerpt: "Immediate governance review required.", score: 0.84 }],
      createdAt: "2026-07-15T00:00:00.000Z",
    },
    {
      id: "review-procurement-variance",
      organizationId,
      sourceAuditId: "pilot-command-ai-review-2",
      taskCategory: "compliance_review",
      status: "escalated",
      confidence: 0.61,
      humanReviewFlag: true,
      answerExcerpt: "Procurement variance evidence should be routed to the finance controller before approval actions are created.",
      citations: [{ title: "District Procurement Variance Note", sourceId: "demo-procurement-variance", excerpt: "Finance controller review remains open.", score: 0.77 }],
      createdAt: "2026-07-15T01:00:00.000Z",
    },
  ];
}

export async function listAiReviewInbox(organizationId: string, limit = 25): Promise<AiReviewInboxItem[]> {
  if (!isSupabaseAdminConfigured()) return fallbackAiReviewInbox(organizationId);
  const query = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    select: "id,organization_id,source_audit_id,task_category,status,confidence,human_review_flag,answer_excerpt,citations,created_at,reviewed_at,decision_reason",
    order: "created_at.desc",
    limit: String(limit),
  });
  const rows = await supabaseAdminRest<AiReviewRow[]>("ai_operation_reviews", { query }).catch(() => []);
  return rows.length ? rows.map(toInboxItem) : fallbackAiReviewInbox(organizationId);
}

export async function recordAiReviewDecision(input: {
  organizationId: string;
  reviewId: string;
  reviewerUserId: string;
  decision: "approved" | "edited" | "rejected" | "escalated";
  decisionReason?: string;
}) {
  const reviewedAt = new Date().toISOString();
  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("ai_operation_reviews", {
      method: "PATCH",
      query: new URLSearchParams({ id: `eq.${input.reviewId}`, organization_id: `eq.${input.organizationId}` }),
      body: {
        reviewer_user_id: input.reviewerUserId,
        status: input.decision,
        decision_reason: input.decisionReason ?? null,
        reviewed_at: reviewedAt,
      },
    });
  }

  return {
    id: input.reviewId,
    organizationId: input.organizationId,
    status: input.decision,
    reviewedAt,
    decisionReason: input.decisionReason,
  };
}
