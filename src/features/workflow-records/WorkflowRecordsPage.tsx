import Link from "next/link";
import type { Route } from "next";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { getServerAuthSession } from "../../auth/serverSession";
import { approvalRequestsRepository, projectUpdatesRepository, stakeholderNotesRepository } from "../../repositories/workflowActionRepositories";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import {
  createFallbackApprovalRequest,
  createFallbackProjectUpdate,
  createFallbackStakeholderNote,
  type ApprovalRequest,
  type ProjectUpdate,
  type StakeholderNote,
} from "../../services/workflows/workflowActionRecords";

export type WorkflowRecordType = "approval-requests" | "stakeholder-notes" | "project-updates";

type WorkflowRecord = ApprovalRequest | StakeholderNote | ProjectUpdate;

const recordTabs: Array<{ type: WorkflowRecordType; label: string; description: string }> = [
  { type: "approval-requests", label: "Approval Requests", description: "Governance packets created from reviewed AI output." },
  { type: "stakeholder-notes", label: "Stakeholder Notes", description: "Relationship evidence and source-linked CRM notes." },
  { type: "project-updates", label: "Project Updates", description: "Project status, risk, budget and scope records." },
];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value?: string) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function demoRecords() {
  const organizationId = "org_north_east_health_mission";
  const userId = "user_customer_success";
  const createdAt = "2026-07-18T00:00:00.000Z";

  return {
    "approval-requests": [
      createFallbackApprovalRequest({
        organizationId,
        requestedByUserId: userId,
        sourceAiReviewId: "ai-review-kamrup-procurement-variance",
        sourceAuditLogId: "audit-kamrup-procurement-variance",
        title: "Approve Kamrup procurement variance release",
        description: "Finance verification is complete. Governance committee approval is required before conditional release to the vendor.",
        priority: "high",
        dueAt: "2026-07-21T12:00:00.000Z",
        metadata: {
          sourceDocument: "Kamrup procurement variance note",
          timelineRoute: "/admin/audit-logs",
        },
      }, createdAt),
      createFallbackApprovalRequest({
        organizationId,
        requestedByUserId: userId,
        sourceAiReviewId: "ai-review-barpeta-oxygen-resilience",
        sourceAuditLogId: "audit-barpeta-oxygen-resilience",
        title: "Move Barpeta oxygen resilience proposal into governance review",
        description: "CSR partner requires a consolidated implementation plan and review packet before this week's committee.",
        priority: "urgent",
        dueAt: "2026-07-19T10:00:00.000Z",
        metadata: {
          sourceDocument: "CSR oxygen resilience proposal follow-up",
          timelineRoute: "/ai-workspace/review-inbox",
        },
      }, createdAt),
    ],
    "stakeholder-notes": [
      createFallbackStakeholderNote({
        organizationId,
        createdByUserId: userId,
        sourceAiReviewId: "ai-review-dibrugarh-referral-sla",
        sourceAuditLogId: "audit-dibrugarh-referral-sla",
        title: "Dibrugarh referral SLA escalation sponsor note",
        body: "District Programme Manager and Hospital Superintendent agreed to review ambulance turnaround variance before Friday's mission call.",
        sentiment: "risk",
        visibility: "organization",
        tags: ["dibrugarh", "referral-sla", "ambulance"],
      }, createdAt),
      createFallbackStakeholderNote({
        organizationId,
        createdByUserId: userId,
        sourceAiReviewId: "ai-review-csr-oxygen-brief",
        sourceAuditLogId: "audit-csr-oxygen-brief",
        title: "CSR oxygen resilience partner follow-up",
        body: "CSR Lead requested district facility assessment evidence and biomedical engineer confirmation before proposal sign-off.",
        sentiment: "positive",
        visibility: "organization",
        tags: ["csr", "oxygen", "barpeta"],
      }, createdAt),
    ],
    "project-updates": [
      createFallbackProjectUpdate({
        organizationId,
        createdByUserId: userId,
        projectId: "project-dibrugarh-referral-command",
        sourceAiReviewId: "ai-review-dibrugarh-referral-sla",
        sourceAuditLogId: "audit-dibrugarh-referral-sla",
        title: "Referral command workflow moved to SLA monitoring",
        body: "Ambulance turnaround review and biomedical oxygen dependency risk were attached to the district implementation timeline.",
        updateType: "risk",
        status: "recorded",
        progressDelta: 4,
        riskLevel: "high",
        tags: ["referral-command", "sla", "dibrugarh"],
      }, createdAt),
      createFallbackProjectUpdate({
        organizationId,
        createdByUserId: userId,
        projectId: "project-kamrup-procurement",
        sourceAiReviewId: "ai-review-kamrup-procurement-variance",
        sourceAuditLogId: "audit-kamrup-procurement-variance",
        title: "Procurement variance moved to finance verification",
        body: "Vendor clarification note and delivery receipts are now required before conditional release approval.",
        updateType: "budget",
        status: "recorded",
        progressDelta: 2,
        riskLevel: "medium",
        tags: ["procurement", "finance", "kamrup"],
      }, createdAt),
    ],
  } satisfies Record<WorkflowRecordType, WorkflowRecord[]>;
}

