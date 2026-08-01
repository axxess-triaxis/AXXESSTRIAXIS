import { useMemo, useState } from "react";
import { BellRing, Radio, ShieldCheck, X } from "lucide-react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../auth/AuthProvider";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { getDemoSocialAlerts, getSocialAlertProviderStatus, type SocialAlert } from "../../services/alerts/socialAlerts";

const ALERTS_PAGE_SIZE = 20;

const providerLabels = {
  x: "X",
  facebook: "Facebook",
  rss: "RSS",
  manual: "Manual Intake",
  demo: "Investor Demo",
};

// Sprint 5 formal audit (closing the Sprint 3/4 Social Alerts gap, see
// docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md Section 4): this component has no async fetch and
// therefore cannot reproduce the original QA-reported hang -- but getDemoSocialAlerts() was being
// rendered completely unconditionally, with no isDemoModeEnabled() gate at all, so every live
// tenant saw the same 4 fabricated demo alerts and a hardcoded "4 active" badge. No live social
// alerts ingestion repository exists yet, so outside Demo Mode this now shows an honest empty
// state instead, matching the pattern already used in AnalyticsSection.tsx/StakeholdersSection.tsx.
//
// Investor Demo interactivity pass (2026-07-24): the queue previously rendered as a list of
// buttons with no onClick at all -- a dead click on every row. "Dismiss" and "Convert to task"
// are now real demo-safe interactions: dismiss removes the alert from this session's local view
// (never mutates the underlying seed), and convert-to-task calls the real
// applicationServices.tasksRepository.create() -- which, under demo mode, writes into the same
// shared in-memory demo store Tasks & Workflow reads from, so the created task is genuinely
// visible there too, not just a toast.
export const AlertsSection = () => {
  const demoMode = isDemoModeEnabled();
  const { session } = useAuth();
  const scope = session.user ? tenantScopeFromUser(session.user) : undefined;
  const seedAlerts = useMemo(() => (demoMode ? getDemoSocialAlerts() : []), [demoMode]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ALERTS_PAGE_SIZE);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const alerts = seedAlerts.filter((alert) => !dismissedIds.has(alert.id));
  const providers = getSocialAlertProviderStatus();

  function dismissAlert(alert: SocialAlert) {
    setDismissedIds((current) => new Set(current).add(alert.id));
    setStatusMessage(`Dismissed "${alert.title}".`);
  }

  async function convertToTask(alert: SocialAlert) {
    if (!scope) return;
    try {
      await applicationServices.tasksRepository.create(scope, {
        organizationId: scope.organizationId,
        title: `Follow up: ${alert.title}`,
        description: `Created from the Social Alerts signal queue (${alert.account}, ${alert.topic}).`,
        assigneeId: scope.userId,
        priority: alert.urgency === "high" ? "high" : alert.urgency === "medium" ? "medium" : "low",
        status: "pending",
        tags: [alert.topic, "social-alert"],
      });
      setConvertedIds((current) => new Set(current).add(alert.id));
      setStatusMessage(`Converted "${alert.title}" into a task -- visible in Tasks & Workflow.`);
    } catch {
      setStatusMessage("Unable to convert this alert into a task right now.");
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Social Alerts"
        subtitle="Provider-gated signal ingestion for policy, funding, risk, and stakeholder intelligence"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {providers.map((provider) => (
          <Card key={provider.provider} className="p-4">
            <div className="flex items-center justify-between">
              <Radio size={14} className={provider.configured ? "text-emerald-600" : "text-[#5F6B73]"} />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${provider.configured ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F3F5] text-[#5F6B73]"}`}>
                {provider.mode}
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-[#0F1117]">{providerLabels[provider.provider]}</div>
            <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">
              {provider.configured ? "Ready for governed ingestion." : "Awaiting provider credentials."}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0F1117]">Institutional Signal Queue</h3>
            <p className="mt-1 text-xs text-[#5F6B73]">Demo signals are isolated from live customer tenants and can be converted into tasks, CRM notes, briefs, or risks.</p>
          </div>
          {demoMode && (
            <span className="rounded-full bg-[#8B1E2D]/8 px-2.5 py-1 text-[11px] font-semibold text-[#8B1E2D]">{alerts.length} active</span>
          )}
        </div>
        {!demoMode && (
          <EmptyState message="Social alert ingestion isn't wired to a live provider or tenant-scoped repository yet. This queue will populate once a live signal source is connected." />
        )}
        {demoMode && (
          <div className="space-y-3">
            {statusMessage && (
              <p className="rounded-lg bg-[#8B1E2D]/6 px-3 py-2 text-xs font-medium text-[#8B1E2D]">{statusMessage}</p>
            )}
            {alerts.slice(0, visibleCount).map((alert) => {
              const converted = convertedIds.has(alert.id);
              return (
                <div key={alert.id} className="flex w-full items-start gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] p-3 text-left">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${alert.urgency === "high" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                    <BellRing size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#0F1117]">{alert.title}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-[#5F6B73]">{alert.topic}</span>
                      {converted && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Converted to task</span>}
                    </div>
                    <p className="mt-1 text-xs text-[#5F6B73]">{alert.account} - {new Date(alert.receivedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {alert.actionTargets.map((target) => (
                        <span key={target} className="rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-2 py-0.5 text-[10px] font-medium text-[#0F1117]">
                          {target.replace(/_/g, " ")}
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => void convertToTask(alert)}
                        disabled={converted}
                        className="rounded-full border border-[#8B1E2D]/25 px-2.5 py-1 text-[10px] font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {converted ? "Task created" : "Convert to task"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <button
                      type="button"
                      onClick={() => dismissAlert(alert)}
                      aria-label={`Dismiss ${alert.title}`}
                      className="text-[#5F6B73] hover:text-[#0F1117]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {alerts.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + ALERTS_PAGE_SIZE)}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5]"
              >
                Show more ({alerts.length - visibleCount} remaining)
              </button>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          ["Tenant Safe", "Alerts are attached to organization-scoped rules before downstream workflow actions."],
          ["Human Review", "External signals create recommendations first; no automated outreach is sent without approval."],
          ["Audit Ready", "Ingestion, triage, conversion, and dismissal events are logged for compliance review."],
        ].map(([title, copy]) => (
          <Card key={title} className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#0F1117]">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{copy}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AlertsSection;
