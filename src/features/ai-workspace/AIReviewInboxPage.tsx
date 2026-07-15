"use client";

import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { SectionHeader } from "../../components/layout/SectionHeader";
import type { AiReviewInboxItem } from "../../services/ai/reviewInbox";

type ReviewResponse = {
  reviews?: AiReviewInboxItem[];
  error?: string;
};

const statusStyle: Record<AiReviewInboxItem["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  edited: "bg-blue-50 text-blue-700 border-blue-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  escalated: "bg-purple-50 text-purple-700 border-purple-200",
};

export function AIReviewInboxPage() {
  const [reviews, setReviews] = useState<AiReviewInboxItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function loadReviews() {
    const response = await fetch("/api/ai/reviews", { credentials: "include" });
    const payload = await response.json().catch(() => ({})) as ReviewResponse;
    if (!response.ok) {
      setMessage(payload.error ?? "AI review inbox could not be loaded.");
      return;
    }
    setReviews(payload.reviews ?? []);
  }

  async function decide(reviewId: string, decision: "approved" | "edited" | "rejected" | "escalated") {
    setMessage(null);
    const response = await fetch("/api/ai/reviews", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewId,
        decision,
        decisionReason: `Marked ${decision} from tenant AI review inbox.`,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setMessage(payload.error ?? "AI review decision could not be recorded.");
      return;
    }
    setReviews((current) => current.map((review) => review.id === reviewId ? { ...review, status: decision, reviewedAt: new Date().toISOString() } : review));
    setMessage(`Review ${decision} and audit logging requested.`);
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
        <div className="grid gap-4">
          {reviews.length === 0 && (
            <Card className="p-5 text-sm text-[#5F6B73]">
              No AI outputs are waiting for review right now.
            </Card>
          )}
          {reviews.map((review) => (
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
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => void decide(review.id, "approved")} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-bold text-white">Approve</button>
                <button onClick={() => void decide(review.id, "edited")} className="rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 py-2 text-xs font-bold text-[#0F1117]">Mark edited</button>
                <button onClick={() => void decide(review.id, "escalated")} className="rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 py-2 text-xs font-bold text-[#0F1117]">Escalate</button>
                <button onClick={() => void decide(review.id, "rejected")} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Reject</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
