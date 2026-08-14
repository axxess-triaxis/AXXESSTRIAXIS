"use client";

import { Activity, AlertCircle, CheckCircle2, Database, ExternalLink, MessageSquareText, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { WorkflowStepCard } from "../../components/enterprise";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";
import {
  betaReadinessSnapshotMeta,
  engineeringMetrics,
  outreachMetrics,
  pilotTestimonials,
  readinessKanbans,
  tractionMetrics,
  waitlist,
  type SnapshotMetric,
} from "./betaReadinessSnapshot";

type BetaReadinessMetrics = {
  organizations: number;
  users: number;
  projects: number;
  tasks: number;
  meetings: number;
  feedback: number;
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

// A-96 (2026-08-04): every card built from the founder-cleared snapshot carries its own provenance
// tag -- "Computed" (directly derived from git/repo/dashboard evidence) or "Founder-stated" (real,
// but without an independently re-derivable source artifact in this repo). Distinct from the
// DataStateBadge system used elsewhere (Live/Demo/Provider-gated/Empty), which describes a live
// tenant-data connection state, not evidence provenance -- misusing that enum here would blur two
// different concepts.
function SnapshotCard({ metric }: { metric: SnapshotMetric }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{metric.label}</span>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${metric.provenance === "computed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {metric.provenance === "computed" ? "Computed" : "Founder-stated"}
        </span>
      </div>
      <div className="mt-2 font-mono text-xl font-semibold text-[#0F1117]">{metric.value}</div>
      <p className="mt-1 text-[11px] leading-relaxed text-[#5F6B73]">{metric.detail}</p>
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
        subtitle={`Founder readiness snapshot, cleared ${betaReadinessSnapshotMeta.asOf} -- Product Release 0.6`}
        action={<StatusPill ready={metrics.supabaseReady && metrics.feedbackReady} label={metrics.supabaseReady && metrics.feedbackReady ? "Ready" : "Needs Review"} />}
      />

      <Card className="p-4">
        <p className="text-xs leading-relaxed text-[#5F6B73]">
          The traction, engineering, outreach, and readiness figures below are a static snapshot,
          not a live external API poll -- computed by Claude Code, reviewed and cleared by the
          founder in conversation, then propagated here. Full citations for every figure are in{" "}
          <code className="rounded bg-[#F2F3F5] px-1 py-0.5 text-[11px]">{betaReadinessSnapshotMeta.sourceDoc}</code>.
          To refresh, ask for updated stats, review, clear, then have this snapshot updated to
          match -- figures here should never be hand-edited outside that loop.
        </p>
      </Card>

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

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">This Tenant (live)</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <MetricCard label="Feedback" value={metrics.feedback} icon={MessageSquareText} />
          <MetricCard label="Users" value={metrics.users} icon={Users} />
          <MetricCard label="Organizations" value={metrics.organizations} icon={Database} />
          <MetricCard label="Projects" value={metrics.projects} icon={ShieldCheck} />
          <MetricCard label="Tasks" value={metrics.tasks} icon={Activity} />
          <MetricCard label="Meetings" value={metrics.meetings} icon={CheckCircle2} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Traction Snapshot</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tractionMetrics.map((metric) => <SnapshotCard key={metric.label} metric={metric} />)}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Engineering Snapshot</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {engineeringMetrics.map((metric) => <SnapshotCard key={metric.label} metric={metric} />)}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Outreach Activity</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {outreachMetrics.map((metric) => <SnapshotCard key={metric.label} metric={metric} />)}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Readiness Kanbans</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {readinessKanbans.map((kanban) => (
            <Card key={kanban.title} className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0F1117]">{kanban.title}</h3>
                  <p className="mt-1 text-xs text-[#5F6B73]">{kanban.bandNote}</p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-[#8B1E2D]/8 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#8B1E2D]">{kanban.band}</span>
              </div>
              <div className="grid gap-2.5">
                {kanban.stages.map((stage, index) => (
                  <WorkflowStepCard key={stage.title} index={index + 1} title={stage.title} description={stage.description} status={stage.status} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Pilot Testimonials</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pilotTestimonials.map((testimonial) => (
            <Card key={testimonial.attribution} className="p-5">
              <div className="space-y-1.5">
                {testimonial.quotes.map((quote) => (
                  <p key={quote} className="text-xs leading-relaxed text-[#0F1117]">&ldquo;{quote}&rdquo;</p>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-[#8B1E2D]">-- {testimonial.attribution}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-[#0F1117]">Public Waitlist</h3>
        <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{waitlist.label}</p>
        <a
          href={waitlist.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#8B1E2D]/25 bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D] hover:bg-[#8B1E2D]/5"
        >
          <ExternalLink size={12} /> Open waitlist page
        </a>
        <p className="mt-3 text-[11px] leading-relaxed text-[#5F6B73]">Promoted on: {waitlist.channels}</p>
      </Card>
    </div>
  );
}

export default BetaReadinessSection;
