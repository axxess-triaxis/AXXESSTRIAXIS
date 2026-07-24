import type { RoleName } from "../../domain";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type AiReviewInboxStatus = "pending" | "approved" | "edited" | "rejected" | "escalated";

// Roles that see and decide the full tenant review queue, mirroring exactly the
// has_any_role_text(organization_id, ['Super Admin', 'Organization Admin']) branch in the
// ai_operation_reviews RLS policies (supabase/migrations/202607150001_sprint22_23_pilot_command_center.sql).
// This list must stay in sync with that policy -- it is not a separate app-layer judgment call.
const AI_REVIEW_ADMIN_ROLES: RoleName[] = ["Super Admin", "Organization Admin"];

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
  createdByUserId?: string;
  reviewerUserId?: string;
};

type AiReviewRow = {
  id: string;
  organization_id: string;
  created_by_user_id: string | null;
  reviewer_user_id: string | null;
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
    createdByUserId: row.created_by_user_id ?? undefined,
    reviewerUserId: row.reviewer_user_id ?? undefined,
  };
}

// Sprint 5: GET /api/ai/reviews previously returned every review in the tenant to any
// authenticated member, regardless of role -- the ai_operation_reviews table's own RLS (never
// applied here, since this whole service reads via the service-role client) restricts SELECT to
// the review's creator, its assigned reviewer, or a Super Admin/Organization Admin. This mirrors
// that policy at the application layer, since a service-role read has no RLS to fall back on.
export function canViewAiReview(review: Pick<AiReviewInboxItem, "createdByUserId" | "reviewerUserId">, userId: string, role: RoleName): boolean {
  if (AI_REVIEW_ADMIN_ROLES.includes(role)) return true;
  if (review.createdByUserId && review.createdByUserId === userId) return true;
  if (review.reviewerUserId && review.reviewerUserId === userId) return true;
  return false;
}

// Mirrors the ai_operation_reviews_reviewer_update RLS policy: reviewer_user_id = auth.uid() or
// an admin role. A review with no reviewer assigned yet (reviewer_user_id null) can only be
// decided by an admin -- exactly as the database itself would enforce, not a looser app-layer rule.
export function canDecideAiReview(review: Pick<AiReviewInboxItem, "reviewerUserId">, userId: string, role: RoleName): boolean {
  if (AI_REVIEW_ADMIN_ROLES.includes(role)) return true;
  return Boolean(review.reviewerUserId && review.reviewerUserId === userId);
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
  // A real tenant with zero pending reviews must see an empty inbox, not fabricated review items.
  // Demo content only when genuinely in demo mode. See DEMO_DATA_LEAKAGE_AUDIT.md.
  if (!isSupabaseAdminConfigured()) return isDemoModeEnabled() ? fallbackAiReviewInbox(organizationId) : [];
  const query = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    select: "id,organization_id,created_by_user_id,reviewer_user_id,source_audit_id,task_category,status,confidence,human_review_flag,answer_excerpt,citations,created_at,reviewed_at,decision_reason",
    order: "created_at.desc",
    limit: String(limit),
  });
  const rows = await supabaseAdminRest<AiReviewRow[]>("ai_operation_reviews", { query }).catch(() => []);
  return rows.map(toInboxItem);
}

// Precise, race-free lookup for a single review by id -- listAiReviewInbox is capped at a page
// size and ordered by recency, so it cannot be relied on to contain an older review's id.
export async function getAiReviewById(organizationId: string, reviewId: string): Promise<AiReviewInboxItem | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const query = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    id: `eq.${reviewId}`,
    select: "id,organization_id,created_by_user_id,reviewer_user_id,source_audit_id,task_category,status,confidence,human_review_flag,answer_excerpt,citations,created_at,reviewed_at,decision_reason",
    limit: "1",
  });
  const rows = await supabaseAdminRest<AiReviewRow[]>("ai_operation_reviews", { query }).catch(() => []);
  return rows[0] ? toInboxItem(rows[0]) : undefined;
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