function recordSummary(record: WorkflowRecord) {
  if ("description" in record) return record.description ?? "Approval request awaits reviewer action.";
  if ("body" in record) return record.body;
  return "Workflow record is ready for tenant review.";
}

function recordStatus(record: WorkflowRecord) {
  if ("priority" in record) return record.priority;
  if ("sentiment" in record) return record.sentiment;
  if ("updateType" in record) return record.updateType;
  return "recorded";
}

function recordDate(record: WorkflowRecord) {
  if ("dueAt" in record) return record.dueAt ?? record.createdAt;
  return record.createdAt;
}

async function loadRecords(type: WorkflowRecordType) {
  const session = await getServerAuthSession(true);
  const useDemoFallback = !session || process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true";
  if (useDemoFallback) return demoRecords()[type];

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  if (type === "approval-requests") return approvalRequestsRepository.list(scope, { pageSize: 50 });
  if (type === "stakeholder-notes") return stakeholderNotesRepository.list(scope, { pageSize: 50 });
  return projectUpdatesRepository.list(scope, { pageSize: 50 });
}

export async function WorkflowRecordsPage({ recordType = "approval-requests", recordId }: { recordType?: WorkflowRecordType; recordId?: string }) {
  const activeTab = recordTabs.some((tab) => tab.type === recordType) ? recordType : "approval-requests";
  const records = await loadRecords(activeTab);
  const selected = recordId ? records.find((record) => record.id === recordId) : records[0];
  const active = recordTabs.find((tab) => tab.type === activeTab) ?? recordTabs[0];

  return (
    <main className="min-h-screen bg-[#F2F3F5] px-4 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <SectionHeader title="Workflow Records" subtitle="Approval requests, stakeholder notes and project updates created from governed AI review and operator decisions." />
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Card className="p-4">
            <div className="space-y-2">
              {recordTabs.map((tab) => (
                <Link
                  key={tab.type}
                  href={`/workflow-records/${tab.type}` as Route}
                  className={`block rounded-lg px-3 py-2 text-xs font-semibold ${tab.type === activeTab ? "bg-[#8B1E2D] text-white" : "bg-[#F8F9FA] text-[#0F1117]"}`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#0F1117]">{active.label}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#5F6B73]">{active.description}</p>
                </div>
                <span className="rounded-full bg-[#8B1E2D]/10 px-2.5 py-1 text-[11px] font-semibold text-[#8B1E2D]">{records.length} record(s)</span>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="p-4">
                <h3 className="text-xs font-semibold uppercase text-[#5F6B73]">Record list</h3>
                <div className="mt-3 space-y-2">
                  {records.map((record) => (
                    <Link
                      key={record.id}
                      href={`/workflow-records/${activeTab}/${record.id}` as Route}
                      className={`block rounded-lg border p-3 ${selected?.id === record.id ? "border-[#8B1E2D] bg-[#8B1E2D]/5" : "border-[rgba(15,17,23,0.08)] bg-[#F8F9FA] hover:bg-[#F2F3F5]"}`}
                    >
                      <span className="block text-xs font-semibold text-[#0F1117]">{record.title}</span>
                      <span className="mt-1 block text-[11px] capitalize text-[#5F6B73]">{label(recordStatus(record))} - {formatDate(recordDate(record))}</span>
                    </Link>
                  ))}
                  {records.length === 0 ? (
                    <div className="rounded-lg bg-[#F8F9FA] p-4 text-sm leading-relaxed text-[#5F6B73]">
                      No workflow records exist yet. Approve AI output from the review inbox to create the first tenant-backed action record.
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card className="p-5">
                {selected ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#0F1117] px-2.5 py-1 text-[11px] font-semibold capitalize text-white">{label(recordStatus(selected))}</span>
                      <span className="rounded-full border border-[rgba(15,17,23,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[#5F6B73]">{formatDate(recordDate(selected))}</span>
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-[#0F1117]">{selected.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[#5F6B73]">{recordSummary(selected)}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-[#F8F9FA] p-3">
                        <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Source AI review</div>
                        <div className="mt-1 break-all font-mono text-xs text-[#0F1117]">{selected.sourceAiReviewId ?? "Not linked"}</div>
                      </div>
                      <div className="rounded-lg bg-[#F8F9FA] p-3">
                        <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Audit evidence</div>
                        <div className="mt-1 break-all font-mono text-xs text-[#0F1117]">{selected.sourceAuditLogId ?? "Not linked"}</div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">Metadata</div>
                      <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-[#F8F9FA] p-3 text-[11px] leading-relaxed text-[#0F1117]">{JSON.stringify(selected.metadata, null, 2)}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#F8F9FA] p-4 text-sm leading-relaxed text-[#5F6B73]">
                    Select a record to inspect source, audit evidence and workflow metadata.
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function isWorkflowRecordType(value: string): value is WorkflowRecordType {
  return value === "approval-requests" || value === "stakeholder-notes" || value === "project-updates";
}
