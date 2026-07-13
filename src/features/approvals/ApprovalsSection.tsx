import { useState } from "react";
import {
  ApprovalCard,
  DataStateBadge,
  DemoDataNotice,
  HumanReviewBadge,
  ModuleHeader,
  PageShell,
  SectionCard,
  TenantScopeBadge,
} from "../../components/enterprise";
import { Card } from "../../components/ui/Card";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { demoApprovalQueue } from "../../lib/demo/demoApprovals";
import { applicationServices } from "../../providers/serviceProvider";
import { Check, CheckCircle2, ShieldCheck, X, XCircle } from "lucide-react";

const approvals = applicationServices.institutionalRepository.getApprovals();

export const ApprovalsSection = () => {
  const [actioned, setActioned] = useState<Record<string, "approved" | "rejected" | "clarification">>({});

  return (
    <PageShell>
      <ModuleHeader
        title="Approvals & Governance"
        eyebrow="80 percent machine, 20 percent human, 100 percent trust"
        description={`${approvals.filter((approval) => approval.status === "Pending").length} pending approvals, 3 overdue SLA items, and human review required for high-trust institutional actions.`}
        badges={[
          <TenantScopeBadge key="tenant" />,
          <DataStateBadge key="demo" state="Demo" />,
          <HumanReviewBadge key="review" required />,
        ]}
      />
      <DemoDataNotice label="Approval decisions update local demo state, show AI recommendation context, and preserve audit-ready decision language." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {demoApprovalQueue.map((approval) => (
          <ApprovalCard key={approval.title} title={approval.title} requestor={approval.requestor} risk={approval.risk}>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 text-xs text-[#5F6B73]">
                <span><strong className="text-[#0F1117]">Project:</strong> {approval.linkedProject}</span>
                <span><strong className="text-[#0F1117]">Document:</strong> {approval.linkedDocument}</span>
                <span><strong className="text-[#0F1117]">Stakeholder:</strong> {approval.stakeholder}</span>
              </div>
              <p className="rounded-lg bg-[#F8F9FA] p-3 text-xs leading-relaxed text-[#5F6B73]"><strong className="text-[#0F1117]">AI recommendation:</strong> {approval.recommendation}</p>
              <p className="text-xs leading-relaxed text-[#5F6B73]">{approval.policyNote}</p>
              {actioned[approval.title] ? (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {actioned[approval.title] === "approved" ? "Approved - audit log written" : actioned[approval.title] === "rejected" ? "Rejected - requester notified" : "Clarification requested - SLA clock paused"}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActioned((prev) => ({ ...prev, [approval.title]: "approved" }))} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Approve</button>
                  <button onClick={() => setActioned((prev) => ({ ...prev, [approval.title]: "rejected" }))} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Reject</button>
                  <button onClick={() => setActioned((prev) => ({ ...prev, [approval.title]: "clarification" }))} className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Clarify</button>
                </div>
              )}
            </div>
          </ApprovalCard>
        ))}
      </div>
      <SectionCard title="Operational approval queue" description="Repository-backed approval rows remain available below the guided governance examples.">
      <div className="space-y-4">
        {approvals.map((approval) => (
          <Card key={approval.id} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${approval.urgency === "urgent" ? "bg-red-50" : approval.urgency === "high" ? "bg-amber-50" : "bg-blue-50"}`}>
                  <ShieldCheck size={15} className={approval.urgency === "urgent" ? "text-red-600" : approval.urgency === "high" ? "text-amber-600" : "text-blue-600"} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#0F1117]">{approval.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-[#5F6B73]">{approval.type}</span>
                    <span className="text-[11px] text-[#5F6B73]">-</span>
                    <span className="text-[11px] text-[#5F6B73]">Requested by {approval.requester}</span>
                    {approval.amount && (
                      <>
                        <span className="text-[11px] text-[#5F6B73]">-</span>
                        <span className="text-[11px] font-mono font-semibold text-[#0F1117]">{approval.amount}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <RiskBadge level={approval.urgency} />
                <span className="text-[11px] font-mono text-[#5F6B73]">Due {approval.dueDate.slice(5)}</span>
              </div>
            </div>
            <p className="text-xs text-[#5F6B73] leading-relaxed mb-4 bg-[#F8F9FA] rounded-lg px-3 py-2.5">{approval.description}</p>
            {actioned[String(approval.id)] ? (
              <div className={`flex items-center gap-2 text-sm font-semibold ${actioned[String(approval.id)] === "approved" ? "text-emerald-600" : "text-red-600"}`}>
                {actioned[String(approval.id)] === "approved" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {actioned[String(approval.id)] === "approved" ? "Approved - audit log updated" : "Rejected - requester notified"}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setActioned((prev) => ({ ...prev, [approval.id]: "approved" }))} className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                  <Check size={11} /> Approve
                </button>
                <button onClick={() => setActioned((prev) => ({ ...prev, [approval.id]: "rejected" }))} className="text-xs bg-white border border-[rgba(0,0,0,0.12)] text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center gap-1.5">
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
      </SectionCard>
    </PageShell>
  );
};

export default ApprovalsSection;
