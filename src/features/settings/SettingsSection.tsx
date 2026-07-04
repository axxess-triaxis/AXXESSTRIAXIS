import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { ConfirmDialog } from "../../components/forms/ConfirmDialog";
import { SelectField, TextField } from "../../components/forms/FormField";
import { InlineToast } from "../../components/forms/InlineToast";
import { EmptyState } from "../../components/feedback/EmptyState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import type { Invitation, RoleName, User } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";
import { Check, CheckCircle2, Send, Settings, UserPlus, X, XCircle } from "lucide-react";

export const SettingsSection = () => {
  const [tab, setTab] = useState("security");
  const tabs = ["Profile", "Organization", "Security", "Users", "Permissions", "AI Configuration"];

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Organization configuration and security" />
      <div className="flex gap-1 mb-6 border-b border-[rgba(0,0,0,0.08)]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t.toLowerCase())}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors -mb-px ${tab === t.toLowerCase() ? "border-[#8B1E2D] text-[#8B1E2D]" : "border-transparent text-[#5F6B73] hover:text-[#0F1117]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Security Status</h3>
            <div className="space-y-3">
              {[
                { label: "Multi-Factor Authentication", status: true, detail: "TOTP + Hardware Key" },
                { label: "Single Sign-On (SAML 2.0)", status: true, detail: "Azure AD configured" },
                { label: "Audit Logging", status: true, detail: "All actions · 7-year retention" },
                { label: "End-to-End Encryption", status: true, detail: "AES-256 at rest + TLS 1.3 in transit" },
                { label: "IP Allowlisting", status: false, detail: "Not configured" },
                { label: "Session Timeout", status: true, detail: "8 hours inactivity" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                  {item.status ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" /> : <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[#0F1117]">{item.label}</div>
                    <div className="text-[11px] text-[#5F6B73]">{item.detail}</div>
                  </div>
                  <button className="text-[11px] text-[#8B1E2D] hover:underline">Configure</button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Role-Based Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    <th className="text-left text-[11px] font-semibold text-[#5F6B73] pb-2">Role</th>
                    {["View", "Edit", "Approve", "Admin"].map((h) => <th key={h} className="text-center text-[11px] font-semibold text-[#5F6B73] pb-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: "Executive", perms: [true, false, true, false] },
                    { role: "Program Manager", perms: [true, true, true, false] },
                    { role: "Analyst", perms: [true, true, false, false] },
                    { role: "Stakeholder (External)", perms: [true, false, false, false] },
                    { role: "System Administrator", perms: [true, true, true, true] },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                      <td className="py-2.5 font-medium text-[#0F1117]">{row.role}</td>
                      {row.perms.map((p, j) => (
                        <td key={j} className="py-2.5 text-center">
                          {p ? <Check size={13} className="text-emerald-500 mx-auto" /> : <X size={13} className="text-gray-300 mx-auto" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "users" && <UserAdministration />}

      {tab === "ai configuration" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI Engine Configuration</h3>
            <div className="space-y-4">
              {[
                { label: "Human-in-the-Loop for all write actions", enabled: true },
                { label: "Multilingual response support", enabled: true },
                { label: "Document auto-summarization on upload", enabled: true },
                { label: "Proactive risk alerting", enabled: true },
                { label: "Predictive milestone forecasting (Beta)", enabled: false },
              ].map((setting, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[#0F1117]">{setting.label}</span>
                  <button className={`relative w-10 h-5.5 rounded-full transition-colors ${setting.enabled ? "bg-[#8B1E2D]" : "bg-[#D1D5DB]"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${setting.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI Usage Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Queries This Month", value: "2,847" },
                { label: "Documents Analyzed", value: "1,231" },
                { label: "Summaries Generated", value: "643" },
                { label: "Actions Approved", value: "187" },
              ].map((s, i) => (
                <div key={i} className="bg-[#F8F9FA] rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#8B1E2D] font-mono">{s.value}</div>
                  <div className="text-[11px] text-[#5F6B73] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {(tab === "profile" || tab === "organization" || tab === "permissions") && (
        <Card className="p-8 flex items-center justify-center">
          <EmptyState
            icon={<Settings size={32} />}
            message="Select Security or AI Configuration to view settings"
          />
        </Card>
      )}
    </div>
  );
};

const roleOptions: RoleName[] = ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Guest"];

function UserAdministration() {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleName>("Employee");
  const [saving, setSaving] = useState(false);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  const canManageUsers = Boolean(user && ["Super Admin", "Organization Admin"].includes(user.role));

  const loadUsers = useCallback(async () => {
    if (!scope) return;
    try {
      const [userRows, invitationRows] = await Promise.all([
        applicationServices.usersRepository.listByOrganization(scope),
        applicationServices.invitationsRepository.listPending(scope),
      ]);
      setUsers(userRows);
      setInvitations(invitationRows);
      setSelectedUser((current) => current ? userRows.find((row) => row.id === current.id) ?? current : userRows[0] ?? null);
    } catch {
      setToast({ tone: "error", message: "Unable to load user administration data." });
    }
  }, [scope]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!user) return;
    analytics.trackEvent("user_admin_viewed", { panel: "settings_users" }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: "settings",
      route: "/settings",
    });
  }, [analytics, user]);

  const inviteUser = async () => {
    if (!scope || !inviteEmail.trim()) {
      if (user) {
        analytics.trackEvent("form_validation_failed", { form_name: "invite_user", field: "email" }, {
          organization_id: user.organizationId,
          user_id: user.id,
          user_role: user.role,
          module_name: "settings",
          route: "/settings",
        });
      }
      setToast({ tone: "error", message: "Email is required for invitations." });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await applicationServices.invitationsRepository.create(scope, {
        organizationId: scope.organizationId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invitedByUserId: scope.userId,
        tokenHash: "client-placeholder",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      });
      analytics.trackEvent("user_invited", { invited_role: inviteRole }, {
        organization_id: scope.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        module_name: "settings",
        route: "/settings",
      });
      setInviteEmail("");
      setToast({ tone: "success", message: "Invitation created." });
      await loadUsers();
    } catch {
      const response = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      }).catch(() => undefined);
      if (response?.ok) {
        analytics.trackEvent("user_invited", { invited_role: inviteRole, invite_path: "api" }, {
          organization_id: scope.organizationId,
          user_id: scope.userId,
          user_role: scope.role,
          module_name: "settings",
          route: "/settings",
        });
        setInviteEmail("");
        setToast({ tone: "success", message: "Invitation created." });
        await loadUsers();
      } else {
        setToast({ tone: "error", message: "Invitation could not be created." });
      }
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (target: User, input: Partial<User>) => {
    if (!scope || !canManageUsers) return;
    setSaving(true);
    setToast(null);
    try {
      const updated = await applicationServices.usersRepository.update(scope, target.id, input);
      if (input.role && input.role !== target.role) {
        analytics.trackEvent("role_changed", {
          target_user_id: target.id,
          previous_role: target.role,
          next_role: input.role,
        }, {
          organization_id: scope.organizationId,
          user_id: scope.userId,
          user_role: scope.role,
          module_name: "settings",
          route: "/settings",
        });
      }
      setUsers((current) => current.map((row) => row.id === updated.id ? updated : row));
      setSelectedUser(updated);
      setToast({ tone: "success", message: "User updated." });
    } catch {
      setToast({ tone: "error", message: "User update failed. Check role permissions." });
    } finally {
      setSaving(false);
      setConfirmUser(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {toast && <InlineToast tone={toast.tone} message={toast.message} />}
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus size={15} className="text-[#8B1E2D]" />
            <h3 className="text-sm font-semibold text-[#0F1117]">Invite User</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
            <TextField label="Email" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} disabled={!canManageUsers || saving} />
            <SelectField label="Role" value={inviteRole} options={roleOptions.map((role) => ({ value: role, label: role }))} onChange={(event) => setInviteRole(event.target.value as RoleName)} disabled={!canManageUsers || saving} />
            <button
              onClick={() => void inviteUser()}
              disabled={!canManageUsers || saving}
              className="mt-5 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-4 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={13} /> Invite
            </button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73]">
            Users
          </div>
          {users.map((member) => (
            <div key={member.id} className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 hover:bg-[#F8F9FA]">
              <Avatar initials={member.avatarInitials} />
              <button onClick={() => setSelectedUser(member)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-xs font-semibold text-[#0F1117]">{member.displayName}</div>
                <div className="truncate text-[11px] text-[#5F6B73]">{member.email}</div>
              </button>
              <select
                value={member.role}
                disabled={!canManageUsers || saving}
                onChange={(event) => void updateUser(member, { role: event.target.value as RoleName })}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[11px] text-[#0F1117] disabled:bg-[#F2F3F5]"
              >
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <button
                onClick={() => setConfirmUser(member)}
                disabled={!canManageUsers || saving || member.id === user?.id}
                className="rounded-lg border border-[rgba(0,0,0,0.1)] px-2 py-1 text-[11px] font-semibold text-[#5F6B73] hover:bg-[#F2F3F5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {member.status === "suspended" ? "Enable" : "Disable"}
              </button>
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F6B73]">
            Pending Invitations
          </div>
          {invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between border-b border-[rgba(0,0,0,0.04)] px-4 py-3">
              <div>
                <div className="text-xs font-semibold text-[#0F1117]">{invitation.email}</div>
                <div className="text-[11px] text-[#5F6B73]">{invitation.role} · expires {invitation.expiresAt.slice(0, 10)}</div>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{invitation.status}</span>
            </div>
          ))}
          {invitations.length === 0 && <div className="px-4 py-6 text-center text-xs text-[#5F6B73]">No pending invitations</div>}
        </Card>
      </div>

      <Card className="p-4">
        {selectedUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar initials={selectedUser.avatarInitials} color="bg-[#8B1E2D]" />
              <div>
                <h3 className="text-sm font-semibold text-[#0F1117]">{selectedUser.displayName}</h3>
                <p className="text-[11px] text-[#5F6B73]">{selectedUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Role</span><span className="font-semibold text-[#0F1117]">{selectedUser.role}</span></div>
              <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Status</span><span className="font-semibold text-[#0F1117]">{selectedUser.status}</span></div>
              <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Created</span><span className="font-mono text-[#0F1117]">{selectedUser.createdAt.slice(0, 10)}</span></div>
              <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Updated</span><span className="font-mono text-[#0F1117]">{selectedUser.updatedAt.slice(0, 10)}</span></div>
            </div>
            {!canManageUsers && <InlineToast tone="info" message="Your role can view users but cannot modify access." />}
          </div>
        ) : (
          <EmptyState icon={<Settings size={32} />} message="Select a user to view profile details" />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(confirmUser)}
        title={confirmUser?.status === "suspended" ? "Re-enable user" : "Disable user"}
        message={confirmUser ? `${confirmUser.displayName} will ${confirmUser.status === "suspended" ? "regain" : "lose"} workspace access.` : ""}
        confirmLabel={confirmUser?.status === "suspended" ? "Re-enable" : "Disable"}
        disabled={saving}
        onCancel={() => setConfirmUser(null)}
        onConfirm={() => confirmUser && void updateUser(confirmUser, { status: confirmUser.status === "suspended" ? "active" : "suspended" })}
      />
    </div>
  );
}

export default SettingsSection;
