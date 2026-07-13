import { Download, PlayCircle, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../auth/AuthProvider";
import {
  ActivityFeed,
  CommandSearchPlaceholder,
  DataStateBadge,
  DemoDataNotice,
  MetricCard,
  ModuleHeader,
  PageShell,
  SectionCard,
  TenantScopeBadge,
} from "../../components/enterprise";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useGuidedDemo } from "../../hooks/useGuidedDemo";
import { useLiveRagHealth } from "../../hooks/useLiveRagHealth";
import { useLiveWorkspaceMetrics } from "../../hooks/useLiveWorkspaceMetrics";
import { demoRecentActivity } from "../../lib/demo/demoActivity";
import { demoInstitution } from "../../lib/demo/seedData";
import { executiveDemoMetrics } from "../../lib/demo/demoMetrics";
import { BetaOnboardingChecklist } from "../onboarding/BetaOnboardingChecklist";
import {
  dashboardAiRecommendations,
  dashboardObjectives,
  dashboardScopeForUser,
  getDashboardFallbackProjects,
  getDashboardProjects,
  governanceAlerts,
  performanceData,
  workloadData,
} from "./data";

type DashboardProject = Awaited<ReturnType<typeof getDashboardProjects>>[number];

const heatmap = [
  { label: "Referral", level: 3 },
  { label: "Budget", level: 2 },
  { label: "Oxygen", level: 3 },
  { label: "Audit", level: 2 },
  { label: "Vendor", level: 1 },
  { label: "Stockout", level: 3 },
  { label: "Outreach", level: 2 },
  { label: "Data", level: 2 },
  { label: "Staffing", level: 1 },
];

