import { useMemo } from "react";
import type { UserContext } from "../security/rbac";
import type { TenantScope } from "../repositories/interfaces";
import { buildEnterpriseGoldenPathSnapshot } from "../services/workflows/enterpriseGoldenPath";
import { useLiveWorkspaceMetrics } from "./useLiveWorkspaceMetrics";

// pendingAiReviewsOverride, when provided (Executive Dashboard Sprint ED-2), is a literal count of
// real pending AI review items, passed straight through to buildEnterpriseGoldenPathSnapshot's own
// pendingAiReviews input. Omitting it preserves that function's existing heuristic fallback.
export function useEnterpriseGoldenPath(
  scope?: TenantScope,
  user?: UserContext | null,
  refreshToken = 0,
  pendingAiReviewsOverride?: number,
) {
  const metrics = useLiveWorkspaceMetrics(scope, refreshToken);

  return useMemo(() => buildEnterpriseGoldenPathSnapshot({
    metrics,
    userRole: user?.role ?? "Guest",
    hasOrganization: Boolean(user?.organizationId),
    hasProfile: Boolean(user?.id && user.displayName),
    connectedIntegrations: metrics.integrationConfigured,
    pendingAiReviews: pendingAiReviewsOverride,
  }), [metrics, user?.displayName, user?.id, user?.organizationId, user?.role, pendingAiReviewsOverride]);
}
