"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { MobileActionButton } from "../MobileActionButton";
import { useMobileTabletLayout } from "../useMobileTabletLayout";

type ApprovalRequest = {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: "pending" | "approved" | "rejected" | "changes_requested" | "completed";
  dueAt?: string;
  decisionReason?: string;
  createdAt: string;
};

// MN-2 (2026-08-23): real Approvals workflow. approvalRequestsRepository is service-role-key-gated
// (see src/repositories/workflowActionRepositories.ts) -- confirmed during MN-2 research this must
// never be imported directly into client/mobile code. This screen goes through the exact same
// existing routes desktop ApprovalsSection.tsx uses: GET /api/approvals to list, PATCH
// /api/approvals/[id] to decide, both with credentials: "include" so the session cookie carries the
// tenant scope server-side.
export function MobileApprovalsScreen() {
  const isTablet = useMobileTabletLayout();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/approvals", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { approvals?: ApprovalRequest[] }) => setApprovals(data.approvals ?? []))
      .catch(() => setApprovals([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const pending = useMemo(() => approvals.filter((a) => a.status === "pending"), [approvals]);
  const decided = useMemo(() => approvals.filter((a) => a.status !== "pending"), [approvals]);
  const selected = useMemo(() => approvals.find((a) => a.id === selectedId), [approvals, selectedId]);

  async function handleDecide(status: "approved" | "rejected") {
    if (!selected) return;
    if (status === "rejected" && !decisionReason.trim()) {
      setError("A reason is required to reject.");
      return;
    }
    setDeciding(true);
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, decisionReason: decisionReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "This approval could not be decided.");
        return;
      }
      setApprovals((prev) => prev.map((a) => (a.id === selected.id ? data.approval : a)));
      setDecisionReason("");
      setSelectedId(null);
    } finally {
      setDeciding(false);
    }
  }

  if (loading) return <LoadingState label="Approvals" />;

  const listPanel = (
    <div className="flex flex-col gap-4 px-4 py-4">
      {approvals.length === 0 ? (
        <EmptyState title="No approvals" message="Approval requests routed to you will appear here." />
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Pending ({pending.length})</h3>
              <div className="flex flex-col gap-2">
                {pending.map((a) => (
                  <button key={a.id} onClick={() => { setSelectedId(a.id); setError(null); }} className={`flex min-h-[52px] w-full flex-col items-start rounded-xl border bg-white px-3.5 py-3 text-left ${selectedId === a.id && isTablet ? "border-[#8B1E2D]" : "border-[rgba(15,17,23,0.08)]"}`}>
                    <span className="text-sm font-medium text-[#0F1117]">{a.title}</span>
                    <span className="text-[11px] text-[#5F6B73]">{a.priority} priority{a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {decided.length > 0 && (
            <div>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Decided</h3>
              <div className="flex flex-col gap-2">
                {decided.map((a) => (
                  <div key={a.id} className="flex min-h-[52px] flex-col items-start rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 opacity-80">
                    <span className="text-sm font-medium text-[#0F1117]">{a.title}</span>
                    <span className="text-[11px] text-[#5F6B73]">{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const detailPanel = selected ? (
    <div className="flex flex-col gap-3 px-4 py-4">
      <h2 className="text-base font-semibold text-[#0F1117]">{selected.title}</h2>
      {selected.description && <p className="text-sm text-[#5F6B73]">{selected.description}</p>}
      <input
        value={decisionReason}
        onChange={(e) => setDecisionReason(e.target.value)}
        placeholder="Decision reason (required to reject)"
        className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
      />
      {error && <p className="text-xs font-medium text-[#B3261E]">{error}</p>}
      <div className="flex gap-2">
        <MobileActionButton onClick={() => handleDecide("approved")} disabled={deciding} className="flex-1 justify-center">Approve</MobileActionButton>
        <MobileActionButton variant="secondary" onClick={() => handleDecide("rejected")} disabled={deciding} className="flex-1 justify-center">Reject</MobileActionButton>
      </div>
      {!isTablet && (
        <MobileActionButton variant="secondary" onClick={() => setSelectedId(null)} className="w-full justify-center">Back to list</MobileActionButton>
      )}
    </div>
  ) : (
    <EmptyState title="Select an approval" message="Choose a pending approval to review and decide." />
  );

  if (isTablet) {
    return (
      <div className="flex h-full">
        <div className="w-[42%] flex-shrink-0 overflow-y-auto border-r border-[rgba(0,0,0,0.06)]">{listPanel}</div>
        <div className="flex-1 overflow-y-auto">{detailPanel}</div>
      </div>
    );
  }

  return selectedId ? detailPanel : listPanel;
}
