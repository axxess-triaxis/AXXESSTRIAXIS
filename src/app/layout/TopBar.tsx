import { AlertTriangle, Bell, CheckCircle2, FolderKanban, LogOut, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "../../components/ui/Avatar";
import type { Notification } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import type { UserContext } from "../../security/rbac";
import { useAnalytics } from "../../services/analytics";

type TopBarProps = {
  activeLabel: string;
  notifOpen: boolean;
  user: UserContext;
  onToggleNotifications: () => void;
  onLogout: () => void;
};

type NotificationFilter = "unread" | "all" | Notification["type"];

function notificationIcon(type: Notification["type"]) {
  if (type === "project") return FolderKanban;
  if (type === "task") return CheckCircle2;
  if (type === "meeting") return Bell;
  if (type === "admin") return ShieldCheck;
  return AlertTriangle;
}

function notificationColor(type: Notification["type"]) {
  if (type === "project") return "text-[#8B1E2D]";
  if (type === "task") return "text-emerald-600";
  if (type === "meeting") return "text-blue-500";
  if (type === "admin") return "text-amber-500";
  return "text-[#5F6B73]";
}

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function TopBar({ activeLabel, notifOpen, user, onToggleNotifications, onLogout }: TopBarProps) {
  const analytics = useAnalytics();
  const scope = useMemo(() => tenantScopeFromUser(user), [user]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const rows = await applicationServices.notificationsRepository.list(scope, { pageSize: 25 });
      setNotifications(rows.filter((notification) => notification.userId === user.id));
    } catch {
      setNotifications([]);
    }
  }, [scope, user.id]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (notifOpen) void loadNotifications();
  }, [loadNotifications, notifOpen]);

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !notification.readAt;
    return notification.type === filter;
  });

  const markRead = async (notification: Notification) => {
    if (notification.readAt) {
      setSelectedNotification(notification);
      return;
    }
    const readAt = new Date().toISOString();
    try {
      const updated = await applicationServices.notificationsRepository.update(scope, notification.id, { readAt });
      analytics.trackEvent("notification_marked_read", {
        notification_id: updated.id,
        notification_type: updated.type,
        resource_type: updated.resourceType ?? "none",
      }, {
        organization_id: updated.organizationId,
        user_id: user.id,
        user_role: user.role,
        module_name: "notifications",
        route: "/notifications",
      });
      setNotifications((current) => current.map((row) => row.id === updated.id ? updated : row));
      setSelectedNotification(updated);
    } catch {
      setSelectedNotification(notification);
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST", credentials: "include" }).catch(() => undefined);
    await loadNotifications();
  };

  return (
    <header className="flex flex-shrink-0 items-center gap-4 border-b border-[rgba(0,0,0,0.07)] bg-white px-5 py-3">
      <div className="flex items-center gap-2 text-xs text-[#5F6B73]">
        <span className="font-medium text-[#0F1117]">{activeLabel}</span>
      </div>

      <div className="ml-4 max-w-md flex-1">
        <div className="flex items-center gap-2 rounded-lg border border-transparent bg-[#F2F3F5] px-3 py-1.5 transition-all focus-within:border-[#8B1E2D]/30 focus-within:bg-white">
          <Search size={13} className="text-[#5F6B73]" />
          <input placeholder="Search portfolio..." className="flex-1 bg-transparent text-xs text-[#0F1117] outline-none placeholder:text-[#5F6B73]" />
          <span className="rounded border border-[rgba(0,0,0,0.1)] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#5F6B73]">Ctrl K</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          AI Ready
        </div>

        <div className="relative">
          <button
            onClick={onToggleNotifications}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#5F6B73] transition-colors hover:bg-[#F2F3F5] hover:text-[#0F1117]"
            aria-label="Open notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-white bg-[#8B1E2D]" />}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.06)] px-4 py-3">
                <span className="text-sm font-semibold text-[#0F1117]">Notifications</span>
                <button onClick={() => void markAllRead()} className="text-[11px] font-medium text-[#8B1E2D] hover:underline">{unreadCount} unread</button>
              </div>
              <div className="flex gap-1 overflow-x-auto border-b border-[rgba(0,0,0,0.06)] px-3 py-2">
                {(["unread", "all", "project", "task", "meeting", "admin"] as NotificationFilter[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${filter === item ? "bg-[#8B1E2D] text-white" : "bg-[#F2F3F5] text-[#5F6B73]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredNotifications.map((notification) => {
                  const Icon = notificationIcon(notification.type);
                  return (
                    <button key={notification.id} onClick={() => {
                      analytics.trackEvent("notification_viewed", {
                        notification_id: notification.id,
                        notification_type: notification.type,
                        resource_type: notification.resourceType ?? "none",
                      }, {
                        organization_id: notification.organizationId,
                        user_id: user.id,
                        user_role: user.role,
                        module_name: "notifications",
                        route: "/notifications",
                      });
                      void markRead(notification);
                    }} className="flex w-full items-start gap-3 border-b border-[rgba(0,0,0,0.04)] px-4 py-3 text-left transition-colors hover:bg-[#F8F9FA]">
                      <Icon size={14} className={`${notificationColor(notification.type)} mt-0.5 flex-shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="text-xs leading-snug text-[#0F1117]">{notification.title}</p>
                          {!notification.readAt && <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8B1E2D]" />}
                        </div>
                        <span className="mt-1 block text-[10px] text-[#5F6B73]">{notification.body}</span>
                        <span className="mt-1 block font-mono text-[10px] text-[#5F6B73]">{relativeTime(notification.createdAt)} ago</span>
                      </div>
                    </button>
                  );
                })}
                {filteredNotifications.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-[#5F6B73]">No notifications</div>
                )}
              </div>
              {selectedNotification && (
                <div className="border-t border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] px-4 py-3">
                  <p className="text-xs font-semibold text-[#0F1117]">{selectedNotification.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#5F6B73]">{selectedNotification.body}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg px-2 py-1">
          <Avatar initials={user.avatarInitials ?? "AU"} color="bg-[#8B1E2D]" />
          <button
            onClick={onLogout}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#5F6B73] transition-colors hover:bg-[#F2F3F5] hover:text-[#0F1117]"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
