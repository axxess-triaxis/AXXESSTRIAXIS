"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ClipboardCheck, RadioTower, ShieldCheck } from "lucide-react";
import { Card } from "../../components/ui/Card";
import type { PilotTenantAcceptanceSnapshot } from "../../services/pilot/pilotAcceptance";

const criterionTone = {
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ready: "border-blue-200 bg-blue-50 text-blue-700",
  needs_evidence: "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

const handoffTone = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  monitoring: "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function PilotAcceptancePanel({ initialSnapshot }: { initialSnapshot: PilotTenantAcceptanceSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [message, setMessage] = useState("Acceptance evidence is ready for operator review.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    void fetch("/api/admin/pilot-acceptance", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : undefined)
      .then((data: PilotTenantAcceptanceSnapshot | undefined) => {
        if (mounted && data?.criteria?.length) setSnapshot(data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  function record(decision: "accepted" | "handoff_recorded") {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/pilot-acceptance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            note: decision === "accepted"
              ? "Customer-success operator recorded pilot tenant acceptance for live operations."
              : "Customer-success operator recorded live-operations handoff.",
          }),
        });
        const data = await response.json().catch(() => undefined) as { persisted?: boolean; snapshot?: PilotTenantAcceptanceSnapshot } | undefined;
        if (data?.snapshot) setSnapshot(data.snapshot);
        setMessage(data?.persisted
          ? "Pilot acceptance evidence was recorded with live-ops audit trail."
          : "Acceptance evidence is visible; persistence is waiting for Supabase admin runtime.");
      } catch {
        setMessage("Acceptance evidence is visible; live persistence will retry when provider runtime is available.");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B1E2D]/10 text-[#8B1E2D]">
              <ClipboardCheck size={16} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#0F1117]">Pilot tenant acceptance</h2>
              <p className="text-xs text-[#5F6B73]">{snapshot.organizationName} - {label(snapshot.stage)}</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5F6B73]">
            Converts the golden path into an operator-facing acceptance record: tenant setup, knowledge ingestion, governed AI review, approved work creation, dashboard feedback, audit evidence and live handoff.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-2 rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 text-center">
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.score}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Acceptance</div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.readinessScore}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Pilot health</div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.commandCenterScore}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Ops score</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#0F1117] px-2.5 py-1 text-[11px] font-semibold capitalize text-white">{label(snapshot.status)}</span>
        <span className="rounded-full border border-[rgba(15,17,23,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[#5F6B73]">{snapshot.missingEvidenceCount} evidence gap(s)</span>
        <span className="rounded-full border border-[rgba(15,17,23,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[#5F6B73]">{snapshot.blockedCount} blocker(s)</span>
        <span className="text-xs text-[#5F6B73]">{message}</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Acceptance checklist</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {snapshot.criteria.map((item) => (
              <a key={item.id} href={item.route} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 hover:bg-[#F2F3F5]">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${criterionTone[item.status]}`}>{label(item.status)}</span>
                <span className="mt-2 block text-xs font-semibold text-[#0F1117]">{item.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[#5F6B73]">{item.detail}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <RadioTower size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Live-ops handoff</h3>
          </div>
          <div className="space-y-2">
            {snapshot.handoffs.slice(0, 4).map((item) => (
              <a key={item.id} href={item.route} className="block rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 hover:bg-[#F2F3F5]">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${handoffTone[item.status]}`}>{label(item.status)}</span>
                <span className="mt-2 block text-xs font-semibold text-[#0F1117]">{item.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-[#5F6B73]">{item.trigger}</span>
              </a>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => record("handoff_recorded")}
              disabled={isPending}
              className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-left text-xs font-semibold text-[#8B1E2D] disabled:opacity-60"
            >
              Record handoff
            </button>
            <button
              type="button"
              onClick={() => record("accepted")}
              disabled={isPending || snapshot.blockedCount > 0}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              <CheckCircle2 size={13} aria-hidden="true" /> Record pilot acceptance
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
