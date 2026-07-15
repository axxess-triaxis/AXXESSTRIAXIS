import Link from "next/link";
import type { Route } from "next";
import { Card } from "../../components/ui/Card";
import { SectionHeader } from "../../components/layout/SectionHeader";

type AdminPanelId =
  | "organization"
  | "workspaces"
  | "departments"
  | "users"
  | "roles"
  | "invitations"
  | "privacy"
  | "compliance"
  | "ai-governance"
  | "model-policy"
  | "prompt-approvals"
  | "plugin-runtime"
  | "execution-runs"
  | "usage-limits"
  | "pilot-command-center"
  | "support-ops"
  | "audit-logs"
  | "backups";

const panelContent: Record<AdminPanelId, { title: string; description: string; actions: string[]; evidence: string[] }> = {
  organization: {
    title: "Organization Administration",
    description: "Manage tenant profile, sector, security tier, data residency, and organization defaults.",
    actions: ["Review organization profile", "Set security tier", "Confirm production/demo separation"],
    evidence: ["organization.updated audit log", "tenant_id boundary", "data residency note"],
  },
  workspaces: {
    title: "Workspace Administration",
    description: "Create, edit, archive, and review workspace membership boundaries.",
    actions: ["Create workspace", "Archive workspace", "Review workspace access"],
    evidence: ["workspace.created audit log", "workspace_members rows", "RLS workspace access policy"],
  },
  departments: {
    title: "Department Administration",
    description: "Maintain department hierarchy and default classification settings.",
    actions: ["Create department", "Edit hierarchy", "Archive inactive department"],
    evidence: ["department.updated audit log", "department classification", "manager assignment"],
  },
  users: {
    title: "User Administration",
    description: "Invite, deactivate, role-assign, and review enterprise user access.",
    actions: ["Invite user", "Deactivate user", "Review active sessions"],
    evidence: ["invitation.created audit log", "role.changed audit log", "session review"],
  },
  roles: {
    title: "Role Administration",
    description: "Review role matrix and delegation boundaries for enterprise RBAC.",
    actions: ["Assign role", "Revoke role", "Review permission matrix"],
    evidence: ["role.changed audit log", "enterprise role mapping", "delegation check"],
  },
  invitations: {
    title: "Invitation Administration",
    description: "Issue and monitor tenant-bound invitations.",
    actions: ["Send invitation", "Revoke invitation", "Review accepted invites"],
    evidence: ["invitation token hash", "invitation audit trail", "expiry policy"],
  },
  privacy: {
    title: "Privacy Controls",
    description: "Review access export, deletion, consent withdrawal, and retention workflows.",
    actions: ["Review privacy request", "Approve export", "Approve erasure plan"],
    evidence: ["privacy_request", "erasure certificate workflow", "retention policy"],
  },
  compliance: {
    title: "Compliance Checklist",
    description: "Map tenant controls to GDPR, EU AI Act, ADGM/DIFC, Saudi PDPL, Singapore AI, and India DPDP readiness.",
    actions: ["Enable jurisdiction policy", "Assign evidence owner", "Review due diligence gaps"],
    evidence: ["compliance_policies", "required evidence list", "audit chain"],
  },
  "ai-governance": {
    title: "AI Governance",
    description: "Configure RAG permissions, AI output review, and high-impact workflow controls.",
    actions: ["Set human review threshold", "Review RAG permissions", "Inspect AI output audit"],
    evidence: ["ai_output_audit", "source citations", "confidence score"],
  },
  "model-policy": {
    title: "Model Policy",
    description: "Review provider-neutral AI routing, fallback chains, spend posture, and human approval rules.",
    actions: ["Preview routing", "Review provider allowlist", "Inspect usage ledger"],
    evidence: ["tenant_model_policies", "ai_usage_ledger", "gateway tags"],
  },
  "prompt-approvals": {
    title: "Prompt Approvals",
    description: "Approve, reject, retire, and review prompt templates before production AI use.",
    actions: ["Approve prompt", "Reject prompt", "Retire prompt"],
    evidence: ["prompt version", "approval timestamp", "review owner"],
  },
  "plugin-runtime": {
    title: "Plugin Runtime",
    description: "Manage tenant-owned connector contracts, OAuth scope posture, sync status, revocation, and write approvals.",
    actions: ["Review plugin scopes", "Approve connector action", "Revoke provider access"],
    evidence: ["plugin_installations", "plugin_action_requests", "plugin_sync_runs"],
  },
  "execution-runs": {
    title: "Execution Runs",
    description: "Prepare governed sandbox jobs for plugin sync, AI tools, document extraction, webhooks, and report exports.",
    actions: ["Create dry-run job", "Review sandbox policy", "Inspect Kubernetes spec"],
    evidence: ["execution_jobs", "execution_runs", "execution_artifacts"],
  },
  "usage-limits": {
    title: "Usage Limits",
    description: "Track tenant plan limits for AI, RAG, document ingestion, plugin actions, sandbox runs, and audit exports.",
    actions: ["Review current usage", "Adjust pilot cap", "Escalate limit warning"],
    evidence: ["tenant_usage_limits", "usage window", "hard-stop policy"],
  },
  "pilot-command-center": {
    title: "Pilot Command Center",
    description: "Operate live pilot readiness, connector execution, governed AI review, sandbox policy, RAG evaluation, and audit evidence from one control surface.",
    actions: ["Review command score", "Approve queued action", "Inspect sandbox attestation"],
    evidence: ["pilot_command_center_snapshots", "connector_execution_queue", "ai_operation_reviews"],
  },
  "support-ops": {
    title: "Support Operations",
    description: "Monitor incidents, readiness controls, and customer-support signals before expanding live pilots.",
    actions: ["Triage incident", "Open readiness review", "Record resolution"],
    evidence: ["support_incidents", "platform readiness score", "incident audit trail"],
  },
  "audit-logs": {
    title: "Audit Logs",
    description: "Review and export tenant security, auth, document, workflow, and AI events.",
    actions: ["Export CSV", "Verify hash chain", "Filter by category"],
    evidence: ["security_audit_events", "integrity hash", "request id"],
  },
  backups: {
    title: "Backup and Restore",
    description: "Track backup status, restore drills, and tenant recovery readiness.",
    actions: ["Run restore checklist", "Verify backup manifest", "Record drill result"],
    evidence: ["backup manifest", "restore verification SQL", "incident report"],
  },
};

