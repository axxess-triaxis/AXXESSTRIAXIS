import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { applicationServices } from "../../providers/serviceProvider";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const okrData = applicationServices.institutionalRepository.getOkrData();
const performanceData = applicationServices.institutionalRepository.getPerformanceData();
const projects = applicationServices.institutionalRepository.getProjects();

export const AnalyticsSection = () => (
  <div>
    <SectionHeader
      title="Analytics & Reports"
      subtitle="Executive intelligence for the FY2026 mission cycle"
      action={
        <button className="text-xs bg-[#8B1E2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]">
          <Download size={12} /> Export Report
        </button>
      }
    />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5">
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

      <Card className="p-5">
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

      <Card className="p-5">
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

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI-Generated Insights</h3>
        <div className="space-y-3">
          {[
            { insight: "Portfolio burn rate is 7% above benchmark; Q4 spending acceleration detected in cold-chain and oxygen workstreams", type: "Financial", severity: "medium" },
            { insight: "Maternal referral and oxygen resilience programs have 91% correlated operational risk patterns", type: "Risk", severity: "high" },
            { insight: "Stakeholder engagement dropped 18% across two district review cycles; Finance & Grants contacts need reactivation", type: "Relationship", severity: "medium" },
            { insight: "11 Mission Secretariat decisions have no linked action owner; accountability follow-up is required", type: "Governance", severity: "low" },
          ].map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-[#F8F9FA] rounded-lg">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${insight.severity === "high" ? "bg-red-500" : insight.severity === "medium" ? "bg-amber-500" : "bg-blue-500"}`} />
              <div>
                <p className="text-xs text-[#0F1117] leading-relaxed">{insight.insight}</p>
                <span className="text-[10px] font-mono text-[#5F6B73] mt-1 inline-block">{insight.type}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

export default AnalyticsSection;
