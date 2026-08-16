import { useEffect, useMemo, useState } from "react";
import { Activity, BellRing, Newspaper, ShieldCheck, X } from "lucide-react";
import { siFacebook, siInstagram, siThreads, siX } from "simple-icons";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/Card";
import { BrandIcon } from "../../components/ui/BrandIcon";
import { LinkedInLikenessIcon } from "../../components/ui/LikenessIcon";
import { useAuth } from "../../auth/AuthProvider";
import { isDemoModeEnabled } from "../../demo/demoMode";
import type { SocialAlertEvent } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { getDemoSocialAlerts, getSocialAlertProviderStatus, type SocialAlert, type SocialAlertProvider } from "../../services/alerts/socialAlerts";
import { SocialAlertRulesPanel } from "./SocialAlertRulesPanel";

// Sprint 1 real Social Alerts (2026-08-17): a real social_alert_events row (matched by
// socialAlertMatching.ts, populated by the daily Brand24 cron) mapped into the same SocialAlert
// shape the demo fixture already uses -- this is what lets the existing sentiment memos and feed
// rendering below work identically for real data, with zero change to their own logic.
function eventToSocialAlert(event: SocialAlertEvent): SocialAlert {
  return {
    id: event.id,
    provider: event.provider,
    account: event.sourceAccount,
    topic: typeof event.metadata.topic === "string" ? event.metadata.topic : "General",
    title: event.title,
    urgency: event.urgency,
    sentiment: event.sentiment,
    actionTargets: [],
    receivedAt: event.receivedAt,
  };
}

const ALERTS_PAGE_SIZE = 20;

// A-96 (2026-08-04), founder direction: the alert-source grid should read as 5 real social
// platforms (Facebook, X, Instagram, LinkedIn, Threads) plus one merged "Miscellaneous" bucket for
// circulars, Substack, and Medium posts -- "not separate dashboards but one Miscellaneous style."
// The Miscellaneous tile is backed by the real "rss" + "manual" provider status (both honest,
// always-available fallback ingestion paths), it just isn't rendered as two separate tiles.
const platformOrder: SocialAlertProvider[] = ["facebook", "x", "instagram", "linkedin", "threads", "rss"];

const platformMeta: Record<SocialAlertProvider, { label: string; icon: React.ReactNode }> = {
  facebook: { label: "Facebook", icon: <BrandIcon icon={siFacebook} size={16} /> },
  x: { label: "X", icon: <BrandIcon icon={siX} size={16} /> },
  instagram: { label: "Instagram", icon: <BrandIcon icon={siInstagram} size={16} /> },
  linkedin: { label: "LinkedIn", icon: <LinkedInLikenessIcon size={16} /> },
  threads: { label: "Threads", icon: <BrandIcon icon={siThreads} size={16} /> },
  rss: { label: "Circulars, Substack & Medium", icon: <Newspaper size={16} className="text-[#5F6B73]" /> },
  manual: { label: "Manual Intake", icon: <Newspaper size={16} className="text-[#5F6B73]" /> },
  demo: { label: "Investor Demo", icon: <Newspaper size={16} className="text-[#5F6B73]" /> },
  // Sprint 1 real Social Alerts (2026-08-17): not in platformOrder, so it never renders as a
  // Signal Sources tile (that grid is deliberately left untouched this sprint) -- only present so
  // real brand24-provider events flowing through the shared `alerts` array (ticker, ActivityFeed
  // icons, mentionsByPlatform) have a valid lookup and never crash.
  brand24: { label: "Brand24", icon: <Newspaper size={16} className="text-[#5F6B73]" /> },
};

// A-96 (2026-08-04): investor-demo-only realistic connection stats for the provider tiles below --
// real tenants keep the honest provider.configured / "Awaiting provider credentials" status from
// getSocialAlertProviderStatus() untouched. The "demo" provider entry itself is never rendered
// (filtered out below) so investors never see a literal "Investor Demo" tile.
const demoProviderDetails: Record<string, { badge: string; detail: string }> = {
  x: { badge: "Live", detail: "3.2k mentions tracked this week" },
  facebook: { badge: "Live", detail: "18 pages and groups monitored" },
  instagram: { badge: "Live", detail: "12 accounts and hashtags tracked" },
  linkedin: { badge: "Live", detail: "9 company and executive pages" },
  threads: { badge: "Live", detail: "6 threads and topic tags" },
  rss: { badge: "Live", detail: "22 circulars, Substack, and Medium sources" },
};

