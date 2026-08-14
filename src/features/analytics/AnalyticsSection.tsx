import { useMemo, useState } from "react";
import { BarChart3, Clock3, Download, ShieldCheck, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataStateBadge, DemoDataNotice, MetricCard, ModuleHeader, PageShell, TenantScopeBadge } from "../../components/enterprise";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/Card";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { analyticsDemoInsights } from "../../lib/demo/demoMetrics";
import { staggerDelay } from "../../lib/ui/staggerDelay";
import { applicationServices } from "../../providers/serviceProvider";
import { aggregateProjectRisk } from "../dashboard/DashboardSection";
import { ExportReportModal } from "./ExportReportModal";

// A-96 (2026-08-04, corrected same day): Executive Dashboard owns the live Tier 1/2/3 scored
// operational tile stack (mail, social alerts, HITL review, audit trail, etc.) -- that content
// must not be duplicated here. Analytics & Reports has its own distinct role: OKRs, delivery
// trends, budget utilization, risk distribution, and approval cycle time -- historical/aggregate
// reporting, not live urgent-action tiles. Founder direction was that the two pages share the same
// UX *logic* (sequencing, priority, criticality as a visual language), not identical live content.
// There is no live OKR/budget-trend computation engine yet, so this section stays gated behind
// isDemoModeEnabled(); real tenants see an honest not-yet-connected state instead of fabricated
// metrics. See DEMO_DATA_LEAKAGE_AUDIT.md.
const okrData = applicationServices.institutionalRepository.getOkrData();
const performanceData = applicationServices.institutionalRepository.getPerformanceData();
const projects = applicationServices.institutionalRepository.getProjects();

const approvalCycleTrend = [
  { month: "Feb", days: 4.1 },
  { month: "Mar", days: 3.8 },
  { month: "Apr", days: 3.6 },
  { month: "May", days: 3.2 },
  { month: "Jun", days: 2.9 },
  { month: "Jul", days: 2.7 },
];

const riskChartColors: Record<string, string> = { "High risk projects": "#B4232F", "Medium risk projects": "#C9A227", "Low risk projects": "#2E9E6D" };

const velocityTrend = [
  { sprint: "Spr 18", planned: 34, completed: 29 },
  { sprint: "Spr 19", planned: 38, completed: 35 },
  { sprint: "Spr 20", planned: 41, completed: 33 },
  { sprint: "Spr 21", planned: 36, completed: 34 },
  { sprint: "Spr 22", planned: 44, completed: 40 },
  { sprint: "Spr 23", planned: 42, completed: 39 },
];

const approvedSpendTrend = [
  { month: "Feb", cumulative: 1.2 },
  { month: "Mar", cumulative: 2.1 },
  { month: "Apr", cumulative: 3.4 },
  { month: "May", cumulative: 4.6 },
  { month: "Jun", cumulative: 5.9 },
  { month: "Jul", cumulative: 7.3 },
];

export const AnalyticsSection = () => {
  const demoMode = isDemoModeEnabled();
  const riskDistribution = useMemo(() => aggregateProjectRisk(projects), []);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Real, minimal export -- same pattern as DashboardSection.tsx's handleExportBriefing(): a
  // client-side JSON snapshot of what's already on this page, no fabricated backend export
  // service. The instructions text is recorded alongside the data, not sent anywhere or acted on
  // by an AI pass in this cut -- shaping the export from free text is a later-sprint decision.
  function handleGenerateExport(instructions: string) {
    const payload = {
      exportedAt: new Date().toISOString(),
      instructions: instructions || null,
      okrData,
      performanceData,
      riskDistribution,
      approvalCycleTrend,
      velocityTrend,
      approvedSpendTrend,
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
          <DataStateBadge key="provider" state="Provider-gated" />,
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

      {!demoMode && (
        <Card className="p-8">
          <EmptyState message="Deeper OKR, budget-trend, and approval-cycle analytics require computation that isn't wired to live tenant data yet. For live operational signals (mail, approvals, HITL review, audit trail), see the Executive Dashboard." />
        </Card>
      )}
      {demoMode && (
        <>
          <div className="flex flex-wrap gap-2">
            {["Organization", "Project", "Time period", "Risk level", "Department"].map((filter) => (
              <button key={filter} className="rounded-lg border border-[rgba(15,17,23,0.1)] bg-white px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">{filter}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="OKR performance" value="86%" detail="Mission-cycle composite" icon={TrendingUp} href="/analytics" />
            <MetricCard label="Approval cycle time" value="2.7d" detail="18% faster with AI packets" icon={Clock3} href="/approvals" />
            <MetricCard label="Risk distribution" value={`${riskDistribution[0].count}/${projects.length}`} detail="High-risk governance items" icon={ShieldCheck} href="/approvals" />
            <MetricCard label="Budget utilization" value="72%" detail="Variance flagged for Q4" icon={BarChart3} href="/analytics" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 axxess-stagger-item" style={staggerDelay(0)}>
              <h3 className="text-sm font-semibold text-[#0F1117] mb-4">OKR Performance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={okrData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: "#0F1117" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                  <Bar dataKey="progress" fill="#8B1E2D" radius={4} background={{ fill: "#F2F3F5" }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 axxess-stagger-item" style={staggerDelay(1)}>
              <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Delivery Performance Trend</h3>
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
            </Card>

            <Card className="p-5 axxess-stagger-item" style={staggerDelay(2)}>
              <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Risk Distribution</h3>
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
            </Card>

            <Card className="p-5 axxess-stagger-item" style={staggerDelay(3)}>
              <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Approval Cycle Time Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={approvalCycleTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} unit="d" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} formatter={(value) => [`${value} days`, "Cycle time"]} />
                  <Line type="monotone" dataKey="days" stroke="#8B1E2D" strokeWidth={2.5} dot={{ r: 3, fill: "#8B1E2D" }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 axxess-stagger-item" style={staggerDelay(4)}>
              <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Budget Utilization by Program</h3>
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => {
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
            </Card>

            <Card className="p-5 axxess-stagger-item" style={staggerDelay(5)}>
              <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Sprint Velocity (Planned vs. Completed)</h3>
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
            </Card>

            <Card className="p-5 axxess-stagger-item" style={staggerDelay(6)}>
              <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Cumulative Approved Spend</h3>
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
            </Card>

            <Card className="p-5 axxess-stagger-item" style={staggerDelay(7)}>
              <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI-Generated Insights</h3>
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
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
};

export default AnalyticsSection;
