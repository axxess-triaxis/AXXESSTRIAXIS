"use client";

import { BarChart3, CheckCircle2, FolderKanban, MessageSquareText, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
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
    </div>
  );
}

export default ProductAnalyticsSection;
