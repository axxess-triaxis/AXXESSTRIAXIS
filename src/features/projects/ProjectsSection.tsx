import { useState } from "react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { applicationServices } from "../../providers/serviceProvider";
import { Plus } from "lucide-react";

const projects = applicationServices.institutionalRepository.getProjects();

export const ProjectsSection = () => {
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const columns = [
    { label: "Planning", key: "Planning", color: "#5F6B73" },
    { label: "In Progress", key: "In Progress", color: "#2C4A7C" },
    { label: "Under Review", key: "Review", color: "#C9A227" },
    { label: "Complete", key: "Complete", color: "#1A6B4A" },
  ];

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        title="Projects & Programs"
        subtitle="47 active initiatives across 12 government departments"
        action={
          <div className="flex items-center gap-2">
            <div className="flex border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
              {(["kanban", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-xs px-3 py-1.5 capitalize transition-colors ${view === v ? "bg-[#8B1E2D] text-white" : "text-[#5F6B73] hover:bg-[#F2F3F5]"}`}
                >
                  {v === "kanban" ? "Kanban" : "List"}
                </button>
              ))}
            </div>
            <button className="text-xs bg-[#8B1E2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]">
              <Plus size={12} /> New Project
            </button>
          </div>
        }
      />

      {view === "kanban" ? (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max h-full">
            {columns.map((col) => {
              const colProjects = projects.filter((p) => p.status === col.key);
              return (
                <div key={col.key} className="w-72 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold text-[#0F1117]">{col.label}</span>
                    <span className="ml-auto text-xs font-mono text-[#5F6B73] bg-[#F2F3F5] px-2 py-0.5 rounded-full">{colProjects.length}</span>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    {colProjects.map((p) => (
                      <Card key={p.id} className="p-3.5 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-[10px] font-medium text-[#5F6B73] uppercase tracking-wide">{p.dept}</span>
                          <RiskBadge level={p.risk} />
                        </div>
                        <h4 className="text-sm font-semibold text-[#0F1117] leading-snug mb-3">{p.name}</h4>
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-[#5F6B73] mb-1">
                            <span>Progress</span><span className="font-mono">{p.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden">
                            <div className="h-full bg-[#8B1E2D] rounded-full" style={{ width: `${p.progress}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Avatar initials={p.owner} />
                            <div>
                              <div className="text-[10px] text-[#5F6B73]">Budget</div>
                              <div className="text-[11px] font-mono font-semibold text-[#0F1117]">{p.budget}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-[#5F6B73]">Due</div>
                            <div className="text-[11px] font-mono text-[#0F1117]">{p.dueDate.slice(5)}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {colProjects.length === 0 && (
                      <div className="h-20 border-2 border-dashed border-[rgba(0,0,0,0.08)] rounded-xl flex items-center justify-center text-xs text-[#5F6B73]">
                        No projects
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="flex-1 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)]">
                {["Project", "Department", "Progress", "Budget", "Risk", "Status", "Due"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider px-4 py-3 first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#F8F9FA] transition-colors cursor-pointer">
                  <td className="px-4 py-3 pl-5">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={p.owner} />
                      <span className="font-medium text-[#0F1117] text-xs">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5F6B73]">{p.dept}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden">
                        <div className="h-full bg-[#8B1E2D] rounded-full" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-[#5F6B73]">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#0F1117]">{p.budget}</td>
                  <td className="px-4 py-3"><RiskBadge level={p.risk} /></td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#5F6B73]">{p.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default ProjectsSection;
