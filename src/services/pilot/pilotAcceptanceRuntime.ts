import type { UserContext } from "../../security/rbac";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { listPilotReadinessEventsForAcceptance } from "../../repositories/pilotAcceptanceRepository";
import { getFallbackLiveWorkspaceMetrics, getLiveWorkspaceMetrics, getZeroLiveWorkspaceMetrics } from "../live-platform/livePlatform";
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
  // A live metrics failure must never surface fabricated demo numbers for a real pilot tenant --
  // only fall back to the demo fixture when this is genuinely a seeded preview. See
  // DEMO_DATA_LEAKAGE_AUDIT.md.
  const metrics = await getLiveWorkspaceMetrics(applicationServices, scope).catch(() => (
    seededPilotEvidence ? getFallbackLiveWorkspaceMetrics() : getZeroLiveWorkspaceMetrics()
  ));
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

  // TP-2 (2026-07-28): this used to hardcode "North East Health Mission" unconditionally, so any
  // real tenant's Pilot Command Center / Customer Success Live Ops admin pages showed the demo
  // institution's name regardless of who was actually signed in -- the same failure class as A-28,
  // just never HITL-walked on these specific admin pages before. Only the genuinely seeded/preview
  // deployment (build-time-forced demo mode or explicit preview mode) shows the demo name now;
  // every other case fetches the real organization's own record.
  const organizationName = seededPilotEvidence
    ? "North East Health Mission"
    : (await applicationServices.organizationsRepository.getById(scope, input.user.organizationId).catch(() => undefined))?.name
      ?? "Organization setup pending";

  return buildPilotTenantAcceptanceSnapshot({
    organizationId: input.user.organizationId,
    organizationName,
    goldenPath,
    pilotHealth,
    commandCenter,
    metrics,
    acceptedAt: input.acceptedAt,
    operatorHandoffRecordedAt: input.operatorHandoffRecordedAt,
  });
}
