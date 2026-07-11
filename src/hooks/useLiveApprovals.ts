import { useLiveWorkspaceMetrics } from "./useLiveWorkspaceMetrics";

export function useLiveApprovals(scope?: Parameters<typeof useLiveWorkspaceMetrics>[0]) {
  return { pending: useLiveWorkspaceMetrics(scope).pendingApprovals };
}