export function DashboardSection() {
  const { session } = useAuth();
  const tenantScope = useMemo(() => session.user ? dashboardScopeForUser(session.user) : undefined, [session.user]);
  const [projects, setProjects] = useState<DashboardProject[]>(() => getDashboardFallbackProjects());
  const guidedDemo = useGuidedDemo("dashboard");
  const liveMetrics = useLiveWorkspaceMetrics(tenantScope);
  const ragHealth = useLiveRagHealth(tenantScope);

  useEffect(() => {
    if (!tenantScope) return;

    let isMounted = true;
    getDashboardProjects(tenantScope)
      .then((projectRows) => {
        if (!isMounted) return;
        setProjects(projectRows);
      })
      .catch(() => {
        if (!isMounted) return;
        setProjects(getDashboardFallbackProjects());
      });

    return () => {
      isMounted = false;
    };
  }, [tenantScope]);

  return (
    <PageShell>
      <ModuleHeader
        title="Executive Dashboard"
        eyebrow={demoInstitution.organizationName}
        description="Portfolio command center for executive risk, approvals, RAG readiness, budget variance, stakeholder follow-ups, and guided investor walkthroughs."
        badges={[
          <TenantScopeBadge key="tenant" label="North East Health Mission tenant" />,
          <DataStateBadge key="demo" state="Demo" />,
          <DataStateBadge key="live" state="Live" />,
          <DataStateBadge key="provider" state="Provider-gated" />,
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={guidedDemo.startDemo} className="flex items-center gap-1.5 rounded-lg bg-[#0F1117] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D2430]">
              <PlayCircle size={13} /> Start guided demo
            </button>
            <a href="mailto:founders@triaxis.ventures?subject=AXXESS%20feedback" className="flex items-center gap-1.5 rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">
              Send feedback
            </a>
            <button className="text-xs text-[#5F6B73] flex items-center gap-1.5 hover:text-[#0F1117] transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>
            <button className="text-xs bg-[#8B1E2D] text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27] transition-colors">
              <Download size={12} /> Export Briefing
            </button>
          </div>
        }
      />

      <DemoDataNotice label="The dashboard is preloaded to look like a 6-12 month institutional operating environment while live repositories remain tenant-isolated." />
      <CommandSearchPlaceholder />

      {session.user && <BetaOnboardingChecklist user={session.user} projectCount={projects.length} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {executiveDemoMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} state="Demo" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">AI Router</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Fallback Ready</span>
          </div>
          <div className="mt-3 font-mono text-2xl font-semibold text-[#0F1117]">{ragHealth.readyDocuments}</div>
          <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">RAG-ready documents with local deterministic retrieval when provider keys are not configured.</p>
        </Card>
        <Card className="p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Live Ops</span>
            <span className="rounded-full bg-[#8B1E2D]/8 px-2 py-0.5 text-[10px] font-semibold text-[#8B1E2D]">Tenant Scoped</span>
          </div>
          <div className="mt-3 font-mono text-2xl font-semibold text-[#0F1117]">{liveMetrics.openTasks}</div>
          <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">Open tasks across active mission projects, refreshed through repository hooks.</p>
        </Card>
        <Card className="p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">External Signals</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Review First</span>
          </div>
          <div className="mt-3 font-mono text-2xl font-semibold text-[#0F1117]">{liveMetrics.socialAlerts}</div>
          <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">Social, RSS, and manual alerts queued for human-approved workflow actions.</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {governanceAlerts.map((alert) => (
          <Card key={alert.label} className="p-4 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{alert.label}</span>
              <span className="rounded-full bg-[#8B1E2D]/8 px-2 py-0.5 text-[10px] font-semibold text-[#8B1E2D]">Live</span>
            </div>
            <div className="mt-3 font-mono text-2xl font-semibold text-[#0F1117]">{alert.value}</div>
            <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{alert.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <SectionCard title="Recent institutional activity" description="Seeded activity mirrors a live operating environment and ties AI, approvals, documents, and stakeholder follow-ups together.">
          <ActivityFeed items={demoRecentActivity} />
        </SectionCard>
        <SectionCard title="Priority actions" description="Next actions for a screenshot-ready investor walkthrough.">
          <div className="space-y-2">
            {[
              { label: "Generate executive briefing", href: "/ai-workspace" },
              { label: "Review pending approval", href: "/approvals" },
              { label: "Open governed document", href: "/knowledge" },
              { label: "Request pilot conversation", href: "mailto:founders@triaxis.ventures?subject=AXXESS%20pilot%20request" },
            ].map((action) => (
              <a key={action.label} href={action.href} className="flex items-center justify-between rounded-lg border border-[rgba(15,17,23,0.08)] px-3 py-2 text-xs font-semibold text-[#0F1117] hover:bg-[#F8F9FA]">
                {action.label}
                <span className="text-[#8B1E2D]">Open</span>
              </a>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0F1117] text-sm">Strategic Objectives - FY2026 Mission Cycle</h3>
            <span className="text-xs text-[#5F6B73]">4 of 4 actively governed</span>
          </div>
          <div className="space-y-4">
            {dashboardObjectives.map((objective) => (
              <div key={objective.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[#0F1117]">{objective.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#5F6B73]">{objective.progress}% / {objective.target}%</span>
                    <span className={`text-[10px] font-semibold ${objective.progress >= objective.target * 0.9 ? "text-emerald-600" : objective.progress >= objective.target * 0.7 ? "text-amber-600" : "text-red-600"}`}>
                      {objective.progress >= objective.target * 0.9 ? "On Track" : objective.progress >= objective.target * 0.7 ? "At Risk" : "Behind"}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[#F2F3F5] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(objective.progress / objective.target) * 100}%`,
                      backgroundColor: objective.progress >= objective.target * 0.9 ? "#1A6B4A" : objective.progress >= objective.target * 0.7 ? "#C9A227" : "#8B1E2D",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#8B1E2D]/10 rounded-md flex items-center justify-center">
              <Sparkles size={13} className="text-[#8B1E2D]" />
            </div>
            <h3 className="font-semibold text-[#0F1117] text-sm">AI Recommendations</h3>
          </div>
          <div className="space-y-3">
            {dashboardAiRecommendations.map((recommendation, index) => (
              <button key={index} className="flex w-full items-start gap-2.5 p-2.5 rounded-lg bg-[#F2F3F5] hover:bg-[#EAEBEE] transition-colors text-left">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${recommendation.urgency === "urgent" ? "bg-red-500" : recommendation.urgency === "high" ? "bg-amber-500" : "bg-blue-500"}`} />
                <span>
                  <span className="block text-xs text-[#0F1117] font-medium leading-snug">{recommendation.title}</span>
                  <span className="text-[10px] text-[#5F6B73] font-mono">{recommendation.type}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0F1117] text-sm">Project Health Monitor</h3>
            <button className="text-xs text-[#8B1E2D] font-medium hover:underline">View All {projects.length}</button>
          </div>
          <div className="space-y-2.5">
            {projects.slice(0, 5).map((project) => (
              <button key={project.id} className="flex w-full items-center gap-3 p-2.5 rounded-lg hover:bg-[#F2F3F5] transition-colors text-left">
                <Avatar initials={project.owner} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#0F1117] truncate">{project.name}</span>
                    <RiskBadge level={project.risk} />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex-1 h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden">
                      <span className="block h-full rounded-full bg-[#8B1E2D]" style={{ width: `${project.progress}%` }} />
                    </span>
                    <span className="text-[11px] font-mono text-[#5F6B73] w-8 text-right">{project.progress}%</span>
                  </span>
                </span>
                <StatusBadge status={project.status} />
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[#0F1117] text-sm mb-4">Risk Heatmap</h3>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {heatmap.map((risk) => (
              <div
                key={risk.label}
                className="rounded-lg p-2 text-center"
                style={{
                  backgroundColor: risk.level === 3 ? "#FEF2F2" : risk.level === 2 ? "#FFFBEB" : "#F0FDF4",
                  border: `1px solid ${risk.level === 3 ? "#FECACA" : risk.level === 2 ? "#FDE68A" : "#BBF7D0"}`,
                }}
              >
                <div className={`text-[10px] font-semibold ${risk.level === 3 ? "text-red-700" : risk.level === 2 ? "text-amber-700" : "text-emerald-700"}`}>{risk.label}</div>
                <div className={`text-[10px] font-mono ${risk.level === 3 ? "text-red-500" : risk.level === 2 ? "text-amber-500" : "text-emerald-500"}`}>{risk.level === 3 ? "HIGH" : risk.level === 2 ? "MED" : "LOW"}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#5F6B73]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-200 inline-block" />Low</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-200 inline-block" />Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-200 inline-block" />High</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-[#0F1117] text-sm mb-4">Team Workload Capacity</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={workloadData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5F6B73", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} formatter={(value) => [`${value}%`, "Utilization"]} />
              <Bar dataKey="value" fill="#8B1E2D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[#0F1117] text-sm mb-4">Deliverable Completion Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
              <Area type="monotone" dataKey="planned" stroke="#C9A227" strokeWidth={2} fill="#C9A22720" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="completed" stroke="#8B1E2D" strokeWidth={2} fill="#8B1E2D15" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </PageShell>
  );
}
