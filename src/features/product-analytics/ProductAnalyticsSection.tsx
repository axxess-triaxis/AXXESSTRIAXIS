"use client";

import { BarChart3, CheckCircle2, FolderKanban, GitPullRequest, MessageSquareText, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { siAsana, siGithub, siJira, siLinear, siVercel } from "simple-icons";
import { useAuth } from "../../auth/AuthProvider";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { BrandIcon } from "../../components/ui/BrandIcon";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { DemoDataNotice } from "../../components/enterprise";
import type { BetaFeedback, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";

// A-96 (2026-08-04): investor-demo-only real-looking placeholder entries for engineering-tool
// dashboards -- NOT a live GitHub/Linear/Vercel/Asana/Jira API integration (none exists in this
// codebase). Gated behind isDemoModeEnabled(), same pattern as every other demo-only fixture in
// this file's sibling sections. Real tenants never see this block.
const devToolDashboards = [
  {
    id: "github",
    name: "GitHub",
    icon: siGithub,
    stats: [
      { label: "Commits (7d)", value: "142" },
      { label: "Open PRs", value: "8" },
      { label: "Merged PRs (7d)", value: "23" },
      { label: "Contributors", value: "6" },
    ],
  },
  {
    id: "linear",
    name: "Linear",
    icon: siLinear,
    stats: [
      { label: "Issues in progress", value: "14" },
      { label: "Cycle time", value: "3.2d" },
      { label: "Velocity", value: "38 pts/wk" },
      { label: "Backlog", value: "61" },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    icon: siVercel,
    stats: [
      { label: "Deployments (7d)", value: "19" },
      { label: "Build success rate", value: "96%" },
      { label: "P95 build time", value: "48s" },
      { label: "Preview URLs (7d)", value: "27" },
    ],
  },
  {
    id: "asana",
    name: "Asana",
    icon: siAsana,
    stats: [
      { label: "Tasks completed (7d)", value: "61" },
      { label: "On-time rate", value: "88%" },
      { label: "Overdue tasks", value: "4" },
      { label: "Active projects", value: "9" },
    ],
  },
  {
    id: "jira",
    name: "Jira",
    icon: siJira,
    stats: [
      { label: "Sprint progress", value: "68%" },
      { label: "Story points remaining", value: "24" },
      { label: "Open bugs", value: "5" },
      { label: "Sprint days left", value: "4" },
    ],
  },
];

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
    if (!user) return;
    analytics.trackEvent("user_admin_viewed", { admin_page: "product_analytics" }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "product-analytics",
      route: "/admin/product-analytics",
    });
  }, [analytics, user]);

  if (loading) return <LoadingState label="Loading product analytics" />;

  const demoMode = isDemoModeEnabled();
  const activeModules = ["Dashboard", "Projects", "Tasks", "Meetings", "Feedback", "Administration"];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Product Analytics"
        subtitle="Internal beta usage dashboard prepared for future Mixpanel-derived metrics"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Users" value={metrics.users} icon={Users} />
        <MetricCard label="Organizations" value={metrics.organizations} icon={Users} />
        <MetricCard label="Projects Created" value={metrics.projects} icon={FolderKanban} />
        <MetricCard label="Tasks Created" value={metrics.tasks} icon={CheckCircle2} />
        <MetricCard label="Meetings Created" value={metrics.meetings} icon={BarChart3} />
        <MetricCard label="Feedback Received" value={metrics.feedback} icon={MessageSquareText} />
        <MetricCard label="Active Modules" value={activeModules.length} icon={BarChart3} />
        <MetricCard label="Analytics Mode" value={analytics.providerName} icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[#0F1117]">Most Used Modules</h3>
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
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[#0F1117]">Activation Funnel</h3>
          <div className="mt-4 space-y-3">
            {["Signed in", "Viewed dashboard", "Opened project module", "Created workflow item", "Submitted feedback"].map((step, index) => (
              <div key={step} className="flex items-center justify-between rounded-lg bg-[#F8F9FA] px-3 py-2">
                <span className="text-xs font-medium text-[#0F1117]">{step}</span>
                <span className="font-mono text-[11px] text-[#5F6B73]">{index === 0 ? metrics.users : "Mixpanel-ready"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <GitPullRequest size={15} className="text-[#8B1E2D]" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Engineering &amp; Delivery Tooling</h2>
        </div>
        {demoMode ? (
          <>
            <DemoDataNotice label="These engineering-tool dashboards are seeded to show what live GitHub, Linear, Vercel, Asana, and Jira integrations would surface -- not a live API connection." />
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {devToolDashboards.map((tool) => (
                <Card key={tool.id} className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-[rgba(15,17,23,0.08)]">
                      <BrandIcon icon={tool.icon} size={16} />
                    </span>
                    <h3 className="text-sm font-semibold text-[#0F1117]">{tool.name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {tool.stats.map((stat) => (
                      <div key={stat.label}>
                        <div className="font-mono text-sm font-semibold text-[#0F1117]">{stat.value}</div>
                        <div className="mt-0.5 text-[10px] leading-tight text-[#5F6B73]">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card className="p-5">
            <p className="text-xs leading-relaxed text-[#5F6B73]">GitHub, Linear, Vercel, Asana, and Jira dashboards require live API integrations that aren&apos;t wired to this workspace yet. This section will populate as those connectors are built.</p>
          </Card>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquareText size={15} className="text-[#8B1E2D]" />
            <h3 className="text-sm font-semibold text-[#0F1117]">Feedback Inbox</h3>
          </div>
          <p className="mt-1 text-xs text-[#5F6B73]">Every submission from the Beta Feedback form, newest first. This is the review destination for A-35.</p>
        </div>
        {feedbackItems.length === 0 ? (
          <div className="px-4 py-6 text-xs text-[#5F6B73]">No feedback submitted yet.</div>
        ) : (
          feedbackItems.map((item) => {
            const submitter = feedbackUsers.find((row) => row.id === item.userId);
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
