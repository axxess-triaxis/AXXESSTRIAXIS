"use client";

import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { adminActionFetch, useAdminAction } from "../../hooks/useAdminAction";

type AiOperationReview = {
  id: string;
  answerExcerpt: string;
  status: string;
  taskCategory?: string;
  confidence?: number;
};

const buttonClassName = "rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-left text-xs font-semibold text-[#8B1E2D] disabled:cursor-not-allowed disabled:opacity-60";

function StatusLine({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-3 text-xs text-[#5F6B73]">{message}</p>;
}

// Each panel below is its own top-level component (not an inline conditional branch) so its
// hooks are called unconditionally on every render, per React's Rules of Hooks -- AdminActionsPanel
// just picks which one mounts, and React treats a change of component type as a clean
// unmount/remount, never a mid-render hook-order change.

function ModelPolicyActions() {
  const { run, isPending } = useAdminAction();
  const [message, setMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<unknown[]>([]);
  const [policy, setPolicy] = useState<unknown>(null);

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-[#0F1117]">Admin actions</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/ai/model-policy", {
              method: "POST",
              body: JSON.stringify({ prompt: "Summarize the current tenant status for a governance review." }),
            });
            return `Routed to ${(data?.decision as { provider?: { name?: string } } | undefined)?.provider?.name ?? "a provider"} (${(data?.classification as { category?: string } | undefined)?.category ?? "uncategorized"}).`;
          }, setMessage)}
        >
          Preview routing
        </button>
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/ai/model-policy");
            setPolicy(data?.policy);
            return "Provider allowlist loaded below.";
          }, setMessage)}
        >
          Review provider allowlist
        </button>
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/ai/model-policy");
            const rows = Array.isArray(data?.recentUsage) ? data.recentUsage : [];
            setUsage(rows);
            return rows.length ? `${rows.length} recent usage ledger entr${rows.length === 1 ? "y" : "ies"} loaded below.` : "No usage ledger entries recorded yet for this tenant.";
          }, setMessage)}
        >
          Inspect usage ledger
        </button>
      </div>
      <StatusLine message={message} />
      {policy !== null && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-[#F8F9FA] p-3 text-[11px] text-[#0F1117]">{JSON.stringify(policy, null, 2)}</pre>
      )}
      {usage.length > 0 && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-[#F8F9FA] p-3 text-[11px] text-[#0F1117]">{JSON.stringify(usage, null, 2)}</pre>
      )}
    </Card>
  );
}

function PluginRuntimeActions() {
  const { run, isPending } = useAdminAction();
  const [message, setMessage] = useState<string | null>(null);
  const [pluginId, setPluginId] = useState("notion");
  const [snapshot, setSnapshot] = useState<unknown>(null);

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-[#0F1117]">Admin actions</h2>
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="plugin-id-select" className="text-xs font-semibold text-[#5F6B73]">Plugin</label>
        <select
          id="plugin-id-select"
          value={pluginId}
          onChange={(event) => setPluginId(event.target.value)}
          className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-xs text-[#0F1117]"
        >
          {["notion", "slack", "gmail", "google_drive", "outlook", "jira"].map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/plugins/runtime");
            setSnapshot(data);
            return "Plugin scope snapshot loaded below.";
          }, setMessage)}
        >
          Review plugin scopes
        </button>
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/plugins/runtime", {
              method: "POST",
              body: JSON.stringify({ pluginId, action: "connect" }),
            });
            const decision = data?.decision as { allowed?: boolean; reason?: string } | undefined;
            return decision?.allowed ? `Approved: ${decision.reason ?? "connector action allowed."}` : `Not approved: ${decision?.reason ?? "policy declined this action."}`;
          }, setMessage)}
        >
          Approve connector action
        </button>
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/plugins/runtime", {
              method: "POST",
              body: JSON.stringify({ pluginId, action: "revoke" }),
            });
            const decision = data?.decision as { allowed?: boolean; reason?: string } | undefined;
            return decision?.allowed ? `Access revoked for ${pluginId}.` : `Revoke not completed: ${decision?.reason ?? "policy declined this action."}`;
          }, setMessage)}
        >
          Revoke provider access
        </button>
      </div>
      <StatusLine message={message} />
      {snapshot !== null && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-[#F8F9FA] p-3 text-[11px] text-[#0F1117]">{JSON.stringify(snapshot, null, 2)}</pre>
      )}
    </Card>
  );
}

