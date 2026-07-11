import { useLiveWorkspaceMetrics } from "./useLiveWorkspaceMetrics";

export function useLiveRagHealth(scope?: Parameters<typeof useLiveWorkspaceMetrics>[0]) {
  const metrics = useLiveWorkspaceMetrics(scope);
  return { readyDocuments: metrics.ragReadyDocuments, status: metrics.ragReadyDocuments > 0 ? "ready" : "empty" };
}

