import { useLiveWorkspaceMetrics } from "./useLiveWorkspaceMetrics";

export function useLiveNotifications(scope?: Parameters<typeof useLiveWorkspaceMetrics>[0]) {
  return { unread: useLiveWorkspaceMetrics(scope).unreadNotifications };
}