function ExecutionRunsActions() {
  const { run, isPending } = useAdminAction();
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<unknown>(null);

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-[#0F1117]">Admin actions</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/execution/jobs", {
              method: "POST",
              body: JSON.stringify({ kind: "ai_tool", title: "Admin console dry-run", requestedAction: "dry-run" }),
            });
            setDetail(data);
            return `Job created, status: ${(data?.run as { status?: string } | undefined)?.status ?? "unknown"}.`;
          }, setMessage)}
        >
          Create dry-run job
        </button>
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/execution/jobs");
            setDetail(data?.policies);
            return "Security-tier sandbox policies loaded below.";
          }, setMessage)}
        >
          Review sandbox policy
        </button>
        <button
          type="button"
          disabled={isPending}
          className={buttonClassName}
          onClick={() => run(async () => {
            const data = await adminActionFetch("/api/execution/jobs");
            const spec = (data?.sampleRun as { sandboxSpec?: unknown } | undefined)?.sandboxSpec;
            setDetail(spec);
            return "Sample Kubernetes sandbox spec loaded below.";
          }, setMessage)}
        >
          Inspect Kubernetes spec
        </button>
      </div>
      <StatusLine message={message} />
      {detail !== null && (
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-[#F8F9FA] p-3 text-[11px] text-[#0F1117]">{JSON.stringify(detail, null, 2)}</pre>
      )}
    </Card>
  );
}

function AiGovernanceActions() {
  const { run, isPending } = useAdminAction();
  const [message, setMessage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<AiOperationReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void adminActionFetch("/api/ai/reviews")
      .then((data) => {
        if (!mounted) return;
        const rows = Array.isArray(data?.reviews) ? data.reviews as AiOperationReview[] : [];
        setReviews(rows.filter((review) => review.status === "pending"));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      mounted = false;
    };
  }, []);

  function decide(reviewId: string, decision: "approved" | "rejected") {
    run(async () => {
      await adminActionFetch("/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewId, decision }),
      });
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      return `Review ${decision}.`;
    }, setMessage);
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-[#0F1117]">Pending AI outputs</h2>
      <p className="mt-1 text-xs text-[#5F6B73]">AI-generated outputs awaiting human review before they&rsquo;re treated as accountable work (approve/reject mirrors the AI Review Inbox&rsquo;s own RLS-equivalent gating).</p>
      <div className="mt-4 space-y-2">
        {!loaded && <p className="text-xs text-[#5F6B73]">Loading pending reviews...</p>}
        {loaded && reviews.length === 0 && <p className="text-xs text-[#5F6B73]">No AI outputs are currently pending review for this tenant.</p>}
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3">
            <p className="text-xs text-[#0F1117]">{review.answerExcerpt}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={isPending} className={buttonClassName} onClick={() => decide(review.id, "approved")}>Approve output</button>
              <button type="button" disabled={isPending} className={buttonClassName} onClick={() => decide(review.id, "rejected")}>Reject output</button>
            </div>
          </div>
        ))}
      </div>
      <StatusLine message={message} />
    </Card>
  );
}

function StaticActions({ staticActions }: { staticActions: string[] }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-[#0F1117]">Admin actions</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {staticActions.map((action) => (
          <button key={action} type="button" className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-left text-xs font-semibold text-[#8B1E2D]">
            {action}
          </button>
        ))}
      </div>
    </Card>
  );
}

// Extracted from EnterpriseAdminPage.tsx (a Server Component -- it needs to stay one, since it
// computes preview snapshots server-side) so the "Admin actions" block can be interactive.
// Wires real handlers for the panels with a real, tested backend today (model-policy,
// plugin-runtime, execution-runs, ai-governance). Every other panel falls through to the
// existing static button list -- honest placeholder, not silently pretended-real, until its own
// pass closes it (see docs/readiness/ADMIN_PANEL_WIRING_ROADMAP_2026_07_25.md).
export function AdminActionsPanel({ panel, staticActions }: { panel: string; staticActions: string[] }) {
  if (panel === "model-policy") return <ModelPolicyActions />;
  if (panel === "plugin-runtime") return <PluginRuntimeActions />;
  if (panel === "execution-runs") return <ExecutionRunsActions />;
  if (panel === "ai-governance") return <AiGovernanceActions />;
  return <StaticActions staticActions={staticActions} />;
}
