import { Activity, AlertTriangle, CheckCircle2, CircleDot } from "lucide-react";
import type { LiveWorkspaceMetrics } from "../../services/live-platform/livePlatform";
import type { EnterpriseGoldenPathSnapshot } from "../../services/workflows/enterpriseGoldenPath";
import { buildTenantHealthIndicators } from "../../services/workflows/workflowEvidence";
import { EnterpriseBadge, SectionCard } from "./index";

const toneClasses: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  neutral: "border-[rgba(15,17,23,0.08)] bg-[#F2F3F5] text-[#5F6B73]",
};

function toneIcon(tone: string) {
  if (tone === "success") return CheckCircle2;
  if (tone === "warning" || tone === "danger") return AlertTriangle;
  return CircleDot;
}

export function TenantHealthCommandCenter({
  snapshot,
  metrics,
}: {
  snapshot: EnterpriseGoldenPathSnapshot;
  metrics: LiveWorkspaceMetrics;
}) {
  const indicators = buildTenantHealthIndicators(snapshot, metrics);
  const blockedCount = indicators.filter((indicator) => indicator.tone === "danger").length;
  const warningCount = indicators.filter((indicator) => indicator.tone === "warning").length;

  return (
    <SectionCard
      title="Tenant Health Command Center"
      description="Customer-facing proof that onboarding, knowledge, AI review, work creation, integrations, SLA risk and audit evidence are moving together."
      action={
        <div className="flex flex-wrap gap-2">
          <EnterpriseBadge label={`${blockedCount} blocked`} tone={blockedCount > 0 ? "danger" : "success"} icon={Activity} />
          <EnterpriseBadge label={`${warningCount} warning`} tone={warningCount > 0 ? "warning" : "success"} />
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {indicators.map((indicator) => {
          const Icon = toneIcon(indicator.tone);
          return (
            <a
              key={indicator.id}
              href={indicator.route}
              className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3 transition-colors hover:border-[#8B1E2D]/30 hover:bg-[#F8F9FA] focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/25"
            >
              <div className="flex items-start gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneClasses[indicator.tone]}`}>
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase text-[#5F6B73]">{indicator.label}</span>
                  <span className="mt-1 block font-mono text-lg font-semibold text-[#0F1117]">{indicator.value}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#5F6B73]">{indicator.detail}</span>
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </SectionCard>
  );
}
