import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock3, Download, ShieldCheck, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../../auth/AuthProvider";
import { DataStateBadge, DemoDataNotice, MetricCard, ModuleHeader, PageShell, TenantScopeBadge } from "../../components/enterprise";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { demoRepositories } from "../../demo/demoRepositories";
import { useDemoModeEnabled } from "../../demo/useDemoModeEnabled";
import { analyticsDemoInsights } from "../../lib/demo/demoMetrics";
import { staggerDelay } from "../../lib/ui/staggerDelay";
import { aggregateProjectRisk } from "../dashboard/DashboardSection";
import {
  dashboardScopeForUser,
  fetchDashboardProjectsAndPrograms,
  getDashboardProjects,
} from "../dashboard/data";
import { getApprovalCycleTimeTrend, type ApprovalCycleTimePoint } from "./data";
import { ExportReportModal } from "./ExportReportModal";

type LiveProject = Awaited<ReturnType<typeof getDashboardProjects>>[number];

// A-96 (2026-08-04, corrected same day): Executive Dashboard owns the live Tier 1/2/3 scored
// operational tile stack (mail, social alerts, HITL review, audit trail, etc.) -- that content
// must not be duplicated here. Analytics & Reports has its own distinct role: OKRs, delivery
// trends, budget utilization, risk distribution, and approval cycle time -- historical/aggregate
// reporting, not live urgent-action tiles. Founder direction was that the two pages share the same
// UX *logic* (sequencing, priority, criticality as a visual language), not identical live content.
const demoOkrData = demoRepositories.institutionalRepository.getOkrData();
const demoPerformanceData = demoRepositories.institutionalRepository.getPerformanceData();
const demoProjects = demoRepositories.institutionalRepository.getProjects();

const demoApprovalCycleTrend = [
  { month: "Feb", days: 4.1 },
  { month: "Mar", days: 3.8 },
  { month: "Apr", days: 3.6 },
  { month: "May", days: 3.2 },
  { month: "Jun", days: 2.9 },
  { month: "Jul", days: 2.7 },
];

const riskChartColors: Record<string, string> = { "High risk projects": "#B4232F", "Medium risk projects": "#C9A227", "Low risk projects": "#2E9E6D" };

const demoVelocityTrend = [
  { sprint: "Spr 18", planned: 34, completed: 29 },
  { sprint: "Spr 19", planned: 38, completed: 35 },
  { sprint: "Spr 20", planned: 41, completed: 33 },
  { sprint: "Spr 21", planned: 36, completed: 34 },
  { sprint: "Spr 22", planned: 44, completed: 40 },
  { sprint: "Spr 23", planned: 42, completed: 39 },
];

const demoApprovedSpendTrend = [
  { month: "Feb", cumulative: 1.2 },
  { month: "Mar", cumulative: 2.1 },
  { month: "Apr", cumulative: 3.4 },
  { month: "May", cumulative: 4.6 },
  { month: "Jun", cumulative: 5.9 },
  { month: "Jul", cumulative: 7.3 },
];

const projectRiskColor: Record<string, string> = { urgent: "#8B1E2D", high: "#B4232F", medium: "#C9A227", low: "#2E9E6D" };

