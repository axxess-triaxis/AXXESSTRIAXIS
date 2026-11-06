import type { AiReviewInboxItem } from "../services/ai/reviewInbox";

// The one pending review the demo always shows. Shared by the AI Review Inbox and the AI Governance
// admin panel so the two pages can't disagree about what is pending (they did: the inbox showed this
// item while the governance panel, reading a route the demo can't reach, said nothing was pending).
export const demoPendingAiReview: AiReviewInboxItem = {
  id: "review-dibrugarh-referral-sla",
  organizationId: "demo-north-east-health-mission",
  sourceAuditId: "demo-email-import-dibrugarh-referral-sla",
  taskCategory: "workflow_execution",
  status: "pending",
  confidence: 0.82,
  humanReviewFlag: true,
  answerExcerpt: "Dibrugarh referral SLA variance should be converted into a district ambulance turnaround review task with audit evidence attached.",
  citations: [
    {
      title: "Dibrugarh Referral SLA Review",
      sourceId: "msg-dibrugarh-referral-review",
      excerpt: "Action required: assign ambulance turnaround review to the district transport coordinator by Friday.",
      score: 0.88,
    },
  ],
  createdAt: "2026-07-15T08:10:00.000Z",
};
