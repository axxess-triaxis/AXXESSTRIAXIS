import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { EnterpriseGoldenPathSnapshot, EnterpriseWorkflowStatus, GoldenPathDisplayMode } from "../../services/workflows/enterpriseGoldenPath";
import { EnterpriseBadge, SectionCard } from "./index";

const statusTone: Record<EnterpriseWorkflowStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  complete: "success",
  active: "info",
  ready: "neutral",
  "needs-review": "warning",
  blocked: "danger",
};

const statusLabel: Record<EnterpriseWorkflowStatus, string> = {
  complete: "Complete",
  active: "Active",
  ready: "Ready",
  "needs-review": "Needs review",
  blocked: "Blocked",
};

function statusIcon(status: EnterpriseWorkflowStatus, locked: boolean) {
  if (locked) return Lock;
  if (status === "complete") return CheckCircle2;
  if (status === "needs-review") return AlertTriangle;
  if (status === "blocked") return Lock;
  return CircleDot;
}

export function EnterpriseWorkflowJourney({
  snapshot,
  compact = false,
  displayMode = "guided",
  onDisplayModeChange,
}: {
  snapshot: EnterpriseGoldenPathSnapshot;
  compact?: boolean;
  /** "guided" always shows the full step-by-step journey; "on-demand" (default for most users) starts
   * collapsed to a single summary card so the journey doesn't feel forced on every visit. */
  displayMode?: GoldenPathDisplayMode;
  onDisplayModeChange?: (mode: GoldenPathDisplayMode) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const showFullDetail = displayMode === "guided" || expanded;
  const visibleSteps = compact ? snapshot.steps.slice(0, 5) : snapshot.steps;

  if (!showFullDetail) {
    return (
      <SectionCard
        title={snapshot.title}
        description="Optional guided setup path — most returning users can skip this."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <EnterpriseBadge label={`${snapshot.readinessScore}% ready`} tone={snapshot.readinessScore >= 80 ? "success" : "warning"} icon={ShieldCheck} />
            <EnterpriseBadge label={`${snapshot.completionPercent}% complete`} tone="brand" />
          </div>
        }
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3 text-left text-xs font-semibold text-[#8B1E2D] transition-colors hover:border-[#8B1E2D]/30 hover:bg-[#F8F9FA]"
        >
          <span>View recommended setup path ({snapshot.steps.length} steps, {snapshot.completionPercent}% complete)</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={snapshot.title}
      description={compact ? "Current tenant journey from knowledge to governed action." : snapshot.narrative}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <EnterpriseBadge label={`${snapshot.readinessScore}% ready`} tone={snapshot.readinessScore >= 80 ? "success" : "warning"} icon={ShieldCheck} />
          <EnterpriseBadge label={`${snapshot.completionPercent}% complete`} tone="brand" />
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className={compact ? "space-y-2" : "grid gap-2 md:grid-cols-2"}>
          {visibleSteps.map((step, index) => {
            const Icon = statusIcon(step.status, step.lockedForRole);
            const helperText = step.lockedForRole
              ? `Requires ${step.requiredRoles.join(" or ")}`
              : step.status === "blocked" && step.blockedReason
                ? step.blockedReason
                : undefined;
            return (
              <a
                key={step.id}
                href={step.route}
                className="group rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3 transition-colors hover:border-[#8B1E2D]/30 hover:bg-[#F8F9FA] focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/25"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#F2F3F5] text-[#8B1E2D]">
                    <Icon size={14} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-[#5F6B73]">{String(index + 1).padStart(2, "0")}</span>
                      <span className="text-xs font-semibold text-[#0F1117]">{step.title}</span>
                      <EnterpriseBadge label={step.lockedForRole ? "Read only" : statusLabel[step.status]} tone={step.lockedForRole ? "neutral" : statusTone[step.status]} />
                    </span>
                    {!compact && <span className="mt-1 block text-xs leading-relaxed text-[#5F6B73]">{step.description}</span>}
                    {helperText && (
                      <span className="mt-1 block text-[10px] font-semibold leading-relaxed text-[#8B1E2D]">{helperText}</span>
                    )}
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="rounded bg-[#F2F3F5] px-1.5 py-0.5 font-semibold text-[#5F6B73]">{step.module}</span>
                      <span className="font-mono text-[#5F6B73]">{step.metricLabel}: {step.metricValue}</span>
                    </span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        <div className="rounded-lg border border-[#8B1E2D]/15 bg-[#8B1E2D]/8 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B1E2D]">Next best action</p>
          <a href={snapshot.nextBestAction.route} className="mt-2 flex items-start justify-between gap-3 rounded-lg bg-white p-3 text-left transition-colors hover:bg-[#F8F9FA]">
            <span>
              <span className="block text-sm font-semibold leading-snug text-[#0F1117]">{snapshot.nextBestAction.label}</span>
              <span className="mt-1 line-clamp-3 block text-xs leading-relaxed text-[#5F6B73]">{snapshot.nextBestAction.reason}</span>
            </span>
            <ArrowRight size={14} className="mt-1 flex-shrink-0 text-[#8B1E2D]" aria-hidden="true" />
          </a>
          {!compact && snapshot.actionQueue.length > 1 && (
            <div className="mt-3 space-y-1.5">
              {snapshot.actionQueue.slice(1).map((action) => (
                <a key={action.stepId} href={action.route} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-white">
                  <span>{action.label}</span>
                  <ArrowRight size={11} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {(displayMode === "on-demand" || onDisplayModeChange) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[rgba(15,17,23,0.06)] pt-2">
          {displayMode === "on-demand" && (
            <button type="button" onClick={() => setExpanded(false)} className="text-[11px] font-semibold text-[#5F6B73] hover:text-[#8B1E2D]">
              Hide guided view
            </button>
          )}
          {onDisplayModeChange && (
            <button
              type="button"
              onClick={() => onDisplayModeChange(displayMode === "guided" ? "on-demand" : "guided")}
              className="text-[11px] font-semibold text-[#5F6B73] hover:text-[#8B1E2D]"
            >
              {displayMode === "guided" ? "Make this optional (on-demand)" : "Always show guided view"}
            </button>
          )}
        </div>
      )}
    </SectionCard>
  );
}