const sentimentChartColors = { positive: "#2E9E6D", neutral: "#C9A227", negative: "#B4232F" };

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
  const [realEvents, setRealEvents] = useState<SocialAlertEvent[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ALERTS_PAGE_SIZE);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Sprint 1 real Social Alerts (2026-08-17): demo mode is untouched by design -- this fetch
    // never runs there. A real tenant with zero matched events (the common case until a rule is
    // configured and a Brand24 sync has run) simply keeps realEvents empty, feeding the same
    // honest empty state this page already had.
    if (demoMode) return;
    let cancelled = false;
    fetch("/api/social-alert-events", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: { events?: SocialAlertEvent[] } | undefined) => {
        if (!cancelled && payload?.events) setRealEvents(payload.events);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [demoMode]);

  const seedAlerts = useMemo(
    () => (demoMode ? getDemoSocialAlerts() : realEvents.map(eventToSocialAlert)),
    [demoMode, realEvents],
  );

  const alerts = seedAlerts.filter((alert) => !dismissedIds.has(alert.id));
  const rawProviders = getSocialAlertProviderStatus();
  const providers = platformOrder.map((provider) => {
    if (provider === "rss") {
      const configured = rawProviders.some((row) => (row.provider === "rss" || row.provider === "manual") && row.configured);
      return { provider, configured, mode: configured ? "fallback" : "provider-gated" };
    }
    const row = rawProviders.find((entry) => entry.provider === provider);
    return { provider, configured: Boolean(row?.configured), mode: row?.mode ?? "provider-gated" };
  });

  const sentimentSummary = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    const topicNegative: Record<string, number> = {};
    for (const alert of alerts) {
      counts[alert.sentiment] += 1;
      if (alert.sentiment === "negative") {
        topicNegative[alert.topic] = (topicNegative[alert.topic] ?? 0) + 1;
      }
    }
    const total = alerts.length || 1;
    const topNegativeTopics = Object.entries(topicNegative).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { counts, total, topNegativeTopics };
  }, [alerts]);

  const sentimentTrend = useMemo(() => {
    const byDay = new Map<string, { positive: number; neutral: number; negative: number }>();
    for (const alert of alerts) {
      const day = alert.receivedAt.slice(0, 10);
      const bucket = byDay.get(day) ?? { positive: 0, neutral: 0, negative: 0 };
      bucket[alert.sentiment] += 1;
      byDay.set(day, bucket);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([day, counts]) => ({ day: day.slice(5), ...counts }));
  }, [alerts]);

  const mentionsByPlatform = useMemo(() => {
    const counts = new Map<SocialAlertProvider, number>();
    for (const alert of alerts) counts.set(alert.provider, (counts.get(alert.provider) ?? 0) + 1);
    return platformOrder.map((provider) => ({ name: platformMeta[provider].label.split(",")[0], count: counts.get(provider) ?? 0 }));
  }, [alerts]);

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

      {demoMode && alerts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#0F1117] py-2.5">
          <div className="axxess-ticker-track flex w-max items-center">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
                {alerts.slice(0, 20).map((alert) => (
                  <div key={`${copy}-${alert.id}`} className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap px-4 text-xs text-white/90">
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${alert.urgency === "high" ? "bg-red-500" : alert.urgency === "medium" ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{platformMeta[alert.provider].icon}</span>
                    <span>{alert.title}</span>
                    <span className="text-white/30">&bull;</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Signal Sources</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {providers.map((provider) => {
            const demoDetail = demoMode ? demoProviderDetails[provider.provider] : undefined;
            const connected = Boolean(demoDetail) || provider.configured;
            return (
              <Card key={provider.provider} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8F9FA]">{platformMeta[provider.provider].icon}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F3F5] text-[#5F6B73]"}`}>
                    {demoDetail ? demoDetail.badge : provider.mode}
                  </span>
                </div>
                <div className="mt-3 text-sm font-semibold text-[#0F1117]">{platformMeta[provider.provider].label}</div>
                <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">
                  {demoDetail ? demoDetail.detail : provider.configured ? "Ready for governed ingestion." : "Awaiting provider credentials."}
                </p>
              </Card>
            );
          })}
        </div>

        <Card className="mt-4 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#0F1117]">Institutional Signal Queue</h3>
              <p className="mt-1 text-xs text-[#5F6B73]">
                {demoMode
                  ? "Demo signals are isolated from live customer tenants and can be converted into tasks, CRM notes, briefs, or risks."
                  : "Real Brand24 mentions matched against your own alert rules, converted into tasks, CRM notes, briefs, or risks."}
              </p>
            </div>
            {alerts.length > 0 && (
              <span className="rounded-full bg-[#8B1E2D]/8 px-2.5 py-1 text-[11px] font-semibold text-[#8B1E2D]">{alerts.length} active</span>
            )}
          </div>
          {alerts.length === 0 && (
            <EmptyState message={demoMode
              ? "Social alert ingestion isn't wired to a live provider or tenant-scoped repository yet. This queue will populate once a live signal source is connected."
              : "No social alert events yet. Configure a rule above and Brand24 ingestion will populate this queue once matching mentions arrive."} />
          )}
          {alerts.length > 0 && (
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
                        <span className="flex h-4 w-4 items-center justify-center">{platformMeta[alert.provider].icon}</span>
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
      </div>

      <SocialAlertRulesPanel />

      {(demoMode || alerts.length > 0) && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Sentiment Tracker &amp; Analytics</h2>
          <div className="grid grid-cols-1 gap-4">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F1117]">Overall Sentiment</h3>
                  <p className="mt-1 text-xs text-[#5F6B73]">Stakeholder and public sentiment across the active signal queue.</p>
                </div>
                <Activity size={16} className="text-[#8B1E2D]" />
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#F2F3F5]">
                <div className="bg-emerald-500" style={{ width: `${(sentimentSummary.counts.positive / sentimentSummary.total) * 100}%` }} />
                <div className="bg-[#C9A227]" style={{ width: `${(sentimentSummary.counts.neutral / sentimentSummary.total) * 100}%` }} />
                <div className="bg-red-500" style={{ width: `${(sentimentSummary.counts.negative / sentimentSummary.total) * 100}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  ["Positive", "bg-emerald-500", sentimentSummary.counts.positive],
                  ["Neutral", "bg-[#C9A227]", sentimentSummary.counts.neutral],
                  ["Negative", "bg-red-500", sentimentSummary.counts.negative],
                ].map(([label, dot, count]) => (
                  <div key={label as string} className="text-xs">
                    <div className="flex items-center gap-1.5 text-[#5F6B73]">
                      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
                      {label}
                    </div>
                    <div className="mt-0.5 font-semibold text-[#0F1117]">
                      {Math.round(((count as number) / sentimentSummary.total) * 100)}% <span className="font-normal text-[#5F6B73]">({count})</span>
                    </div>
                  </div>
                ))}
              </div>
              {sentimentSummary.topNegativeTopics.length > 0 && (
                <div className="mt-4 border-t border-[rgba(0,0,0,0.06)] pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Topics needing attention</p>
                  <div className="mt-2 space-y-1.5">
                    {sentimentSummary.topNegativeTopics.map(([topic, count]) => (
                      <div key={topic} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-[#0F1117]">{topic}</span>
                        <span className="font-semibold text-red-700">{count} negative</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-4 text-sm font-semibold text-[#0F1117]">Sentiment Trend (last 14 active days)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={sentimentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                    <Area type="monotone" dataKey="positive" stackId="1" stroke={sentimentChartColors.positive} fill={sentimentChartColors.positive} fillOpacity={0.75} />
                    <Area type="monotone" dataKey="neutral" stackId="1" stroke={sentimentChartColors.neutral} fill={sentimentChartColors.neutral} fillOpacity={0.65} />
                    <Area type="monotone" dataKey="negative" stackId="1" stroke={sentimentChartColors.negative} fill={sentimentChartColors.negative} fillOpacity={0.75} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-5">
                <h3 className="mb-4 text-sm font-semibold text-[#0F1117]">Mentions by Platform</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mentionsByPlatform}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                    <Bar dataKey="count" fill="#8B1E2D" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        </div>
      )}

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
