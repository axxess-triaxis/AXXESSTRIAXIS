"use client";

import { BarChart3, CheckCircle2, FolderKanban, GitPullRequest, MessageSquareText, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { DemoDataNotice } from "../../components/enterprise";
import type { BetaFeedback, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import type { AsanaPortfolioHealthResult } from "../../services/integrations/asanaPortfolioHealth";
import type { MixpanelQueryHealthResult } from "../../services/integrations/mixpanelQueryHealth";
import type { PostHogQueryHealthResult } from "../../services/integrations/postHogQueryHealth";
import type { SentryProjectHealthResult } from "../../services/integrations/sentryProjectHealth";
import { pilotReadinessSteps } from "../../services/pilot/pilotHealth";
import { useAnalytics } from "../../services/analytics";

// Sprint 1 pilot portfolio (2026-08-15): the old A-96 devToolDashboards fixture (GitHub/Linear/
// Vercel/Asana/Jira hardcoded stats) is removed -- it was explicitly self-documented as never a
// live integration. Demo mode is untouched below (investor.triaxisventures.com's standing rule is
// to stay rich/aspirational -- see feedback_investor_vs_landing_domain_standing_rule memory); for
// real tenants, this section now fetches the same /api/admin/pilot-portfolio route
// PilotConversionSection.tsx uses. That route restricts its `integrations` field to the platform
// operator's own Super Admin (canViewCrossTenantPilotPortfolio) -- these are Triaxis-operator-only
// infra signals (Sentry error tracking, a PostHog/Mixpanel query pull, Asana portfolio health),
// not tenant-facing data, so a regular tenant admin correctly keeps today's honest "not wired yet"
// card via the 403 fallback below, unchanged from before this sprint.
type IntegrationsHealth = {
  sentry: SentryProjectHealthResult;
  postHogQuery: PostHogQueryHealthResult;
  mixpanelQuery: MixpanelQueryHealthResult;
  asana: AsanaPortfolioHealthResult;
};

const integrationDisplayNames: Record<keyof IntegrationsHealth, string> = {
  sentry: "Sentry",
  postHogQuery: "PostHog (query)",
  mixpanelQuery: "Mixpanel (query)",
  asana: "Asana",
};

type PilotReadinessEventRow = {
  userId?: string;
  stepId: string;
  eventType: string;
};

type ModuleUsageEventRow = {
  module: string;
};

type ProductMetrics = {
  users: number;
  organizations: number;
  projects: number;
  tasks: number;
  meetings: number;
  feedback: number;
};

const emptyMetrics: ProductMetrics = {
  users: 0,
  organizations: 0,
  projects: 0,
  tasks: 0,
  meetings: 0,
  feedback: 0,
};

const feedbackTypeTone: Record<BetaFeedback["feedbackType"], string> = {
  Bug: "bg-red-50 text-red-700",
  "Feature Request": "bg-blue-50 text-blue-700",
  "Confusing Workflow": "bg-amber-50 text-amber-700",
  "General Feedback": "bg-[#F2F3F5] text-[#5F6B73]",
};

// A-96 (2026-08-04): investor-demo-only seeded Feedback Inbox, same pattern as devToolDashboards
// above -- the investor-demo tenant genuinely has zero beta_feedback rows, which reads as broken
// in front of investors. Gated behind isDemoModeEnabled(); real tenants always see their true
// live count and list, including an honest zero.
const demoFeedbackUsers: User[] = [
  { id: "demo-fb-user-1", organizationId: "demo-org", email: "priya.menon@example.com", displayName: "Priya Menon", avatarInitials: "PM", availability: "public", role: "Organization Admin", roleIds: [], status: "active", createdAt: "2026-07-18T09:00:00Z", updatedAt: "2026-07-18T09:00:00Z" },
  { id: "demo-fb-user-2", organizationId: "demo-org", email: "arjun.desai@example.com", displayName: "Arjun Desai", avatarInitials: "AD", availability: "public", role: "Employee", roleIds: [], status: "active", createdAt: "2026-07-20T09:00:00Z", updatedAt: "2026-07-20T09:00:00Z" },
  { id: "demo-fb-user-3", organizationId: "demo-org", email: "leela.narayan@example.com", displayName: "Leela Narayan", avatarInitials: "LN", availability: "public", role: "Employee", roleIds: [], status: "active", createdAt: "2026-07-22T09:00:00Z", updatedAt: "2026-07-22T09:00:00Z" },
];

const demoBetaFeedback: BetaFeedback[] = [
  { id: "demo-fb-1", organizationId: "demo-org", userId: "demo-fb-user-1", feedbackType: "Feature Request", module: "AI Workspace", rating: 4, message: "Would love a saved-filter view for the HITL review inbox so I don't have to re-apply the same status filters every morning.", permissionToContact: true, status: "triaged", metadata: {}, createdAt: "2026-07-29T14:20:00Z" },
  { id: "demo-fb-2", organizationId: "demo-org", userId: "demo-fb-user-2", feedbackType: "Bug", module: "Knowledge Hub", rating: 3, message: "Upload progress bar sticks at 90% for large PDFs even though the file finishes indexing a few seconds later.", permissionToContact: true, status: "in-review", metadata: {}, createdAt: "2026-07-28T11:05:00Z" },
  { id: "demo-fb-3", organizationId: "demo-org", userId: "demo-fb-user-3", feedbackType: "General Feedback", module: "Executive Dashboard", rating: 5, message: "Looks quite sophisticated and feels quite stable for our current stage -- the tiered urgency layout makes it obvious what needs attention first.", permissionToContact: false, status: "resolved", metadata: {}, createdAt: "2026-07-26T16:40:00Z" },
  { id: "demo-fb-4", organizationId: "demo-org", userId: "demo-fb-user-1", feedbackType: "Confusing Workflow", module: "Approvals", rating: 3, message: "Took me a minute to find where to see why an approval was routed to me specifically -- the reviewer-assignment reason could be more visible.", permissionToContact: true, status: "new", metadata: {}, createdAt: "2026-07-24T10:15:00Z" },
];

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof BarChart3 }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{label}</span>
        <Icon size={15} className="text-[#8B1E2D]" />
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold text-[#0F1117]">{value}</div>
    </Card>
  );
}

