import { useState } from "react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { applicationServices } from "../../providers/serviceProvider";
import { Check, Filter, Plus, Sparkles } from "lucide-react";

const tasks = applicationServices.institutionalRepository.getTasks();

export const TasksSection = () => {
  const [checked, setChecked] = useState<number[]>([]);

  const priorityOrder = ["urgent", "high", "medium", "low"];
  const sorted = [...tasks].sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));

  return (
    <div>
      <SectionHeader
        title="Tasks & Workflow"
        subtitle={`${tasks.length} active tasks · ${tasks.filter((t) => t.aiSuggested).length} AI-suggested`}
        action={
          <div className="flex items-center gap-2">
            <button className="text-xs border border-[rgba(0,0,0,0.1)] text-[#5F6B73] px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#F2F3F5]">
              <Filter size={12} /> Filter
            </button>
            <button className="text-xs bg-[#8B1E2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]">
              <Plus size={12} /> New Task
            </button>
          </div>
        }
      />
      <Card className="overflow-hidden">
        <div className="border-b border-[rgba(0,0,0,0.06)] px-4 py-2.5 flex items-center gap-4 bg-[#F8F9FA]">
          <span className="text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider">Task</span>
          <span className="ml-auto text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider hidden lg:block">Project</span>
          <span className="text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider w-20 text-center hidden lg:block">Priority</span>
          <span className="text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider w-20 text-center">Assignee</span>
          <span className="text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider w-24 text-right">Due Date</span>
        </div>
        {sorted.map((task) => (
          <div key={task.id} className={`flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.04)] hover:bg-[#F8F9FA] transition-colors ${checked.includes(task.id) ? "opacity-50" : ""}`}>
            <button
              onClick={() => setChecked((prev) => prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id])}
              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${checked.includes(task.id) ? "bg-emerald-500 border-emerald-500" : "border-[rgba(0,0,0,0.2)] hover:border-[#8B1E2D]"}`}
            >
              {checked.includes(task.id) && <Check size={9} className="text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium text-[#0F1117] truncate ${checked.includes(task.id) ? "line-through" : ""}`}>{task.title}</span>
                {task.aiSuggested && (
                  <span className="flex-shrink-0 flex items-center gap-1 text-[10px] text-[#8B1E2D] bg-[#8B1E2D]/8 border border-[#8B1E2D]/15 px-1.5 py-0.5 rounded-full">
                    <Sparkles size={9} /> AI
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] text-[#5F6B73] hidden lg:block w-40 truncate">{task.project}</span>
            <div className="w-20 text-center hidden lg:flex justify-center"><RiskBadge level={task.priority} /></div>
            <div className="w-20 flex justify-center"><Avatar initials={task.assignee} /></div>
            <span className="w-24 text-right text-[11px] font-mono text-[#5F6B73]">{task.due.slice(5)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default TasksSection;
