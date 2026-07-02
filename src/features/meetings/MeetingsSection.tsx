import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { applicationServices } from "../../providers/serviceProvider";
import { Plus, Sparkles } from "lucide-react";

const meetings = applicationServices.institutionalRepository.getMeetings();

export const MeetingsSection = () => (
  <div>
    <SectionHeader
      title="Meetings & Decisions"
      subtitle="AI-generated summaries and decision log"
      action={
        <button className="text-xs bg-[#8B1E2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]">
          <Plus size={12} /> Schedule Meeting
        </button>
      }
    />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <h3 className="text-xs font-semibold text-[#5F6B73] uppercase tracking-wider mb-3">Meeting Schedule</h3>
        <div className="space-y-3">
          {meetings.map((m) => (
            <Card key={m.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-[#0F1117] leading-snug">{m.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-[#5F6B73]">{m.date} · {m.time}</span>
                    <span className="text-[11px] text-[#5F6B73]">{m.duration}</span>
                    <span className="text-[10px] text-[#5F6B73]">{m.attendees} attendees</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[#5F6B73] bg-[#F2F3F5] px-2 py-0.5 rounded-full">{m.type}</span>
                  <StatusBadge status={m.status} />
                </div>
              </div>
              {m.aiSummary && (
                <div className="flex items-start gap-1.5 bg-[#F8F9FA] rounded-lg px-3 py-2 mt-2">
                  <Sparkles size={11} className="text-[#8B1E2D] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[#5F6B73] leading-relaxed">{m.aiSummary}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-[#5F6B73] uppercase tracking-wider mb-3">Decision Log</h3>
        <Card className="overflow-hidden">
          {[
            { decision: "Proceed with federated PKI architecture for Digital ID", date: "Nov 8", owner: "DM Anand", status: "Approved", project: "Digital ID" },
            { decision: "Extend Healthcare vendor remediation window to 6 weeks", date: "Nov 8", owner: "ADM Kim", status: "Approved", project: "Healthcare" },
            { decision: "Pause Border Security AI deployment pending ethics clearance", date: "Nov 5", owner: "Minister Okonkwo", status: "In Effect", project: "Border Security" },
            { decision: "Approve Tax Modernization Q3 budget reallocation $1.2M", date: "Oct 31", owner: "CFO Brown", status: "Approved", project: "Tax" },
            { decision: "Defer Climate MOU signing to Q1 2025 pending legislation", date: "Oct 28", owner: "DM Laurent", status: "Deferred", project: "Climate" },
          ].map((d, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.04)] hover:bg-[#F8F9FA] transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${d.status === "Approved" || d.status === "In Effect" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#0F1117] leading-snug">{d.decision}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-[#8B1E2D]">{d.project}</span>
                  <span className="text-[10px] text-[#5F6B73]">{d.owner}</span>
                  <span className="text-[10px] text-[#5F6B73]">{d.date}</span>
                </div>
              </div>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  </div>
);

export default MeetingsSection;