export function ProductAnalyticsSection() {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [metrics, setMetrics] = useState<ProductMetrics>(emptyMetrics);
  const [feedbackItems, setFeedbackItems] = useState<BetaFeedback[]>([]);
  const [feedbackUsers, setFeedbackUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationsHealth | undefined>(undefined);
  const [readinessEvents, setReadinessEvents] = useState<PilotReadinessEventRow[]>([]);
  const [moduleUsageEvents, setModuleUsageEvents] = useState<ModuleUsageEventRow[]>([]);

  const loadMetrics = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    const [organizations, users, projects, tasks, meetings, feedback] = await Promise.allSettled([
      applicationServices.organizationsRepository.list(scope, { pageSize: 100 }),
      applicationServices.usersRepository.listByOrganization(scope, { pageSize: 100 }),
      applicationServices.projectsRepository.list(scope, { pageSize: 100 }),
      applicationServices.tasksRepository.list(scope, { pageSize: 100 }),
      applicationServices.meetingsRepository.list(scope, { pageSize: 100 }),
      applicationServices.betaFeedbackRepository.list(scope, { pageSize: 100 }),
    ]);

    setMetrics({
      organizations: organizations.status === "fulfilled" ? organizations.value.length : 0,
      users: users.status === "fulfilled" ? users.value.length : 0,
      projects: projects.status === "fulfilled" ? projects.value.length : 0,
      tasks: tasks.status === "fulfilled" ? tasks.value.length : 0,
      meetings: meetings.status === "fulfilled" ? meetings.value.length : 0,
      feedback: feedback.status === "fulfilled" ? feedback.value.length : 0,
    });
    setFeedbackUsers(users.status === "fulfilled" ? users.value : []);
    setFeedbackItems(
      feedback.status === "fulfilled"
        ? [...feedback.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    );
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    // Same cross-tenant route PilotConversionSection.tsx uses -- only its `integrations` field is
    // consumed here. A regular tenant admin gets a 403 and simply keeps the honest "not wired yet"
    // fallback below, fail-closed with no error UI.
    let cancelled = false;
    fetch("/api/admin/pilot-portfolio", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: { integrations: IntegrationsHealth } | undefined) => {
        if (!cancelled && payload) setIntegrations(payload.integrations);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Real Activation Funnel data: the same tenant-scoped pilot_readiness_events
    // PilotConversionSection.tsx already reads, restricted to Super Admin/Organization Admin (this
    // page's own route guard). No demo fallback needed here -- the honest empty state below already
    // covers a real tenant with zero events, and demo mode keeps its own fabricated branch.
    let cancelled = false;
    fetch("/api/pilot-readiness-events?pageSize=200", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: PilotReadinessEventRow[] | undefined) => {
        if (!cancelled && payload) setReadinessEvents(payload);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Real Most Used Modules data: every real navigation writes here via App.tsx's module_opened
    // effect. Restricted to Super Admin/Organization Admin, matching this page's own route guard.
    let cancelled = false;
    fetch("/api/module-usage-events?pageSize=500", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: ModuleUsageEventRow[] | undefined) => {
        if (!cancelled && payload) setModuleUsageEvents(payload);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    analytics.trackEvent("user_admin_viewed", { admin_page: "product_analytics" }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "product-analytics",
      route: "/admin/product-analytics",
    });
  }, [analytics, user]);

  if (loading) return <LoadingState label="Product analytics" />;

  const demoMode = isDemoModeEnabled();
  const activeModules = ["Dashboard", "Projects", "Tasks", "Meetings", "Feedback", "Administration"];

  const moduleCounts = Object.entries(
    moduleUsageEvents.reduce<Record<string, number>>((counts, event) => {
      counts[event.module] = (counts[event.module] ?? 0) + 1;
      return counts;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxModuleCount = moduleCounts[0]?.[1] ?? 0;

  const funnelCounts = pilotReadinessSteps.map((step) => ({
    step: step.label,
    count: new Set(
      readinessEvents
        .filter((event) => event.stepId === step.id && event.eventType === "step_completed" && event.userId)
        .map((event) => event.userId),
    ).size,
  }));
  const hasFunnelActivity = funnelCounts.some((row) => row.count > 0);

  const displayedFeedbackItems = demoMode ? demoBetaFeedback : feedbackItems;
  const displayedFeedbackUsers = demoMode ? demoFeedbackUsers : feedbackUsers;
  const displayedFeedbackCount = demoMode ? demoBetaFeedback.length : metrics.feedback;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Product Analytics"
        subtitle="Usage and engagement across every workspace module"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Users" value={metrics.users} icon={Users} />
        <MetricCard label="Organizations" value={metrics.organizations} icon={Users} />
        <MetricCard label="Projects Created" value={metrics.projects} icon={FolderKanban} />
        <MetricCard label="Tasks Created" value={metrics.tasks} icon={CheckCircle2} />
        <MetricCard label="Meetings Created" value={metrics.meetings} icon={BarChart3} />
        <MetricCard label="Feedback Received" value={displayedFeedbackCount} icon={MessageSquareText} />
        <MetricCard label="Active Modules" value={activeModules.length} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[#0F1117]">Most Used Modules</h3>
          {demoMode ? (
            <div className="mt-4 space-y-3">
              {activeModules.map((module, index) => (
                <div key={module} className="flex items-center gap-3">
                  <span className="w-28 text-xs font-medium text-[#0F1117]">{module}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F2F3F5]">
                    <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${Math.max(24, 92 - index * 10)}%` }} />
                  </div>
                  <span className="w-16 text-right font-mono text-[10px] text-[#5F6B73]">{Math.max(24, 92 - index * 10)}%</span>
                </div>
              ))}
            </div>
          ) : moduleCounts.length === 0 ? (
            <p className="mt-4 text-xs leading-relaxed text-[#5F6B73]">No module activity recorded yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {moduleCounts.map(([module, count]) => {
                const percent = maxModuleCount > 0 ? Math.round((count / maxModuleCount) * 100) : 0;
                return (
                  <div key={module} className="flex items-center gap-3">
                    <span className="w-28 truncate text-xs font-medium text-[#0F1117]">{module}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F2F3F5]">
                      <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${Math.max(4, percent)}%` }} />
                    </div>
                    <span className="w-16 text-right font-mono text-[10px] text-[#5F6B73]">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[#0F1117]">Activation Funnel</h3>
          {demoMode ? (
            <div className="mt-4 space-y-3">
              {[
                { step: "Signed in", ratio: 1 },
                { step: "Viewed dashboard", ratio: 0.86 },
                { step: "Opened project module", ratio: 0.64 },
                { step: "Created workflow item", ratio: 0.47 },
                { step: "Submitted feedback", ratio: 0.31 },
              ].map(({ step, ratio }) => (
                <div key={step} className="flex items-center justify-between rounded-lg bg-[#F8F9FA] px-3 py-2">
                  <span className="text-xs font-medium text-[#0F1117]">{step}</span>
                  <span className="font-mono text-[11px] text-[#5F6B73]">{Math.round(metrics.users * ratio)}</span>
                </div>
              ))}
            </div>
          ) : !hasFunnelActivity ? (
            <p className="mt-4 text-xs leading-relaxed text-[#5F6B73]">No activation events recorded yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {funnelCounts.map(({ step, count }) => (
                <div key={step} className="flex items-center justify-between rounded-lg bg-[#F8F9FA] px-3 py-2">
                  <span className="text-xs font-medium text-[#0F1117]">{step}</span>
                  <span className="font-mono text-[11px] text-[#5F6B73]">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <GitPullRequest size={15} className="text-[#8B1E2D]" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Engineering &amp; Delivery Tooling</h2>
        </div>
        {demoMode ? (
          <Card className="p-5">
            <DemoDataNotice label="Live engineering-tool dashboards (Sentry, PostHog, Mixpanel, Asana) are a platform-operator-only view, not part of the investor preview." />
          </Card>
        ) : integrations ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(integrationDisplayNames) as Array<keyof IntegrationsHealth>).map((key) => {
              const result = integrations[key];
              return (
                <Card key={key} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#0F1117]">{integrationDisplayNames[key]}</h3>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${result.status === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F3F5] text-[#5F6B73]"}`}>
                      {result.status === "ok" ? "Live" : "Not connected"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#5F6B73]">
                    {result.status === "ok"
                      ? Object.entries(result).filter(([field]) => field !== "status" && field !== "provider").map(([field, value]) => `${field}: ${value}`).join(", ")
                      : result.status === "error"
                        ? `Connected, but the last request failed: ${result.error}`
                        : "No credentials configured for this integration yet."}
                  </p>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-5">
            <p className="text-xs leading-relaxed text-[#5F6B73]">Sentry, PostHog, Mixpanel, and Asana dashboards require live API integrations that aren&apos;t wired to this workspace yet. This section will populate as those connectors are built.</p>
          </Card>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquareText size={15} className="text-[#8B1E2D]" />
            <h3 className="text-sm font-semibold text-[#0F1117]">Feedback Inbox</h3>
          </div>
          <p className="mt-1 text-xs text-[#5F6B73]">Every submission from the workspace, newest first.</p>
        </div>
        {displayedFeedbackItems.length === 0 ? (
          <div className="px-4 py-6 text-xs text-[#5F6B73]">No feedback submitted yet.</div>
        ) : (
          displayedFeedbackItems.map((item) => {
            const submitter = displayedFeedbackUsers.find((row) => row.id === item.userId);
            return (
              <div key={item.id} className="border-b border-[rgba(0,0,0,0.04)] px-4 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${feedbackTypeTone[item.feedbackType]}`}>{item.feedbackType}</span>
                  <span className="text-[11px] font-medium text-[#5F6B73]">{item.module}</span>
                  <span className="font-mono text-[11px] text-[#5F6B73]">Rating {item.rating}/5</span>
                  <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">{item.status}</span>
                  <span className="ml-auto text-[11px] text-[#5F6B73]">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#0F1117]">{item.message}</p>
                <p className="mt-1 text-[11px] text-[#5F6B73]">
                  {submitter ? `${submitter.displayName} (${submitter.email})` : `User ${item.userId}`}
                  {item.permissionToContact ? " -- may contact" : ""}
                </p>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

export default ProductAnalyticsSection;
