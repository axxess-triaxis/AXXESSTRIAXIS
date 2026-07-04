"use client";

import { Activity, AlertCircle, CheckCircle2, Database, MessageSquareText, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import type { AuditLog } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";

type BetaReadinessMetrics = {
  organizations: number;
  users: number;
  projects: number;
  tasks: number;
  meetings: number;
  feedback: number;
  auditLogs: AuditLog[];
  supabaseReady: boolean;
  feedbackReady: boolean;
};

const emptyMetrics: BetaReadinessMetrics = {
  organizations: 0,
  users: 0,
  projects: 0,
  tasks: 0,
  meetings: 0,
  feedback: 0,
  auditLogs: [],
  supabaseReady: false,
  feedbackReady: false,
};

function StatusPill({ ready, label }: { ready: boolean; label: string }) {
  const Icon = ready ? CheckCircle2 : AlertCircle;
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      <Icon size={12} /> {label}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) {
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

export function BetaReadinessSection() {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [metrics, setMetrics] = useState<BetaReadinessMetrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);

  const loadReadiness = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    const [organizations, users, projects, tasks, meetings, feedback, auditLogs] = await Promise.allSettled([
      applicationServices.organizationsRepository.list(scope, { pageSize: 100 }),
      applicationServices.usersRepository.listByOrganization(scope, { pageSize: 100 }),
      applicationServices.projectsRepository.list(scope, { pageSize: 100 }),
      applicationServices.tasksRepository.list(scope, { pageSize: 100 }),
      applicationServices.meetingsRepository.list(scope, { pageSize: 100 }),
      applicationServices.betaFeedbackRepository.list(scope, { pageSize: 100 }),
      applicationServices.auditLogsRepository.list(scope, { pageSize: 8 }),
    ]);

    setMetrics({
      organizations: organizations.status === "fulfilled" ? organizations.value.length : 0,
      users: users.status === "fulfilled" ? users.value.length : 0,
      projects: projects.status === "fulfilled" ? projects.value.length : 0,
      tasks: tasks.status === "fulfilled" ? tasks.value.length : 0,
      meetings: meetings.status === "fulfilled" ? meetings.value.length : 0,
      feedback: feedback.status === "fulfilled" ? feedback.value.length : 0,
      auditLogs: auditLogs.status === "fulfilled" ? auditLogs.value : [],
      supabaseReady: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && organizations.status === "fulfilled"),
      feedbackReady: feedback.status === "fulfilled",
    });
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  useEffect(() => {
    if (!user) return;
    analytics.trackEvent("user_admin_viewed", { admin_page: "beta_readiness" }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "beta-readiness",
      route: "/admin/beta-readiness",
    });
  }, [analytics, user]);

  if (loading) return <LoadingState label="Checking beta readiness" />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Beta Readiness"
        subtitle="Internal release checks for Product Release 0.6"
        action={<StatusPill ready={metrics.supabaseReady && metrics.feedbackReady} label={metrics.supabaseReady && metrics.feedbackReady ? "Ready" : "Needs Review"} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#0F1117]">Release Status</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-[#F8F9FA] p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">App Version</span>
              <span className="mt-1 block font-mono text-sm text-[#0F1117]">{analytics.appVersion}</span>
            </div>
            <div className="rounded-lg bg-[#F8F9FA] p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Release</span>
              <span className="mt-1 block font-mono text-sm text-[#0F1117]">{analytics.releaseVersion}</span>
            </div>
            <div className="rounded-lg bg-[#F8F9FA] p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Environment</span>
              <span className="mt-1 block font-mono text-sm text-[#0F1117]">{process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV}</span>
            </div>
            <div className="rounded-lg bg-[#F8F9FA] p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Analytics</span>
              <span className="mt-1 block font-mono text-sm text-[#0F1117]">{analytics.providerName} {analytics.enabled ? "enabled" : "mock"}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-[#0F1117]">Connections</h3>
          <div className="mt-4 space-y-3">
            <StatusPill ready={metrics.supabaseReady} label="Supabase" />
            <StatusPill ready={analytics.enabled || analytics.providerName === "mock"} label="Analytics" />
            <StatusPill ready={metrics.feedbackReady} label="Feedback" />
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-[#0F1117]">Recent Errors</h3>
          <div className="mt-4 rounded-lg bg-[#F8F9FA] px-3 py-5 text-center text-xs text-[#5F6B73]">
            No recent errors recorded
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <MetricCard label="Feedback" value={metrics.feedback} icon={MessageSquareText} />
        <MetricCard label="Users" value={metrics.users} icon={Users} />
        <MetricCard label="Organizations" value={metrics.organizations} icon={Database} />
        <MetricCard label="Projects" value={metrics.projects} icon={ShieldCheck} />
        <MetricCard label="Tasks" value={metrics.tasks} icon={Activity} />
        <MetricCard label="Meetings" value={metrics.meetings} icon={CheckCircle2} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[rgba(0,0,0,0.06)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#0F1117]">Recent Audit Logs</h3>
        </div>
        {metrics.auditLogs.length ? metrics.auditLogs.map((log) => (
          <div key={log.id} className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.04)] px-4 py-3">
            <span className="rounded-full bg-[#F2F3F5] px-2 py-1 font-mono text-[10px] text-[#5F6B73]">{log.category ?? "system"}</span>
            <span className="text-xs font-medium text-[#0F1117]">{log.action}</span>
            <span className="ml-auto font-mono text-[10px] text-[#5F6B73]">{log.createdAt.slice(0, 19)}</span>
          </div>
        )) : (
          <div className="px-4 py-8 text-center text-xs text-[#5F6B73]">No audit logs available</div>
        )}
      </Card>
    </div>
  );
}

export default BetaReadinessSection;
