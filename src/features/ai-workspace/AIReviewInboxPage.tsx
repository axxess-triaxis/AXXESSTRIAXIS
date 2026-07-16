"use client";

import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { WorkflowTimelinePanel } from "../../components/enterprise/WorkflowTimelinePanel";
import type { AiReviewInboxItem } from "../../services/ai/reviewInbox";
import { workflowActionLabels, type ReviewWorkflowActionType, type WorkflowTimelineEvent } from "../../services/workflows/workflowEvidence";
import { useWorkflowTimeline } from "../../hooks/useWorkflowTimeline";

type ReviewResponse = {
  reviews?: AiReviewInboxItem[];
  error?: string;
};

type DecisionResponse = {
  error?: string;
  workflowAction?: {
    actionType?: ReviewWorkflowActionType;
    createdTask?: { id: string; title: string };
    createdMeeting?: { id: string; title: string };
    timelineEvents?: WorkflowTimelineEvent[];
  };
};

const statusStyle: Record<AiReviewInboxItem["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  edited: "bg-blue-50 text-blue-700 border-blue-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  escalated: "bg-purple-50 text-purple-700 border-purple-200",
};

const actionTypes = Object.entries(workflowActionLabels) as Array<[ReviewWorkflowActionType, string]>;
const isDemoReviewFallbackEnabled = process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true" || process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL === "true";

