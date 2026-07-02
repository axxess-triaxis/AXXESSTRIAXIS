import { useState } from "react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { applicationServices } from "../../providers/serviceProvider";
import { Check, CheckCircle2, ShieldCheck, X, XCircle } from "lucide-react";

const approvals = applicationServices.institutionalRepository.getApprovals();

export const ApprovalsSection = () => {
  const [actioned, setActioned] = useState<Record<number, "approved" | "rejected">>({});

  return (
    <div>
      <SectionHeader
        title="Approvals & Governance"
        subtitle={`${approvals.filter((a) => a.status === "Pending").length} pending approvals · 3 overdue SLA`}
      />
      <div className="space-y-4">
        {approvals.map((ap) => (
          <Card key={ap.id} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ap.urgency === "urgent" ? "bg-red-50" : ap.urgency === "high" ? "bg-amber-50" : "bg-blue-50"}`}>
                  <ShieldCheck size={15} className={ap.urgency === "urgent" ? "text-red-600" : ap.urgency === "high" ? "text-amber-600" : "text-blue-600"} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#0F1117]">{ap.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-[#5F6B73]">{ap.type}</span>
                    <span className="text-[11px] text-[#5F6B73]">·</span>
                    <span className="text-[11px] text-[#5F6B73]">Requested by {ap.requester}</span>
                    {ap.amount && <><span className="text-[11px] text-[#5F6B73]">·</span><span className="text-[11px] font-mono font-semibold text-[#0F1117]">{ap.amount}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <RiskBadge level={ap.urgency} />
                <span className="text-[11px] font-mono text-[#5F6B73]">Due {ap.dueDate.slice(5)}</span>
              </div>
            </div>
            <p className="text-xs text-[#5F6B73] leading-relaxed mb-4 bg-[#F8F9FA] rounded-lg px-3 py-2.5">{ap.description}</p>
            {actioned[ap.id] ? (
              <div className={`flex items-center gap-2 text-sm font-semibold ${actioned[ap.id] === "approved" ? "text-emerald-600" : "text-red-600"}`}>
                {actioned[ap.id] === "approved" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {actioned[ap.id] === "approved" ? "Approved — Audit log updated" : "Rejected — Requester notified"}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setActioned((prev) => ({ ...prev, [ap.id]: "approved" }))} className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                  <Check size={11} /> Approve
                </button>
                <button onClick={() => setActioned((prev) => ({ ...prev, [ap.id]: "rejected" }))} className="text-xs bg-white border border-[rgba(0,0,0,0.12)] text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center gap-1.5">
                  <X size={11} /> Reject
                </button>
                <button className="text-xs text-[#5F6B73] border border-[rgba(0,0,0,0.1)] px-3 py-2 rounded-lg hover:bg-[#F2F3F5] transition-colors">
                  Request Info
                </button>
                <button className="ml-auto text-xs text-[#5F6B73] hover:text-[#0F1117]">
                  View Full Request
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ApprovalsSection;
