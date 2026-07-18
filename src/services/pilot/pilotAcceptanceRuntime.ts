import type { UserContext } from "../../security/rbac";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { listPilotReadinessEventsForAcceptance } from "../../repositories/pilotAcceptanceRepository";
import { getFallbackLiveWorkspaceMetrics, getLiveWorkspaceMetrics } from "../live-platform/livePlatform";
import { buildPilotCommandCenterSnapshot } from "../platform/pilotCommandCenter";
import { buildEnterpriseGoldenPathSnapshot } from "../workflows/enterpriseGoldenPath";
import { computePilotHealth, createDemoPilotReadinessEvents } from "./pilotHealth";
import { buildPilotTenantAcceptanceSnapshot, type PilotTenantAcceptanceSnapshot } from "./pilotAcceptance";

export type BuildPilotAcceptanceRuntimeInput = {
  user: UserContext;
  accessToken?: string;
  env?: NodeJS.ProcessEnv;
  acceptedAt?: string;
  operatorHandoffRecordedAt?: string;
};

export async function buildPilotAcceptanceRuntimeSnapshot(input: BuildPilotAcceptanceRuntimeInput): Promise<PilotTenantAcceptanceSnapshot> {
  const env = input.env ?? process.env;
  const seededPilotEvidence = env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true" || env.AXXESS_PILOT_COMMAND_CENTER_MODE === "preview";
  const scope = tenantScopeFromUser(input.user, input.accessToken);
  const metrics = await getLiveWorkspaceMetrics(applicationServices, scope).catch(() => getFallbackLiveWorkspaceMetrics());
  const readinessEvents = seededPilotEvidence
    ? createDemoPilotReadinessEvents(input.user.organizationId)
    : await listPilotReadinessEventsForAcceptance(input.user.organizationId).catch(() => []);
  const pilotHealth = computePilotHealth(readinessEvents);
  const goldenPath = buildEnterpriseGoldenPathSnapshot({
    metrics,
    userRole: input.user.role,
    hasOrganization: Boolean(input.user.organizationId),
    hasProfile: Boolean(input.user.id && input.user.displayName),
    pendingAiReviews: metrics.pendingApprovals > 0 ? Math.min(6, Math.max(1, Math.ceil(metrics.pendingApprovals / 8))) : 0,
    connectedIntegrations: metrics.integrationConfigured,
  });
  const commandCenter = buildPilotCommandCenterSnapshot({
    organizationId: input.user.organizationId,
    userId: input.user.id,
    userRole: input.user.role,
    env,
    seededPilotEvidence,
  });

  return buildPilotTenantAcceptanceSnapshot({
    organizationId: input.user.organizationId,
    organizationName: "North East Health Mission",
    goldenPath,
    pilotHealth,
    commandCenter,
    metrics,
    acceptedAt: input.acceptedAt,
    operatorHandoffRecordedAt: input.operatorHandoffRecordedAt,
  });
}