export function AIReviewInboxPage() {
  const [reviews, setReviews] = useState<AiReviewInboxItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ReviewWorkflowActionType>("task");
  const [actionTitles, setActionTitles] = useState<Record<string, string>>({});
  const [localEvents, setLocalEvents] = useState<WorkflowTimelineEvent[]>([]);
  const workflowTimeline = useWorkflowTimeline(undefined, { limit: 6 });

  async function loadReviews() {
    const response = await fetch("/api/ai/reviews", { credentials: "include" });
    const payload = await response.json().catch(() => ({})) as ReviewResponse;
    if (!response.ok) {
      setMessage(payload.error ?? "AI review inbox could not be loaded.");
      return;
    }
    setReviews(withPendingDemoReview(payload.reviews ?? []));
  }

  async function decide(reviewId: string, decision: "approved" | "edited" | "rejected" | "escalated", createAction = false) {
    setMessage(null);
    const response = await fetch("/api/ai/reviews", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewId,
        decision,
        decisionReason: createAction ? `Approved from tenant AI review inbox and converted to ${workflowActionLabels[actionType].toLowerCase()}.` : `Marked ${decision} from tenant AI review inbox.`,
        createAction,
        actionType,
        actionTitle: actionTitles[reviewId],
      }),
    });
    const payload = await response.json().catch(() => ({})) as DecisionResponse;
    if (!response.ok) {
      setMessage(payload.error ?? "AI review decision could not be recorded.");
      return;
    }
    setReviews((current) => current.map((review) => review.id === reviewId ? { ...review, status: decision, reviewedAt: new Date().toISOString() } : review));
    if (payload.workflowAction?.timelineEvents?.length) {
      setLocalEvents((current) => [...payload.workflowAction!.timelineEvents!, ...current].slice(0, 8));
    }
    const createdTitle = payload.workflowAction?.createdTask?.title ?? payload.workflowAction?.createdMeeting?.title;
    setMessage(createAction && createdTitle ? `Review approved and ${createdTitle} was created.` : `Review ${decision} and audit logging requested.`);
  }

  useEffect(() => {
    void loadReviews();
  }, []);

  return (
    <main className="min-h-screen bg-[#F2F3F5] px-4 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          title="AI Review Inbox"
          subtitle="Review cited AI outputs before they become tasks, approvals, stakeholder updates, or sandboxed workflow actions."
        />
        {message && (
          <Card className="mb-4 border-[#8B1E2D]/20 bg-[#FFF8F8] p-4 text-sm font-semibold text-[#8B1E2D]">
            {message}
          </Card>
        )}
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="grid gap-4">
          {reviews.length === 0 && (
            <Card className="p-5 text-sm text-[#5F6B73]">
              No AI outputs are waiting for review right now.
            </Card>
          )}
          {reviews.map((review) => {
            const decisionDisabled = review.status !== "pending";
            return (
            <Card key={review.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-[#5F6B73]">{review.taskCategory.replace(/_/g, " ")}</div>
                  <h2 className="mt-1 text-base font-bold text-[#0F1117]">{review.answerExcerpt}</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[review.status]}`}>
                  {review.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-[#F8F9FA] p-3">
                  <div className="text-[11px] font-semibold uppercase text-[#5F6B73]">Confidence</div>
                  <div className="mt-1 text-lg font-bold text-[#0F1117]">{Math.round(review.confidence * 100)}%</div>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-3">
                  <div className="text-[11px] font-semibold uppercase text-[#5F6B73]">Review</div>
                  <div className="mt-1 text-sm font-bold text-[#0F1117]">{review.humanReviewFlag ? "Human approval required" : "No mandatory review"}</div>
                </div>
                <div className="rounded-lg bg-[#F8F9FA] p-3">
                  <div className="text-[11px] font-semibold uppercase text-[#5F6B73]">Sources</div>
                  <div className="mt-1 text-sm font-bold text-[#0F1117]">{review.citations.length} cited source(s)</div>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {review.citations.slice(0, 3).map((citation, index) => (
                  <div key={`${review.id}-${citation.sourceId ?? index}`} className="rounded-lg border border-[rgba(15,17,23,0.08)] p-3 text-xs text-[#5F6B73]">
                    <span className="font-bold text-[#0F1117]">{citation.title ?? "Institutional source"}:</span> {citation.excerpt ?? citation.sourceId}
                  </div>
                ))}
              </div>
              {review.status === "pending" && (
                <div className="mt-4 grid gap-2 rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 md:grid-cols-[180px_1fr]">
                  <select
                    aria-label="Approved action type"
                    value={actionType}
                    onChange={(event) => setActionType(event.target.value as ReviewWorkflowActionType)}
                    className="rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 py-2 text-xs font-semibold text-[#0F1117] outline-none"
                  >
                    {actionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input
                    value={actionTitles[review.id] ?? ""}
                    onChange={(event) => setActionTitles((current) => ({ ...current, [review.id]: event.target.value }))}
                    placeholder="Optional action title"
                    className="rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 py-2 text-xs outline-none"
                  />
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={decisionDisabled} onClick={() => void decide(review.id, "approved", true)} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Approve and create</button>
                <button disabled={decisionDisabled} onClick={() => void decide(review.id, "approved")} className="rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 py-2 text-xs font-bold text-[#0F1117] disabled:cursor-not-allowed disabled:opacity-50">Approve only</button>
                <button disabled={decisionDisabled} onClick={() => void decide(review.id, "edited")} className="rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 py-2 text-xs font-bold text-[#0F1117] disabled:cursor-not-allowed disabled:opacity-50">Mark edited</button>
                <button disabled={decisionDisabled} onClick={() => void decide(review.id, "escalated")} className="rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 py-2 text-xs font-bold text-[#0F1117] disabled:cursor-not-allowed disabled:opacity-50">Escalate</button>
                <button disabled={decisionDisabled} onClick={() => void decide(review.id, "rejected")} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">Reject</button>
              </div>
            </Card>
          );})}
          </div>
          <WorkflowTimelinePanel
            title="Review-to-work timeline"
            description="Approvals, created actions and audit events appear here as tenant workflow evidence."
            events={[...localEvents, ...workflowTimeline.timeline]}
            compact
          />
        </div>
      </div>
    </main>
  );
}

function withPendingDemoReview(reviews: AiReviewInboxItem[]) {
  if (!isDemoReviewFallbackEnabled || reviews.some((review) => review.status === "pending")) return reviews;
  const demoReview: AiReviewInboxItem = {
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
  return [
    demoReview,
    ...reviews,
  ];
}