const panels = Object.keys(panelContent) as AdminPanelId[];

export function EnterpriseAdminPage({ panel }: { panel: AdminPanelId }) {
  const content = panelContent[panel];

  return (
    <main className="min-h-screen bg-[#F2F3F5] px-4 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <SectionHeader title={content.title} subtitle={content.description} />
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Card className="p-4">
            <div className="space-y-2">
              {panels.map((item) => (
                <Link key={item} href={`/admin/${item}` as Route} className={`block rounded-lg px-3 py-2 text-xs font-semibold ${item === panel ? "bg-[#8B1E2D] text-white" : "bg-[#F8F9FA] text-[#0F1117]"}`}>
                  {panelContent[item].title.replace(" Administration", "")}
                </Link>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-[#0F1117]">Admin actions</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {content.actions.map((action) => (
                  <button key={action} className="rounded-lg border border-[rgba(139,30,45,0.22)] bg-white px-3 py-2 text-left text-xs font-semibold text-[#8B1E2D]">
                    {action}
                  </button>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-[#0F1117]">Evidence required</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {content.evidence.map((item) => (
                  <div key={item} className="rounded-lg bg-[#F8F9FA] p-3 text-xs font-semibold text-[#0F1117]">{item}</div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-[#0F1117]">Beta readiness note</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5F6B73]">
                This admin surface is wired for Sprint 22 and Sprint 23 enterprise readiness. Live mutation paths use server-only routes, tenant-scoped policies, and audit records before autonomous workflow execution is enabled.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
