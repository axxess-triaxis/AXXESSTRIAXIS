"use client";

import { useEffect, useState, useTransition } from "react";
import { Activity, BadgeCheck, Camera, ClipboardList, Rocket, ShieldCheck, Smartphone, UploadCloud } from "lucide-react";
import { Card } from "../../components/ui/Card";
import type {
  MobileBuildReadiness,
  MobileReleaseGateStatus,
  MobileReleaseHealthStatus,
  MobileReviewerStatus,
  MobileRolloutStatus,
  MobileStoreLaunchSnapshot,
  MobileStoreReadinessStatus,
} from "../../services/mobile/mobileStoreLaunch";

const readinessTone: Record<MobileStoreReadinessStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  needs_metadata: "border-amber-200 bg-amber-50 text-amber-700",
  provider_gated: "border-blue-200 bg-blue-50 text-blue-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

const gateTone: Record<MobileReleaseGateStatus, string> = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  watch: "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

const reviewerTone: Record<MobileReviewerStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  missing: "border-red-200 bg-red-50 text-red-700",
  needs_rotation: "border-amber-200 bg-amber-50 text-amber-700",
  provider_gated: "border-blue-200 bg-blue-50 text-blue-700",
};

const healthTone: Record<MobileReleaseHealthStatus, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  watch: "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

const rolloutTone: Record<MobileRolloutStatus, string> = {
  not_started: "border-slate-200 bg-slate-50 text-slate-700",
  internal_testing: "border-blue-200 bg-blue-50 text-blue-700",
  testflight: "border-blue-200 bg-blue-50 text-blue-700",
  staged: "border-amber-200 bg-amber-50 text-amber-700",
  halted: "border-red-200 bg-red-50 text-red-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function platformLabel(item: MobileBuildReadiness) {
  return item.platform === "android" ? "Android Play" : "iOS TestFlight";
}

