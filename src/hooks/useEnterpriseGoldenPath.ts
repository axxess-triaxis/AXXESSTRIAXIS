import { useMemo } from "react";
import type { UserContext } from "../security/rbac";
import type { TenantScope } from "../repositories/interfaces";
import { buildEnterpriseGoldenPathSnapshot } from "../services/workflows/enterpriseGoldenPath";
import { useLiveWorkspaceMetrics } from "./useLiveWorkspaceMetrics";

export function useEnterpriseGoldenPath(scope?: TenantScope, user?: UserContext | null) {
  const metrics = useLiveWorkspaceMetrics(scope);

  return useMemo(() => buildEnterpriseGoldenPathSnapshot({
    metrics,
    userRole: user?.role ?? "Guest",
    hasOrganization: Boolean(user?.organizationId),
    hasProfile: Boolean(user?.id && user.displayName),
    connectedIntegrations: metrics.integrationConfigured,
  }), [metrics, user?.displayName, user?.id, user?.organizationId, user?.role]);
}
