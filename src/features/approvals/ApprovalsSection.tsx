import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
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
import { EmptyState } from "../../components/feedback/EmptyState";
import { WorkflowTimelinePanel } from "../../components/enterprise/WorkflowTimelinePanel";
import { Card } from "../../components/ui/Card";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { RiskBadge } from "../../components/ui/RiskBadge";
import { demoApprovalQueue } from "../../lib/demo/demoApprovals";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useWorkflowTimeline } from "../../hooks/useWorkflowTimeline";
import type { ApprovalRequest } from "../../services/workflows/workflowActionRecords";
import { Check, CheckCircle2, Download, ShieldCheck, X, XCircle } from "lucide-react";

// No live approvals repository exists yet -- these Approve/Reject actions only update local
// component state and getApprovals() resolves to real (empty) data outside demo mode. Illustrative
// content below is gated behind isDemoModeEnabled(). See DEMO_DATA_LEAKAGE_AUDIT.md.
const approvals = applicationServices.institutionalRepository.getApprovals();

export const ApprovalsSection = () => {
  const { session } = useAuth();
  const scope = session.user ? tenantScopeFromUser(session.user) : undefined;
  const [actioned, setActioned] = useState<Record<string, "approved" | "rejected" | "clarification">>({});
  const approvalTimeline = useWorkflowTimeline(scope, { limit: 5, resourceType: "approval" });
  const demoMode = isDemoModeEnabled();
  const [liveApprovals, setLiveApprovals] = useState<ApprovalRequest[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(!demoMode);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // RAG Remediation Sprint 3 (A-60 precondition): real approval_requests rows already exist
  // (created via "Create approval request" from an approved AI Review Inbox item), but this page
  // never fetched them for a live tenant -- it showed only the honest not-wired-yet empty state
  // unconditionally. This makes the real queue visible, which is also what Export Report exports.
  useEffect(() => {
    if (demoMode || !scope) {
      setLoadingApprovals(false);
      return;
    }
    let isMounted = true;
    setLoadingApprovals(true);
    fetch("/api/approvals", { credentials: "include" })
      .then((response) => response.ok ? response.json() : { approvals: [] })
      .then((data: { approvals?: ApprovalRequest[] }) => { if (isMounted) setLiveApprovals(data.approvals ?? []); })
      .catch(() => { if (isMounted) setLiveApprovals([]); })
      .finally(() => { if (isMounted) setLoadingApprovals(false); });
    return () => { isMounted = false; };
  }, [demoMode, scope]);

  function exportApprovalsReport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      organizationId: scope?.organizationId ?? null,
      approvalCount: liveApprovals.length,
      approvals: liveApprovals.map((approval) => ({
        id: approval.id,
        title: approval.title,
        status: approval.status,
        priority: approval.priority,
        dueAt: approval.dueAt,
        decidedAt: approval.decidedAt,
        sourceAiReviewId: approval.sourceAiReviewId,
        createdAt: approval.createdAt,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `axxess-approvals-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMessage(`Exported ${liveApprovals.length} approval record${liveApprovals.length === 1 ? "" : "s"}.`);
    void fetch("/api/approvals/export", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalCount: liveApprovals.length }),
    }).catch(() => undefined);
  }

  return (
    <PageShell>
      <ModuleHeader
        title="Approvals & Governance"
        eyebrow="80 percent machine, 20 percent human, 100 percent trust"
        description={demoMode
          ? `${approvals.filter((approval) => approval.status === "Pending").length} pending approvals, 3 overdue SLA items, and human review required for high-trust institutional actions.`
          : "Human review required for high-trust institutional actions."}
        badges={[
          <TenantScopeBadge key="tenant" />,
          <DataStateBadge key="demo" state={demoMode ? "Demo" : "Live"} />,
          <HumanReviewBadge key="review" required />,
        ]}
        actions={!demoMode ? (
          <button
            onClick={exportApprovalsReport}
            disabled={loadingApprovals || liveApprovals.length === 0}
            className="text-xs bg-[#8B1E2D] text-white px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={12} /> Export Report
          </button>
        ) : undefined}
      />
      {!demoMode && exportMessage && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{exportMessage}</p>
      )}
      {!demoMode && !loadingApprovals && liveApprovals.length === 0 && (
        <Card className="p-8">
          <EmptyState message="No approval requests yet. Approving an AI Review Inbox item with 'Create approval request' will add one here." />
        </Card>
      )}
      {!demoMode && liveApprovals.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA]">
                {["Title", "Status", "Priority", "Due", "Created"].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#5F6B73] uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liveApprovals.map((approval) => (
                <tr key={approval.id} className="border-b border-[rgba(0,0,0,0.04)]">
                  <td className="px-4 py-3 text-xs font-semibold text-[#0F1117]">{approval.title}</td>
                  <td className="px-4 py-3 text-xs capitalize text-[#5F6B73]">{approval.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs capitalize text-[#5F6B73]">{approval.priority}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#5F6B73]">{approval.dueAt ? new Date(approval.dueAt).toLocaleDateString() : "--"}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#5F6B73]">{new Date(approval.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {demoMode && <DemoDataNotice label="Approval decisions update local demo state, show AI recommendation context, and preserve audit-ready decision language." />}
      <WorkflowTimelinePanel
        title="Approval timeline"
        description="Human decisions, SLA-sensitive approval actions, and audit records across governed workflow execution."
        events={approvalTimeline.timeline}
        compact
      />
      {demoMode && (
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
      )}
      {demoMode && (
      <SectionCard title="Operational approval queue" description="Repository-backed approval rows remain available below the guided governance examples.">
      <div className="space-y-4">
        {approvals.length === 0 && <EmptyState message="No approvals yet." />}
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
      )}
    </PageShell>
  );
};

export default ApprovalsSection;
