"use client";

import { BarChart3, CheckCircle2, FolderKanban, MessageSquareText, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import type { BetaFeedback, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";

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
