import type { RoleName } from "../../domain";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";
import type { RagConfidenceExplanation } from "../rag/confidenceExplanation";

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
  /** RAG Remediation Sprint 2 (A-63): the original question, full (non-excerpted) answer, and
   * confidence explanation, when the source_audit_id -> ai_operation_reviews write included them
   * in metadata (see tenantRagWorkflow.ts's answerTenantQuestion). Not present on older rows or
   * reviews created by a non-RAG task category. */
  question?: string;
  fullAnswer?: string;
  confidenceExplanation?: RagConfidenceExplanation;
};

export type AiReviewRow = {
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
  metadata: { question?: string; fullAnswer?: string; confidenceExplanation?: RagConfidenceExplanation } | null;
  created_at: string;
  reviewed_at: string | null;
  decision_reason: string | null;
};

// Exported for direct unit testing of the metadata -> question/fullAnswer/confidenceExplanation
// mapping (RAG Remediation Sprint 2, A-63) without needing a live Supabase-backed integration test.
export function toInboxItem(row: AiReviewRow): AiReviewInboxItem {
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
    question: row.metadata?.question,
    fullAnswer: row.metadata?.fullAnswer,
    confidenceExplanation: row.metadata?.confidenceExplanation,
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

const fallbackReviewTemplates: Array<{ taskCategory: string; excerpt: string; citationTitle: string; citationExcerpt: string; status: AiReviewInboxStatus; confidence: number }> = [
  { taskCategory: "risk_assessment", excerpt: "District oxygen resilience summary requires human review before operational action.", citationTitle: "Oxygen Resilience Risk Register", citationExcerpt: "Immediate governance review required.", status: "pending", confidence: 0.74 },
  { taskCategory: "compliance_review", excerpt: "Procurement variance evidence should be routed to the finance controller before approval actions are created.", citationTitle: "District Procurement Variance Note", citationExcerpt: "Finance controller review remains open.", status: "escalated", confidence: 0.61 },
  { taskCategory: "governed_rag_answer", excerpt: "Maternal referral turnaround summary cites two district corridors with above-threshold delay.", citationTitle: "Maternal Referral Network Report", citationExcerpt: "Referral turnaround above target in two corridors.", status: "pending", confidence: 0.79 },
  { taskCategory: "governed_rag_answer", excerpt: "Immunization cold-chain gap summary identifies a district storage risk.", citationTitle: "Immunization Cold-Chain Upgrade Log", citationExcerpt: "Storage temperature excursion recorded.", status: "approved", confidence: 0.86 },
  { taskCategory: "workflow_generation", excerpt: "Suggested follow-up task for tuberculosis screening acceleration district review.", citationTitle: "Tuberculosis Screening Acceleration Note", citationExcerpt: "Field team requested district-level review.", status: "pending", confidence: 0.68 },
  { taskCategory: "compliance_review", excerpt: "Emergency stockpile modernization audit observation needs governance sign-off.", citationTitle: "Emergency Stockpile Audit Observation", citationExcerpt: "Control gap identified in stockpile rotation.", status: "rejected", confidence: 0.52 },
  { taskCategory: "risk_assessment", excerpt: "Rural diagnostics access risk note flags vendor delivery delay.", citationTitle: "Rural Diagnostics Vendor Risk Note", citationExcerpt: "Delivery delay exceeds contracted SLA.", status: "pending", confidence: 0.71 },
  { taskCategory: "governed_rag_answer", excerpt: "Hospital discharge coordination summary cites a staffing bottleneck.", citationTitle: "Hospital Discharge Coordination Report", citationExcerpt: "Staffing bottleneck identified on evening shift.", status: "edited", confidence: 0.83 },
];

// Deterministic, seeded generation so the investor demo AI Review Inbox always shows the same
// coherent, enterprise-scale queue (~100 items) across sessions -- no randomness.
export function fallbackAiReviewInbox(organizationId: string): AiReviewInboxItem[] {
  const base = new Date("2026-07-15T00:00:00.000Z").getTime();
  return Array.from({ length: 100 }, (_, index) => {
    const template = fallbackReviewTemplates[index % fallbackReviewTemplates.length];
    return {
      id: `review-demo-${String(index + 1).padStart(3, "0")}`,
      organizationId,
      sourceAuditId: `pilot-command-ai-review-${index + 1}`,
      taskCategory: template.taskCategory,
      status: template.status,
      confidence: template.confidence,
      humanReviewFlag: template.status === "pending" || template.status === "escalated",
      answerExcerpt: template.excerpt,
      citations: [{ title: template.citationTitle, sourceId: `demo-citation-${index + 1}`, excerpt: template.citationExcerpt, score: 0.6 + (index % 4) * 0.1 }],
      createdAt: new Date(base + index * 45 * 60 * 1000).toISOString(),
    };
  });
}

export async function listAiReviewInbox(organizationId: string, limit = 25): Promise<AiReviewInboxItem[]> {
  // A real tenant with zero pending reviews must see an empty inbox, not fabricated review items.
  // Demo content only when genuinely in demo mode. See DEMO_DATA_LEAKAGE_AUDIT.md.
  if (!isSupabaseAdminConfigured()) return isDemoModeEnabled() ? fallbackAiReviewInbox(organizationId) : [];
  const query = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    select: "id,organization_id,created_by_user_id,reviewer_user_id,source_audit_id,task_category,status,confidence,human_review_flag,answer_excerpt,citations,metadata,created_at,reviewed_at,decision_reason",
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
    select: "id,organization_id,created_by_user_id,reviewer_user_id,source_audit_id,task_category,status,confidence,human_review_flag,answer_excerpt,citations,metadata,created_at,reviewed_at,decision_reason",
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
