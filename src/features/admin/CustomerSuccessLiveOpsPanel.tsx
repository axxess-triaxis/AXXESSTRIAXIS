"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock3, KeyRound, LifeBuoy, RadioTower, ShieldAlert } from "lucide-react";
import { Card } from "../../components/ui/Card";
import type { CustomerSuccessLiveOpsSnapshot } from "../../services/pilot/customerSuccessLiveOps";

const statusTone = {
  live_ops_ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  monitoring: "border-blue-200 bg-blue-50 text-blue-700",
  needs_attention: "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

const recoveryTone = {
  low: "border-slate-200 bg-slate-50 text-slate-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-red-200 bg-red-50 text-red-700",
};

const slaTone = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  due_soon: "border-amber-200 bg-amber-50 text-amber-700",
  breached: "border-red-200 bg-red-50 text-red-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

const keyTone = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  needs_key_owner: "border-amber-200 bg-amber-50 text-amber-700",
  provider_gated: "border-blue-200 bg-blue-50 text-blue-700",
  rotation_due: "border-red-200 bg-red-50 text-red-700",
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function CustomerSuccessLiveOpsPanel({ initialSnapshot }: { initialSnapshot: CustomerSuccessLiveOpsSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [message, setMessage] = useState("Customer-success recovery, SLA, and regional key posture are ready for operator review.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    void fetch("/api/admin/customer-success/live-ops", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : undefined)
      .then((data: CustomerSuccessLiveOpsSnapshot | undefined) => {
        if (mounted && data?.organizationId) setSnapshot(data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  function recordSnapshot() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/customer-success/live-ops", { method: "POST" });
        const data = await response.json().catch(() => undefined) as { persisted?: boolean; snapshot?: CustomerSuccessLiveOpsSnapshot; reason?: string } | undefined;
        if (data?.snapshot) setSnapshot(data.snapshot);
        setMessage(data?.persisted
          ? "Live-ops snapshot was recorded with customer-success audit evidence."
          : data?.reason ?? "Live-ops snapshot is visible; persistence is waiting for Supabase admin runtime.");
      } catch {
        setMessage("Live-ops snapshot is visible; persistence will retry when provider runtime is available.");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B1E2D]/10 text-[#8B1E2D]">
              <LifeBuoy size={16} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#0F1117]">Customer-success live operations</h2>
              <p className="text-xs text-[#5F6B73]">{snapshot.organizationName} - generated {formatDate(snapshot.generatedAt)}</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5F6B73]">
            Converts Sprint 29 pilot acceptance into customer-success execution: stuck-step recovery, SLA timers, regional key posture, and evidence-backed live-ops handoff for external pilots.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-2 rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 text-center">
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.score}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Ops score</div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.recoveryItems.length}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Recovery</div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.slaTimers.length}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">SLA timers</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTone[snapshot.status]}`}>{label(snapshot.status)}</span>
        <span className="rounded-full border border-[rgba(15,17,23,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[#5F6B73]">{snapshot.metrics.ragReadyDocuments} indexed document(s)</span>
        <span className="rounded-full border border-[rgba(15,17,23,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[#5F6B73]">{snapshot.metrics.pendingApprovals} pending approval(s)</span>
        <span className="text-xs text-[#5F6B73]">{message}</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Stuck-step recovery</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {snapshot.recoveryItems.slice(0, 6).map((item) => (
              <a key={item.id} href={item.route} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 hover:bg-[#F2F3F5]">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${recoveryTone[item.severity]}`}>{item.severity}</span>
                <span className="mt-2 block text-xs font-semibold text-[#0F1117]">{item.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[#5F6B73]">{item.ownerRole} - due {formatDate(item.dueAt)}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 size={15} className="text-[#8B1E2D]" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Live-ops SLA timers</h3>
            </div>
            <div className="space-y-2">
              {snapshot.slaTimers.slice(0, 5).map((timer) => (
                <a key={timer.id} href={timer.route} className="block rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 hover:bg-[#F2F3F5]">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${slaTone[timer.status]}`}>{label(timer.status)}</span>
                  <span className="mt-2 block text-xs font-semibold text-[#0F1117]">{timer.label}</span>
                  <span className="mt-1 block text-xs text-[#5F6B73]">{timer.ownerRole} - due {formatDate(timer.dueAt)}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound size={15} className="text-[#8B1E2D]" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Regional key policy</h3>
            </div>
            <div className="space-y-2">
              {snapshot.regionalKeyPolicies.map((policy) => (
                <div key={policy.id} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${keyTone[policy.status]}`}>{label(policy.status)}</span>
                  <span className="mt-2 block text-xs font-semibold text-[#0F1117]">{policy.policyName}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#5F6B73]">{policy.residencyNote}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="rounded-lg bg-[#F8F9FA] p-3">
          <div className="mb-2 flex items-center gap-2">
            <RadioTower size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Operator recommendations</h3>
          </div>
          <div className="grid gap-1 md:grid-cols-2">
            {snapshot.recommendations.slice(0, 4).map((recommendation) => (
              <p key={recommendation} className="text-xs leading-relaxed text-[#0F1117]">{recommendation}</p>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={recordSnapshot}
          disabled={isPending}
          className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Record live-ops snapshot
        </button>
      </div>
    </Card>
  );
}
