import { SectionHeader } from "../../components/layout/SectionHeader";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { applicationServices } from "../../providers/serviceProvider";
import { Plus } from "lucide-react";

const stakeholders = applicationServices.institutionalRepository.getStakeholders();

export const StakeholdersSection = () => (
  <div>
    <SectionHeader
      title="Stakeholders & CRM"
      subtitle="Relationship intelligence across 6 organizations"
      action={
        <button className="text-xs bg-[#8B1E2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]">
          <Plus size={12} /> Add Contact
        </button>
      }
    />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA]">
                {["Contact", "Organization", "Role", "Influence", "Engagement", "Last Contact"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((s) => (
                <tr key={s.id} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#F8F9FA] transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={s.avatar} />
                      <span className="font-semibold text-[#0F1117] text-xs">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5F6B73]">{s.org}</td>
                  <td className="px-4 py-3 text-xs text-[#0F1117]">{s.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden">
                        <div className="h-full bg-[#C9A227] rounded-full" style={{ width: `${s.influence}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-[#5F6B73]">{s.influence}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${s.engagement === "High" ? "bg-emerald-50 text-emerald-700" : s.engagement === "Medium" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                      {s.engagement}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#5F6B73]">{s.lastContact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Relationship Network</h3>
          <svg viewBox="0 0 200 160" className="w-full">
            <circle cx="100" cy="80" r="18" fill="#8B1E2D" opacity="0.9" />
            <text x="100" y="84" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AXXESS</text>
            {stakeholders.map((s, i) => {
              const angle = (i / stakeholders.length) * 2 * Math.PI - Math.PI / 2;
              const r = 60;
              const x = 100 + r * Math.cos(angle);
              const y = 80 + r * Math.sin(angle);
              const strokeW = s.influence > 85 ? 2 : 1;
              return (
                <g key={s.id}>
                  <line x1="100" y1="80" x2={x} y2={y} stroke="#C9A227" strokeWidth={strokeW} strokeOpacity="0.4" />
                  <circle cx={x} cy={y} r="12" fill="#2C4A7C" opacity="0.8" />
                  <text x={x} y={y + 3} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">{s.avatar}</text>
                </g>
              );
            })}
          </svg>
        </Card>
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Engagement Timeline</h3>
          <div className="space-y-2.5">
            {[
              { contact: "Dr. Purnima Bora", type: "Meeting", date: "Jul 4" },
              { contact: "Secretary H. K. Deka", type: "Email", date: "Jul 3" },
              { contact: "Director Lalthansangi", type: "Call", date: "Jun 29" },
              { contact: "Prof. R. K. Singh", type: "Meeting", date: "Jun 24" },
            ].map((ev, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1 h-1 rounded-full bg-[#8B1E2D] flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-[#0F1117]">{ev.contact}</span>
                  <span className="text-[11px] text-[#5F6B73] ml-2">{ev.type}</span>
                </div>
                <span className="text-[11px] font-mono text-[#5F6B73]">{ev.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  </div>
);

export default StakeholdersSection;
