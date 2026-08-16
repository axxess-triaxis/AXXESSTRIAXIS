import { computePilotHealth, type PilotHealthScore, type PilotReadinessEvent } from "./pilotHealth";

// Sprint 1 pilot portfolio (2026-08-15): the enterprise golden path (src/services/workflows/
// enterpriseGoldenPath.ts) always has exactly these 8 fixed steps -- kept as a local constant here
// rather than importing the full step-definition array, since this builder only needs the count.
const GOLDEN_PATH_STEP_COUNT = 8;

// A structural-only view of a pilot_readiness_events row for cross-tenant aggregation: no
// `metadata` (tenant-authored free text) and no `userId` (unnecessary for a portfolio rollup), per
// the "aggregate/structural data only, never another tenant's actual content" security constraint
// this cross-tenant read operates under. `id`/`source` are required by PilotReadinessEvent but are
// themselves non-sensitive.
export type PilotPortfolioReadinessEvent = Omit<PilotReadinessEvent, "metadata" | "userId">;

export type PilotPortfolioWorkflowProgressRow = {
  organizationId: string;
  stepId: string;
  status: "not_started" | "active" | "ready" | "needs_review" | "complete" | "blocked";
};

export type PilotTenantSnapshot = {
  organizationId: string;
  organizationName: string;
  pilotUserCount: number;
  onboarding: PilotHealthScore;
  workflowStepsComplete: number;
  workflowStepsTotal: number;
  lastActivityAt?: string;
};

export type PilotPortfolioSnapshot = {
  generatedAt: string;
  tenants: PilotTenantSnapshot[];
  dataState: "live" | "empty" | "not-configured";
};

export type BuildPilotPortfolioSnapshotInput = {
  organizations: { id: string; name: string }[];
  pilotEvents: PilotPortfolioReadinessEvent[];
  workflowProgress: PilotPortfolioWorkflowProgressRow[];
  userCountsByOrganizationId: Record<string, number>;
};

// Pure: takes already-fetched, already-metadata-stripped rows in (the route owns the actual
// Supabase reads), returns the typed rollup. No network/IO here, matching this codebase's existing
// pure-builder/thin-route split (e.g. pilotCommandCenter.ts).
export function buildPilotPortfolioSnapshot(input: BuildPilotPortfolioSnapshotInput): PilotPortfolioSnapshot {
  const tenants: PilotTenantSnapshot[] = input.organizations.map((organization) => {
    const orgEvents = input.pilotEvents.filter((event) => event.organizationId === organization.id);
    const onboarding = computePilotHealth(orgEvents);
    const orgWorkflowRows = input.workflowProgress.filter((row) => row.organizationId === organization.id);
    const workflowStepsComplete = orgWorkflowRows.filter((row) => row.status === "complete").length;

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      pilotUserCount: input.userCountsByOrganizationId[organization.id] ?? 0,
      onboarding,
      workflowStepsComplete,
      workflowStepsTotal: GOLDEN_PATH_STEP_COUNT,
      lastActivityAt: onboarding.lastActivityAt,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    tenants,
    dataState: tenants.length > 0 ? "live" : "empty",
  };
}