export const AnalyticsSection = () => {
  const { session } = useAuth();
  const demoMode = useDemoModeEnabled();
  const tenantScope = useMemo(() => (session.user ? dashboardScopeForUser(session.user) : undefined), [session.user]);

  const [liveProjects, setLiveProjects] = useState<LiveProject[]>([]);
  const [liveApprovalCycleTrend, setLiveApprovalCycleTrend] = useState<ApprovalCycleTimePoint[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  // A-116 (2026-08-14): shared selection for the Program Dependency Network diagram below --
  // clicking a node highlights it, matching the same clickable-node pattern built for
  // Stakeholders & CRM's Relationship Network in this same round of fixes.
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Analytics Sprint 1: real projects (via the same fetcher DashboardSection.tsx uses) and real
  // approval-cycle-time (approval_requests has genuine created_at/decided_at timestamps) for a live
  // tenant. A fetch failure must leave an honest empty list here, never demo content -- see
  // DEMO_DATA_LEAKAGE_AUDIT.md.
  useEffect(() => {
    if (demoMode || !tenantScope) return;

    let isMounted = true;
    fetchDashboardProjectsAndPrograms(tenantScope)
      .then((prefetched) => {
        if (!isMounted) return;
        getDashboardProjects(tenantScope, prefetched).then((rows) => {
          if (isMounted) setLiveProjects(rows);
        });
      })
      .catch(() => {
        if (isMounted) setLiveProjects([]);
      });

    getApprovalCycleTimeTrend(tenantScope).then((rows) => {
      if (isMounted) setLiveApprovalCycleTrend(rows);
    });

    return () => {
      isMounted = false;
    };
  }, [demoMode, tenantScope]);

  const projects = demoMode ? demoProjects : liveProjects;
  const okrData = demoMode ? demoOkrData : [];
  const performanceData = demoMode ? demoPerformanceData : [];
  const approvalCycleTrend = demoMode ? demoApprovalCycleTrend : liveApprovalCycleTrend;
  const velocityTrend = demoMode ? demoVelocityTrend : [];
  const approvedSpendTrend = demoMode ? demoApprovedSpendTrend : [];
  const riskDistribution = useMemo(() => aggregateProjectRisk(projects), [projects]);
  const latestCycleTime = liveApprovalCycleTrend.length > 0 ? liveApprovalCycleTrend[liveApprovalCycleTrend.length - 1] : null;

  // Real, minimal export -- same pattern as DashboardSection.tsx's handleExportBriefing(): a
  // client-side JSON snapshot of what's already on this page, no fabricated backend export
  // service. The instructions text is recorded alongside the data, not sent anywhere or acted on
  // by an AI pass in this cut -- shaping the export from free text is a later-sprint decision.
  function handleGenerateExport(instructions: string) {
    const payload = {
      exportedAt: new Date().toISOString(),
      instructions: instructions || null,
      dataMode: demoMode ? "demo" : "live",
      okrData,
      performanceData,
      riskDistribution,
      approvalCycleTrend,
      velocityTrend,
      approvedSpendTrend,
      projects: demoMode ? undefined : projects,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `axxess-analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  }

  return (
    <PageShell>
      <ModuleHeader
        title="Analytics & Reports"
        eyebrow="Enterprise command center"
        description="OKRs, delivery trends, budget utilization, risk distribution, and approval cycle time -- historical and aggregate reporting, distinct from the Executive Dashboard's live operational tiles."
        badges={[
          <TenantScopeBadge key="tenant" />,
          <DataStateBadge key="demo" state={demoMode ? "Demo" : "Live"} />,
        ]}
        actions={
          <button onClick={() => setExportModalOpen(true)} className="text-xs bg-[#8B1E2D] text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]">
            <Download size={12} /> Export Report
          </button>
        }
      />

      <ExportReportModal
        open={exportModalOpen}
        onConfirm={handleGenerateExport}
        onCancel={() => setExportModalOpen(false)}
      />

      {demoMode && (
        <DemoDataNotice label="OKR, budget, risk, and approval-cycle trend analytics below are seeded to show investor-ready reporting insight while live tenant metrics remain isolated behind repository and provider configuration." />
      )}

      <div className="flex flex-wrap gap-2">
        {["Organization", "Project", "Time period", "Risk level", "Department"].map((filter) => (
          <button key={filter} className="rounded-lg border border-[rgba(15,17,23,0.1)] bg-white px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">{filter}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {demoMode ? (
          <MetricCard label="OKR performance" value="86%" detail="Mission-cycle composite" icon={TrendingUp} href="/analytics" />
        ) : (
          <MetricCard label="OKR performance" value="Not tracked" detail="No OKR model wired yet" icon={TrendingUp} href="/analytics" />
        )}
        <MetricCard
          label="Approval cycle time"
          value={latestCycleTime ? `${latestCycleTime.avgDays}d` : demoMode ? "2.7d" : "No data yet"}
          detail={demoMode ? "18% faster with AI packets" : latestCycleTime ? `${latestCycleTime.count} decided this period` : "No decided approvals yet"}
          icon={Clock3}
          href="/approvals"
        />
        <MetricCard label="Risk distribution" value={`${riskDistribution[0].count}/${projects.length}`} detail="High-risk governance items" icon={ShieldCheck} href="/approvals" />
        {demoMode ? (
          <MetricCard label="Budget utilization" value="72%" detail="Variance flagged for Q4" icon={BarChart3} href="/analytics" />
        ) : (
          <MetricCard label="Budget utilization" value="Not tracked" detail="No project budget field yet" icon={BarChart3} href="/analytics" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 axxess-stagger-item" style={staggerDelay(0)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">OKR Performance</h3>
          {demoMode ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={okrData} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: "#0F1117" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                <Bar dataKey="progress" fill="#8B1E2D" radius={4} background={{ fill: "#F2F3F5" }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="OKRs are not tracked in this platform yet -- there is no objectives model wired to live tenant data. This is a distinct gap from the sections below, which use real project and approval data." />
          )}
        </Card>

        <Card className="p-5 axxess-stagger-item" style={staggerDelay(1)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Delivery Performance Trend</h3>
          {demoMode ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                <Line type="monotone" dataKey="planned" stroke="#C9A227" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="completed" stroke="#8B1E2D" strokeWidth={2.5} dot={{ r: 3, fill: "#8B1E2D" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Delivery performance trend requires a planned-vs-completed forecasting model that isn't wired to live tenant data yet." />
          )}
        </Card>

        <Card className="p-5 axxess-stagger-item" style={staggerDelay(2)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Risk Distribution</h3>
          {projects.length === 0 ? (
            <EmptyState message="No projects yet -- risk distribution will populate as soon as this organization has tracked projects." />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={riskDistribution} dataKey="count" nameKey="label" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {riskDistribution.map((entry) => (
                      <Cell key={entry.label} fill={riskChartColors[entry.label]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {riskDistribution.map((entry) => (
                  <div key={entry.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#5F6B73]">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: riskChartColors[entry.label] }} />
                      {entry.label.replace(" projects", "")}
                    </span>
                    <span className="font-mono font-semibold text-[#0F1117]">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 axxess-stagger-item" style={staggerDelay(3)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Approval Cycle Time Trend</h3>
          {approvalCycleTrend.length === 0 ? (
            <EmptyState message="No decided approvals yet -- cycle time is computed from real approval_requests once approvals start being reviewed." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={approvalCycleTrend.map((point) => ("days" in point ? point : { month: point.month, days: point.avgDays }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} unit="d" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} formatter={(value) => [`${value} days`, "Cycle time"]} />
                <Line type="monotone" dataKey="days" stroke="#8B1E2D" strokeWidth={2.5} dot={{ r: 3, fill: "#8B1E2D" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 axxess-stagger-item" style={staggerDelay(4)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Budget Utilization by Program</h3>
          {demoMode ? (
            <div className="space-y-3">
              {demoProjects.slice(0, 5).map((project) => {
                const spent = parseFloat(project.spent.replace("$", "").replace("M", ""));
                const budget = parseFloat(project.budget.replace("$", "").replace("M", ""));
                const util = Math.round((spent / budget) * 100);
                return (
                  <div key={project.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#0F1117] font-medium truncate max-w-[220px]">{project.name.split("-")[0].trim()}</span>
                      <span className="font-mono text-[#5F6B73]">{project.spent} / {project.budget}</span>
                    </div>
                    <div className="h-2 bg-[#F2F3F5] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${util}%`, backgroundColor: util > 90 ? "#8B1E2D" : util > 70 ? "#C9A227" : "#1A6B4A" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="Budget/spend is not tracked in this platform yet -- there is no budget field on live projects. This is a distinct gap from risk and cycle-time above, which use real data." />
          )}
        </Card>

        <Card className="p-5 axxess-stagger-item" style={staggerDelay(5)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Sprint Velocity (Planned vs. Completed)</h3>
          {demoMode ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={velocityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                <XAxis dataKey="sprint" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                <Bar dataKey="planned" fill="#C9A227" radius={3} />
                <Bar dataKey="completed" fill="#8B1E2D" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Sprint velocity is not tracked in this platform yet -- no planned-vs-completed sprint model is wired to live tenant data." />
          )}
        </Card>

        <Card className="p-5 axxess-stagger-item" style={staggerDelay(6)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Cumulative Approved Spend</h3>
          {demoMode ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={approvedSpendTrend}>
                <defs>
                  <linearGradient id="approvedSpendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B1E2D" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#8B1E2D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} unit="M" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} formatter={(value) => [`$${value}M`, "Cumulative spend"]} />
                <Area type="monotone" dataKey="cumulative" stroke="#8B1E2D" strokeWidth={2.5} fill="url(#approvedSpendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Approved spend is not tracked in this platform yet -- same gap as Budget Utilization above." />
          )}
        </Card>

        <Card className="p-5 axxess-stagger-item" style={staggerDelay(7)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI-Generated Insights</h3>
          {demoMode ? (
            <div className="space-y-3">
              {analyticsDemoInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-[#F8F9FA] rounded-lg">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${index === 1 ? "bg-red-500" : index < 3 ? "bg-amber-500" : "bg-blue-500"}`} />
                  <div>
                    <p className="text-xs text-[#0F1117] leading-relaxed">{insight}</p>
                    <span className="text-[10px] font-mono text-[#5F6B73] mt-1 inline-block">AI insight</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="AI-generated portfolio insights are not wired to live tenant data yet." />
          )}
        </Card>

        <Card className="overflow-hidden lg:col-span-2 axxess-stagger-item" style={staggerDelay(8)}>
          <div className="border-b border-[rgba(0,0,0,0.06)] px-5 py-3.5">
            <h3 className="text-sm font-semibold text-[#0F1117]">Program Operations</h3>
            <p className="text-[11px] text-[#5F6B73]">Every tracked program in one scannable table -- risk and progress together, not spread across separate cards.</p>
          </div>
          {projects.length === 0 ? (
            <div className="p-5">
              <EmptyState message="No projects yet for this organization." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA]">
                    {(demoMode ? ["Program", "Risk", "Progress", "Spent / Budget"] : ["Program", "Risk", "Progress", "Status"]).map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#5F6B73]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 8).map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => setSelectedProjectId(String(project.id))}
                      className={`cursor-pointer border-b border-[rgba(0,0,0,0.04)] transition-colors hover:bg-[#F8F9FA] ${selectedProjectId === String(project.id) ? "bg-[#F8F9FA]" : ""}`}
                    >
                      <td className="max-w-[220px] truncate px-4 py-2.5 font-medium text-[#0F1117]">{project.name.split("-")[0].trim()}</td>
                      <td className="px-4 py-2.5"><RiskBadge level={project.risk} /></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#F2F3F5]">
                            <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${project.progress}%` }} />
                          </div>
                          <span className="font-mono text-[10px] text-[#5F6B73]">{project.progress}%</span>
                        </div>
                      </td>
                      {demoMode ? (
                        (() => {
                          const demoProject = project as unknown as { spent: string; budget: string };
                          const spent = parseFloat(demoProject.spent.replace("$", "").replace("M", ""));
                          const budget = parseFloat(demoProject.budget.replace("$", "").replace("M", ""));
                          const util = Math.round((spent / budget) * 100);
                          return (
                            <td className="px-4 py-2.5 font-mono text-[10px] text-[#5F6B73]">{demoProject.spent} / {demoProject.budget} <span className={util > 90 ? "text-[#8B1E2D]" : ""}>({util}%)</span></td>
                          );
                        })()
                      ) : (
                        <td className="px-4 py-2.5 font-mono text-[10px] text-[#5F6B73]">{project.status}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5 axxess-stagger-item" style={staggerDelay(9)}>
          <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Program Dependency Network</h3>
          {projects.length === 0 ? (
            <EmptyState message="No projects yet -- the dependency network will populate once this organization has tracked projects." />
          ) : (
            <>
              <svg viewBox="0 0 200 160" className="w-full">
                <circle cx="100" cy="80" r="16" fill="#0F1117" opacity="0.9" />
                <text x="100" y="84" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">Portfolio</text>
                {projects.slice(0, 8).map((project, i, arr) => {
                  const angle = (i / arr.length) * 2 * Math.PI - Math.PI / 2;
                  const r = 62;
                  const x = 100 + r * Math.cos(angle);
                  const y = 80 + r * Math.sin(angle);
                  const isSelected = selectedProjectId === String(project.id);
                  const color = projectRiskColor[project.risk] ?? "#2C4A7C";
                  return (
                    <g key={project.id} onClick={() => setSelectedProjectId(String(project.id))} className="cursor-pointer">
                      <line x1="100" y1="80" x2={x} y2={y} stroke={color} strokeWidth={isSelected ? 2 : 1} strokeOpacity={isSelected ? 0.9 : 0.35} />
                      <circle cx={x} cy={y} r={isSelected ? 10 : 8} fill={color} opacity="0.9" stroke={isSelected ? "#0F1117" : "none"} strokeWidth={isSelected ? 1.5 : 0} />
                    </g>
                  );
                })}
              </svg>
              <p className="mt-2 text-[10px] leading-relaxed text-[#5F6B73]">Node color reflects program risk (red = urgent/high, amber = medium, green = low). Click a node or a Program Operations row to highlight it here.</p>
            </>
          )}
        </Card>
      </div>
    </PageShell>
  );
};

export default AnalyticsSection;
