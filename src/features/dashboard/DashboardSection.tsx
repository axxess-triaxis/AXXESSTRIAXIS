import { Download, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { LoadingState } from "../../components/feedback/LoadingState";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../auth/AuthProvider";
import { KpiCard } from "./components/KpiCard";
import { dashboardAiRecommendations, dashboardObjectives, dashboardScopeForUser, getDashboardKpis, getDashboardProjects, performanceData, workloadData } from "./data";
import type { DashboardKpi } from "./types";

type DashboardProject = Awaited<ReturnType<typeof getDashboardProjects>>[number];

export function DashboardSection() {
  const { session } = useAuth();
  const tenantScope = useMemo(() => session.user ? dashboardScopeForUser(session.user) : undefined, [session.user]);
  const [dashboardKpis, setDashboardKpis] = useState<DashboardKpi[]>([]);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(Boolean(tenantScope));
  const [loadError, setLoadError] = useState<string | null>(null);
  const objectives = dashboardObjectives;
  const aiRecs = dashboardAiRecommendations;

  useEffect(() => {
    if (!tenantScope) return;

    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    Promise.all([getDashboardKpis(tenantScope), getDashboardProjects(tenantScope)])
      .then(([kpis, projectRows]) => {
        if (!isMounted) return;
        setDashboardKpis(kpis);
        setProjects(projectRows);
      })
      .catch(() => {
        if (isMounted) setLoadError("Unable to load Supabase-backed dashboard data.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tenantScope]);

  if (loading) return <LoadingState label="Loading portfolio data" />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Executive Dashboard"
        subtitle="Portfolio intelligence as of November 11, 2024 · 08:47 EST"
        action={
          <div className="flex items-center gap-2">
            <button className="text-xs text-[#5F6B73] flex items-center gap-1.5 hover:text-[#0F1117] transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>
            <button className="text-xs bg-[#8B1E2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27] transition-colors">
              <Download size={12} /> Export Briefing
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardKpis.map((kpi) => (
          <KpiCard key={kpi.label} metric={kpi} />
        ))}
      </div>
      {loadError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">{loadError}</div>}

      {/* Strategic Objectives + AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0F1117] text-sm">Strategic Objectives — Q4 FY2024-25</h3>
            <span className="text-xs text-[#5F6B73]">4 of 4 on track</span>
          </div>
          <div className="space-y-4">
            {objectives.map((obj) => (
              <div key={obj.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[#0F1117]">{obj.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#5F6B73]">{obj.progress}% / {obj.target}%</span>
                    <span className={`text-[10px] font-semibold ${obj.progress >= obj.target * 0.9 ? "text-emerald-600" : obj.progress >= obj.target * 0.7 ? "text-amber-600" : "text-red-600"}`}>
                      {obj.progress >= obj.target * 0.9 ? "On Track" : obj.progress >= obj.target * 0.7 ? "At Risk" : "Behind"}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[#F2F3F5] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(obj.progress / obj.target) * 100}%`,
                      backgroundColor: obj.progress >= obj.target * 0.9 ? "#1A6B4A" : obj.progress >= obj.target * 0.7 ? "#C9A227" : "#8B1E2D"
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
            {aiRecs.map((rec, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#F2F3F5] hover:bg-[#EAEBEE] transition-colors cursor-pointer">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${rec.urgency === "urgent" ? "bg-red-500" : rec.urgency === "high" ? "bg-amber-500" : "bg-blue-500"}`} />
                <div>
                  <p className="text-xs text-[#0F1117] font-medium leading-snug">{rec.title}</p>
                  <span className="text-[10px] text-[#5F6B73] font-mono">{rec.type}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Project Health + Risk Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#0F1117] text-sm">Project Health Monitor</h3>
            <button className="text-xs text-[#8B1E2D] font-medium hover:underline">View All 47</button>
          </div>
          <div className="space-y-2.5">
            {projects.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F2F3F5] transition-colors cursor-pointer">
                <Avatar initials={p.owner} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#0F1117] truncate">{p.name}</span>
                    <RiskBadge level={p.risk} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-[#5F6B73] w-8 text-right">{p.progress}%</span>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[#0F1117] text-sm mb-4">Risk Heatmap</h3>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {[
              { label: "Schedule", level: 3 }, { label: "Budget", level: 2 }, { label: "Technical", level: 3 },
              { label: "Regulatory", level: 2 }, { label: "Vendor", level: 1 }, { label: "Security", level: 3 },
              { label: "Political", level: 2 }, { label: "Data", level: 2 }, { label: "Capacity", level: 1 },
            ].map((risk) => (
              <div
                key={risk.label}
                className="rounded-lg p-2 text-center"
                style={{
                  backgroundColor: risk.level === 3 ? "#FEF2F2" : risk.level === 2 ? "#FFFBEB" : "#F0FDF4",
                  border: `1px solid ${risk.level === 3 ? "#FECACA" : risk.level === 2 ? "#FDE68A" : "#BBF7D0"}`
                }}
              >
                <div className={`text-[10px] font-semibold ${risk.level === 3 ? "text-red-700" : risk.level === 2 ? "text-amber-700" : "text-emerald-700"}`}>
                  {risk.label}
                </div>
                <div className={`text-[10px] font-mono ${risk.level === 3 ? "text-red-500" : risk.level === 2 ? "text-amber-500" : "text-emerald-500"}`}>
                  {risk.level === 3 ? "HIGH" : risk.level === 2 ? "MED" : "LOW"}
                </div>
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

      {/* Team Workload Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-[#0F1117] text-sm mb-4">Team Workload Capacity</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={workloadData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F3F5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5F6B73", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#5F6B73" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                formatter={(value) => [`${value}%`, "Utilization"]}
              />
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
    </div>
  );
};
