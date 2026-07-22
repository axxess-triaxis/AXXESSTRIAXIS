"use client";

import { Building2, CheckCircle2, ClipboardCheck, FileText, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import {
  ActivityFeed,
  DataStateBadge,
  DemoDataNotice,
  EmptyState,
  MetricCard,
  ModuleHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  TenantScopeBadge,
  WorkflowStepCard,
} from "../../components/enterprise";
import { Card } from "../../components/ui/Card";
import type { AuditLog, Invitation, Organization, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";

type AdminState = {
  organization?: Organization;
  users: User[];
  invitations: Invitation[];
  auditLogs: AuditLog[];
  loading: boolean;
};

const pilotControls = [
  { title: "Tenant profile", description: "Confirm sector, production/demo separation, data residency, and pilot owner.", status: "Ready" },
  { title: "Role matrix", description: "Assign Organization Admin, Executive, Manager, Employee, and Guest boundaries before pilot launch.", status: "Review" },
  { title: "Department map", description: "Align departments to Knowledge Hub permissions and approval escalation paths.", status: "Ready" },
  { title: "Invitation queue", description: "Invite pilot users with tenant-bound roles and expiring invitation links.", status: "Pending" },
  { title: "Audit coverage", description: "Verify auth, documents, AI answers, approvals, tasks, and feedback emit audit entries.", status: "Ready" },
  { title: "Support handoff", description: "Capture pilot sponsor, support owner, escalation SLA, and weekly check-in cadence.", status: "Review" },
];

export function OrganizationAdminSection() {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [state, setState] = useState<AdminState>({ users: [], invitations: [], auditLogs: [], loading: true });

  const loadAdminState = useCallback(async () => {
    if (!scope || !user) {
      // Without a resolved tenant scope there is nothing to load; settle out of the initial
      // `loading: true` state instead of leaving it stuck (Sprint 3 hardening -- a stale `loading`
      // flag here previously had no terminal fallback if this ever ran before session/scope resolved).
      setState((current) => ({ ...current, loading: false }));
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    const [organizations, users, invitations, auditLogs] = await Promise.allSettled([
      applicationServices.organizationsRepository.list(scope, { pageSize: 25 }),
      applicationServices.usersRepository.listByOrganization(scope, { pageSize: 100 }),
      applicationServices.invitationsRepository.listPending(scope, { pageSize: 25 }),
      applicationServices.auditLogsRepository.list(scope, { pageSize: 10 }),
    ]);

    setState({
      organization: organizations.status === "fulfilled" ? organizations.value.find((row) => row.id === user.organizationId) ?? organizations.value[0] : undefined,
      users: users.status === "fulfilled" ? users.value : [],
      invitations: invitations.status === "fulfilled" ? invitations.value : [],
      auditLogs: auditLogs.status === "fulfilled" ? auditLogs.value : [],
      loading: false,
    });
  }, [scope, user]);

  useEffect(() => {
    void loadAdminState();
  }, [loadAdminState]);

  useEffect(() => {
    if (!user) return;
    analytics.trackEvent("admin_surface_viewed", { admin_surface: "organization_admin" }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "organization-admin",
      route: "/admin/organization",
    });
  }, [analytics, user]);

  if (!user) {
    return (
      <PageShell>
        <Card className="flex min-h-[320px] items-center justify-center p-8">
          <EmptyState
            title="Sign in required"
            message="Your session is required to view Organization Admin."
          />
        </Card>
      </PageShell>
    );
  }

  const admins = state.users.filter((row) => row.role === "Super Admin" || row.role === "Organization Admin");
  const departments = new Set(state.users.map((row) => row.department).filter(Boolean));
  const organizationName = state.organization?.name ?? "Current tenant";

  return (
    <PageShell>
      <ModuleHeader
        eyebrow="Pilot readiness"
        title="Organization Admin"
        description="Prepare a real pilot tenant with users, roles, departments, invitations, and audit coverage before institutional rollout."
        badges={[
          <TenantScopeBadge key="tenant" label={organizationName} />,
          <DataStateBadge key="live" state={state.loading ? "Provider-gated" : "Live"} />,
          <StatusBadge key="role" status={user.role} />,
        ]}
        actions={
          <>
            <a href="/admin/invitations" className="rounded-lg border border-[#8B1E2D]/25 bg-white px-3 py-2 text-xs font-semibold text-[#8B1E2D]">Invite team</a>
            <a href="/admin/roles" className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white">Review roles</a>
          </>
        }
      />

      <DemoDataNotice label="Live tenants start clean. Investor Preview uses seeded users, roles, departments, and audit records to demonstrate pilot readiness without mixing with production data." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pilot users" value={state.users.length} detail={`${admins.length} admin-ready`} state={state.loading ? "Provider-gated" : "Live"} icon={Users} />
        <MetricCard label="Departments" value={departments.size || "Set"} detail="permission and escalation units" state={state.loading ? "Provider-gated" : "Live"} icon={Building2} />
        <MetricCard label="Pending invites" value={state.invitations.length} detail="tenant-bound invitations" state={state.loading ? "Provider-gated" : "Live"} icon={UserPlus} />
        <MetricCard label="Audit events" value={state.auditLogs.length} detail="latest tenant events loaded" state={state.loading ? "Provider-gated" : "Live"} icon={ShieldCheck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <SectionCard title="Pilot launch controls" description="The controls a real customer should complete before moving from preview to operational pilot.">
          <div className="grid gap-3 md:grid-cols-2">
            {pilotControls.map((control, index) => (
              <WorkflowStepCard key={control.title} index={index + 1} title={control.title} description={control.description} status={control.status} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent admin evidence" description="Latest audit trail signals for tenant readiness.">
          {state.auditLogs.length ? (
            <ActivityFeed
              items={state.auditLogs.slice(0, 6).map((log) => ({
                title: log.action,
                description: `${log.category ?? "system"} - ${log.resourceType}${log.requestId ? ` - ${log.requestId}` : ""}`,
                time: log.createdAt.slice(0, 10),
                tone: log.category === "security" ? "warning" : "success",
              }))}
            />
          ) : (
            <EmptyState title="No admin audit records yet" message="The first pilot admin action will create a tenant-scoped audit record." />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Pilot team access" description="Role and department review for the first tenant users.">
        <div className="hidden overflow-hidden rounded-lg border border-[rgba(15,17,23,0.08)] md:block">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] gap-3 bg-[#F8F9FA] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">
            <span>User</span>
            <span>Role</span>
            <span>Department</span>
            <span>Status</span>
          </div>
          {state.users.slice(0, 8).map((row) => (
            <div key={row.id} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr] gap-3 border-t border-[rgba(15,17,23,0.06)] px-3 py-2 text-xs">
              <span className="font-semibold text-[#0F1117]">{row.displayName}</span>
              <span className="text-[#5F6B73]">{row.role}</span>
              <span className="text-[#5F6B73]">{row.department ?? "Unassigned"}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 size={12} /> {row.status}</span>
            </div>
          ))}
          {!state.users.length && (
            <div className="px-3 py-6">
              <EmptyState title="No users loaded" message="Invite the pilot sponsor, department owner, and first workflow users to activate the tenant." />
            </div>
          )}
        </div>
        <div className="space-y-3 md:hidden">
          {state.users.slice(0, 8).map((row) => (
            <div key={row.id} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0F1117]">{row.displayName}</p>
                  <p className="mt-1 text-xs text-[#5F6B73]">{row.department ?? "Unassigned department"}</p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded bg-[#F2F3F5] px-2 py-1 font-semibold text-[#5F6B73]">{row.role}</span>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"><CheckCircle2 size={12} /> access scoped</span>
              </div>
            </div>
          ))}
          {!state.users.length && <EmptyState title="No users loaded" message="Invite the pilot sponsor, department owner, and first workflow users to activate the tenant." />}
        </div>
      </SectionCard>

      <SectionCard title="Pilot conversion next actions" description="Use this tenant checklist during sales demos, onboarding calls, and internal launch review.">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { title: "Create pilot project", detail: "Start with one district, department, or client workflow.", icon: ClipboardCheck },
            { title: "Upload evidence pack", detail: "Add policy, SOP, budget, and meeting documents.", icon: FileText },
            { title: "Run first approval", detail: "Prove human-in-the-loop governance and auditability.", icon: ShieldCheck },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-4">
              <item.icon className="text-[#8B1E2D]" size={18} />
              <h3 className="mt-3 text-sm font-semibold text-[#0F1117]">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{item.detail}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}

export default OrganizationAdminSection;