export function MobileStoreLaunchConsole({ initialSnapshot }: { initialSnapshot: MobileStoreLaunchSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [message, setMessage] = useState("Store launch readiness is available for release operator review.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    void fetch("/api/admin/mobile-release", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : undefined)
      .then((data: MobileStoreLaunchSnapshot | undefined) => {
        if (mounted && data?.organizationId) setSnapshot(data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  function record(action: "snapshot_recorded" | "reviewer_provisioned" | "rollout_updated") {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/mobile-release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            note: action === "reviewer_provisioned"
              ? "Release operator reviewed store reviewer account readiness."
              : action === "rollout_updated"
                ? "Release operator updated staged rollout posture."
                : "Release operator recorded mobile store launch readiness snapshot.",
          }),
        });
        const data = await response.json().catch(() => undefined) as { persisted?: boolean; snapshot?: MobileStoreLaunchSnapshot; reason?: string } | undefined;
        if (data?.snapshot) setSnapshot(data.snapshot);
        setMessage(data?.persisted
          ? "Mobile release evidence was recorded with tenant audit history."
          : data?.reason ?? "Release readiness is visible; persistence is waiting for Supabase admin runtime.");
      } catch {
        setMessage("Release readiness is visible; persistence will retry when provider runtime is available.");
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B1E2D]/10 text-[#8B1E2D]">
              <Rocket size={16} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#0F1117]">Mobile store launch console</h2>
              <p className="text-xs text-[#5F6B73]">{snapshot.organizationName} - generated {formatDate(snapshot.generatedAt)}</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5F6B73]">
            Full-stack release readiness for the Capacitor mobile shell: signed build posture, store listing packs, reviewer access, screenshot evidence, health monitoring, staged rollout controls, and audit-backed release decisions.
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-2 rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 text-center">
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.readinessScore}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Readiness</div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.screenshotManifest.length}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Screens</div>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#0F1117]">{snapshot.appVersion}</div>
            <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Version</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${readinessTone[snapshot.status]}`}>{label(snapshot.status)}</span>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${healthTone[snapshot.releaseHealth.status]}`}>{label(snapshot.releaseHealth.status)} release health</span>
        <span className="rounded-full border border-[rgba(15,17,23,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[#5F6B73]">{snapshot.releaseGates.filter((gate) => gate.status === "pass").length}/{snapshot.releaseGates.length} gates pass</span>
        <span className="text-xs text-[#5F6B73]">{message}</span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {snapshot.buildReadiness.map((item) => (
          <div key={item.platform} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Smartphone size={15} className="text-[#8B1E2D]" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">{platformLabel(item)}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#0F1117]">{item.appIdentifier}</p>
                </div>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${readinessTone[item.status]}`}>{label(item.status)}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-[#F8F9FA] p-3">
                <span className="block text-[10px] font-semibold uppercase text-[#5F6B73]">Build</span>
                <span className="mt-1 block font-mono text-xs text-[#0F1117]">{item.buildNumber}</span>
              </div>
              <div className="rounded-lg bg-[#F8F9FA] p-3">
                <span className="block text-[10px] font-semibold uppercase text-[#5F6B73]">Signing</span>
                <span className="mt-1 block text-xs font-semibold capitalize text-[#0F1117]">{label(item.signingStatus)}</span>
              </div>
              <div className="rounded-lg bg-[#F8F9FA] p-3">
                <span className="block text-[10px] font-semibold uppercase text-[#5F6B73]">Track</span>
                <span className="mt-1 block text-xs font-semibold text-[#0F1117]">{item.storeTrack}</span>
              </div>
            </div>
            <p className="mt-3 break-words font-mono text-[11px] text-[#5F6B73]">{item.artifact}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Store listing packs</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {snapshot.storeListings.map((listing) => (
              <div key={listing.platform} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${readinessTone[listing.status]}`}>{label(listing.status)}</span>
                <p className="mt-2 text-xs font-semibold text-[#0F1117]">{listing.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{listing.subtitle}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {listing.evidence.map((item) => (
                    <span key={item} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#5F6B73]">{item.split("/").pop()}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <BadgeCheck size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Reviewer account</h3>
          </div>
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${reviewerTone[snapshot.reviewerAccount.status]}`}>{label(snapshot.reviewerAccount.status)}</span>
          <p className="mt-2 text-sm font-semibold text-[#0F1117]">{snapshot.reviewerAccount.email}</p>
          <p className="mt-1 text-xs text-[#5F6B73]">{snapshot.reviewerAccount.role} - rotates {formatDate(snapshot.reviewerAccount.passwordRotationDueAt)}</p>
          <div className="mt-3 space-y-2">
            {snapshot.reviewerAccount.checklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#F8F9FA] p-2">
                <span className="text-xs font-semibold text-[#0F1117]">{item.label}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${gateTone[item.status]}`}>{label(item.status)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Camera size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Screenshot manifest</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {snapshot.screenshotManifest.map((item) => (
              <a key={item.id} href={item.route} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3 hover:bg-[#F2F3F5]">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${readinessTone[item.status]}`}>{label(item.status)}</span>
                <span className="mt-2 block text-xs font-semibold text-[#0F1117]">{item.label}</span>
                <span className="mt-1 block break-words font-mono text-[11px] text-[#5F6B73]">{item.evidencePath}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Crash and release health</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {snapshot.releaseHealth.monitors.map((monitor) => (
              <div key={monitor.id} className="rounded-lg bg-[#F8F9FA] p-3">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${healthTone[monitor.status]}`}>{label(monitor.status)}</span>
                <p className="mt-2 text-xs font-semibold text-[#0F1117]">{monitor.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{monitor.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-[#F8F9FA] p-3 text-center">
              <span className="font-mono text-lg font-semibold text-[#0F1117]">{snapshot.releaseHealth.crashFreeSessions.toFixed(1)}%</span>
              <span className="block text-[10px] font-semibold uppercase text-[#5F6B73]">Crash-free</span>
            </div>
            <div className="rounded-lg bg-[#F8F9FA] p-3 text-center">
              <span className="font-mono text-lg font-semibold text-[#0F1117]">{snapshot.releaseHealth.webviewErrorRate.toFixed(1)}%</span>
              <span className="block text-[10px] font-semibold uppercase text-[#5F6B73]">Webview errors</span>
            </div>
            <div className="rounded-lg bg-[#F8F9FA] p-3 text-center">
              <span className="font-mono text-lg font-semibold text-[#0F1117]">{snapshot.releaseHealth.apiP95Ms}ms</span>
              <span className="block text-[10px] font-semibold uppercase text-[#5F6B73]">API p95</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <UploadCloud size={15} className="text-[#8B1E2D]" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Staged rollout controls</h3>
          </div>
          <div className="space-y-2">
            {snapshot.rolloutPlan.map((step) => (
              <div key={step.id} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#0F1117]">{step.track}</p>
                    <p className="mt-1 text-xs text-[#5F6B73]">{step.ownerRole} - {step.countries.join(", ")}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${rolloutTone[step.status]}`}>{label(step.status)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white">
                  <div className="h-1.5 rounded-full bg-[#8B1E2D]" style={{ width: `${Math.min(100, Math.max(0, step.rolloutPercent))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#8B1E2D]" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Release gates</h3>
            </div>
            <div className="space-y-2">
              {snapshot.releaseGates.map((gate) => (
                <a key={gate.id} href={gate.route} className="block rounded-lg bg-[#F8F9FA] p-3 hover:bg-[#F2F3F5]">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${gateTone[gate.status]}`}>{label(gate.status)}</span>
                  <span className="mt-2 block text-xs font-semibold text-[#0F1117]">{gate.label}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => record("snapshot_recorded")} disabled={isPending} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
              Record snapshot
            </button>
            <button type="button" onClick={() => record("reviewer_provisioned")} disabled={isPending} className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] disabled:opacity-60">
              Verify reviewer
            </button>
            <button type="button" onClick={() => record("rollout_updated")} disabled={isPending} className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] disabled:opacity-60">
              Update rollout
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
