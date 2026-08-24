"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Send, UserPlus } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { ConfirmDialog } from "../../../components/forms/ConfirmDialog";
import { InlineToast } from "../../../components/forms/InlineToast";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { Avatar } from "../../../components/ui/Avatar";
import type { Invitation, RoleName, User } from "../../../domain";
import { applicationServices } from "../../../providers/serviceProvider";
import { useAnalytics } from "../../../services/analytics";
import { useRegisterMobileBackHandler } from "../MobileBackHandlerContext";
import { useMobileTabletLayout } from "../useMobileTabletLayout";
import { useMobileTenantScope } from "../useMobileTenantScope";

const roleOptions: RoleName[] = ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Guest"];

type Toast = { tone: "success" | "error" | "info"; message: string };

// MN-7 (2026-08-24): native port of desktop SettingsSection.tsx's UserAdministration -- same
// repository/route calls (usersRepository.listByOrganization, invitationsRepository.listPending,
// POST /api/invitations, invitationsRepository.update with its PATCH fallback, usersRepository
// .update for role/status), restructured as a list->detail drill-down instead of desktop's
// persistent two-column layout. RBAC: `canManageUsers` is the same inline
// `Boolean(user && ["Super Admin", "Organization Admin"].includes(user.role))` check desktop
// already duplicates twice with no shared helper -- duplicated a third time here rather than
// extracting a shared rbac.ts helper, keeping this sprint mobile-file-only (see MN-7 plan, decision
// 2). Gates write affordances only; the roster stays visible read-only to every role, matching
// desktop's own behavior.
export function MobileSettingsTeamPanel() {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const scope = useMobileTenantScope();
  const isTablet = useMobileTabletLayout();
  const user = session.user;
  const canManageUsers = Boolean(user && ["Super Admin", "Organization Admin"].includes(user.role));

  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleName>("Employee");
  const [saving, setSaving] = useState(false);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useRegisterMobileBackHandler(() => {
    if (showInvite) {
      setShowInvite(false);
      return true;
    }
    if (!isTablet && selectedUserId) {
      setSelectedUserId(null);
      return true;
    }
    return false;
  });

  const loadUsers = useCallback(async () => {
    if (!scope) return;
    try {
      const [userRows, invitationRows] = await Promise.all([
        applicationServices.usersRepository.listByOrganization(scope),
        applicationServices.invitationsRepository.listPending(scope),
      ]);
      setUsers(userRows);
      setInvitations(invitationRows);
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

  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId) ?? null, [users, selectedUserId]);

  const inviteUser = async () => {
    if (!scope || !inviteEmail.trim()) {
      setToast({ tone: "error", message: "Email is required for invitations." });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; emailDelivery?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Invitation could not be created.");
      }
      analytics.trackEvent("user_invited", { invited_role: inviteRole, email_delivery: payload.emailDelivery }, {
        organization_id: scope.organizationId,
        user_id: scope.userId,
        user_role: scope.role,
        module_name: "settings",
        route: "/settings",
      });
      setInviteEmail("");
      setShowInvite(false);
      setToast({
        tone: payload.emailDelivery === "sent" ? "success" : "info",
        message: payload.emailDelivery === "sent"
          ? "Invitation created and emailed."
          : payload.emailDelivery === "not-configured"
            ? "Invitation created, but email delivery is not configured yet -- share the invite link manually."
            : "Invitation created, but the email could not be sent.",
      });
      await loadUsers();
    } catch (error) {
      setToast({ tone: "error", message: error instanceof Error ? error.message : "Invitation could not be created." });
    } finally {
      setSaving(false);
    }
  };

  const revokeInvitation = async (invitation: Invitation) => {
    if (!scope || !canManageUsers) return;
    setSaving(true);
    setToast(null);
    try {
      await applicationServices.invitationsRepository.update(scope, invitation.id, { status: "revoked" });
      setInvitations((current) => current.filter((row) => row.id !== invitation.id));
      setToast({ tone: "success", message: "Invitation revoked." });
    } catch {
      const response = await fetch(`/api/repositories/invitations?id=${invitation.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revoked" }),
      }).catch(() => undefined);
      if (response?.ok) {
        setInvitations((current) => current.filter((row) => row.id !== invitation.id));
        setToast({ tone: "success", message: "Invitation revoked." });
      } else {
        setToast({ tone: "error", message: "Invitation could not be revoked." });
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
      setToast({ tone: "success", message: "User updated." });
    } catch {
      setToast({ tone: "error", message: "User update failed. Check role permissions." });
    } finally {
      setSaving(false);
      setConfirmUser(null);
    }
  };

  const listPanel = (
    <div className="flex flex-col gap-4 px-4 py-4">
      {toast && <InlineToast tone={toast.tone} message={toast.message} />}

      {canManageUsers && (
        showInvite ? (
          <div className="flex flex-col gap-2 rounded-xl border border-[rgba(15,17,23,0.1)] bg-white p-3">
            <div className="mb-1 flex items-center gap-2">
              <UserPlus size={15} className="text-[#8B1E2D]" />
              <h3 className="text-sm font-semibold text-[#0F1117]">Invite User</h3>
            </div>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              placeholder="Email"
              disabled={saving}
              className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as RoleName)}
              disabled={saving}
              className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
            >
              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => void inviteUser()}
                disabled={saving || !inviteEmail.trim()}
                className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-4 text-xs font-semibold text-white disabled:opacity-60"
              >
                <Send size={13} /> Invite
              </button>
              <button
                onClick={() => setShowInvite(false)}
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-4 text-xs font-semibold text-[#0F1117]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInvite(true)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#8B1E2D] px-4 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Invite user
          </button>
        )
      )}

      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Users ({users.length})</h3>
        {users.length === 0 ? (
          <EmptyState title="No users yet" message="Invited teammates will appear here once they join." />
        ) : (
          <div className="divide-y divide-[rgba(15,17,23,0.06)] rounded-xl border border-[rgba(15,17,23,0.08)] bg-white">
            {users.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedUserId(member.id)}
                className={`flex min-h-[56px] w-full items-center gap-3 px-3.5 py-3 text-left ${selectedUserId === member.id && isTablet ? "bg-[#F8F9FA]" : ""}`}
              >
                <Avatar initials={member.avatarInitials} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#0F1117]">{member.displayName}</span>
                  <span className="block truncate text-[11px] text-[#5F6B73]">{member.email} · {member.role}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {invitations.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">Pending Invitations</h3>
          <div className="divide-y divide-[rgba(15,17,23,0.06)] rounded-xl border border-[rgba(15,17,23,0.08)] bg-white">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between gap-2 px-3.5 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-[#0F1117]">{invitation.email}</span>
                  <span className="block text-[11px] text-[#5F6B73]">{invitation.role} · expires {invitation.expiresAt.slice(0, 10)}</span>
                </span>
                <button
                  onClick={() => void revokeInvitation(invitation)}
                  disabled={!canManageUsers || saving}
                  className="flex-shrink-0 rounded-lg border border-[rgba(15,17,23,0.1)] px-2.5 py-1.5 text-[11px] font-semibold text-[#5F6B73] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const detailPanel = selectedUser ? (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-3">
        <Avatar initials={selectedUser.avatarInitials} size="md" color="bg-[#8B1E2D]" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[#0F1117]">{selectedUser.displayName}</h2>
          <p className="truncate text-[11px] text-[#5F6B73]">{selectedUser.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Status</span><span className="font-semibold text-[#0F1117]">{selectedUser.status}</span></div>
        <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Created</span><span className="font-mono text-[#0F1117]">{selectedUser.createdAt.slice(0, 10)}</span></div>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-[#5F6B73]">Role</span>
        <select
          value={selectedUser.role}
          disabled={!canManageUsers || saving}
          onChange={(e) => void updateUser(selectedUser, { role: e.target.value as RoleName })}
          className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm disabled:bg-[#F2F3F5]"
        >
          {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      </label>
      <button
        onClick={() => setConfirmUser(selectedUser)}
        disabled={!canManageUsers || saving || selectedUser.id === user?.id}
        className="flex min-h-[44px] items-center justify-center rounded-lg border border-[rgba(15,17,23,0.1)] px-4 text-xs font-semibold text-[#5F6B73] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {selectedUser.status === "suspended" ? "Enable" : "Disable"}
      </button>
      {!canManageUsers && <InlineToast tone="info" message="Your role can view users but cannot modify access." />}
      {!isTablet && (
        <button onClick={() => setSelectedUserId(null)} className="flex min-h-[44px] items-center justify-center text-xs font-semibold text-[#8B1E2D]">
          ← Back to Team
        </button>
      )}
    </div>
  ) : (
    <EmptyState title="Select a user" message="Choose a teammate from the list to view details." />
  );

  return (
    <>
      {isTablet ? (
        <div className="flex h-full">
          <div className="w-[42%] flex-shrink-0 overflow-y-auto border-r border-[rgba(0,0,0,0.06)]">{listPanel}</div>
          <div className="flex-1 overflow-y-auto">{detailPanel}</div>
        </div>
      ) : (
        selectedUserId ? detailPanel : listPanel
      )}

      <ConfirmDialog
        open={Boolean(confirmUser)}
        title={confirmUser?.status === "suspended" ? "Re-enable user" : "Disable user"}
        message={confirmUser ? `${confirmUser.displayName} will ${confirmUser.status === "suspended" ? "regain" : "lose"} workspace access.` : ""}
        confirmLabel={confirmUser?.status === "suspended" ? "Re-enable" : "Disable"}
        disabled={saving}
        onCancel={() => setConfirmUser(null)}
        onConfirm={() => confirmUser && void updateUser(confirmUser, { status: confirmUser.status === "suspended" ? "active" : "suspended" })}
      />
    </>
  );
}
