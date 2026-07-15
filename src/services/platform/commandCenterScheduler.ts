import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";
import type { RoleName } from "../../domain";
import { buildPilotCommandCenterSnapshot, type PilotCommandCenterSnapshot } from "./pilotCommandCenter";

export type PersistCommandCenterSnapshotInput = {
  organizationId: string;
  userId: string;
  userRole?: RoleName;
  seededPilotEvidence?: boolean;
  env?: NodeJS.ProcessEnv;
};

export type PersistCommandCenterSnapshotResult = {
  persisted: boolean;
  reason?: string;
  snapshot: PilotCommandCenterSnapshot;
};

export type CommandCenterSnapshotTenant = {
  organizationId: string;
  userId: string;
  userRole: RoleName;
};

export type PersistAllTenantCommandCenterSnapshotsResult = {
  persisted: boolean;
  reason?: string;
  tenantsSeen: number;
  tenantsProcessed: number;
  snapshotsPersisted: number;
  snapshotsFailed: number;
  results: Array<{
    organizationId: string;
    userId: string;
    persisted: boolean;
    status?: PilotCommandCenterSnapshot["status"];
    score?: number;
    reason?: string;
  }>;
};

type OrganizationRow = {
  id: string;
};

type UserRow = {
  id: string;
  organization_id: string;
  role: RoleName;
  status: string;
};

export function shouldPersistCommandCenterSnapshot(input: {
  lastSnapshotAt?: string;
  now?: string;
  intervalHours?: number;
}) {
  if (!input.lastSnapshotAt) return true;
  const intervalMs = (input.intervalHours ?? 24) * 60 * 60 * 1000;
  return Date.parse(input.now ?? new Date().toISOString()) - Date.parse(input.lastSnapshotAt) >= intervalMs;
}

export async function persistCommandCenterSnapshot(input: PersistCommandCenterSnapshotInput): Promise<PersistCommandCenterSnapshotResult> {
  const snapshot = buildPilotCommandCenterSnapshot({
    organizationId: input.organizationId,
    userId: input.userId,
    userRole: input.userRole,
    seededPilotEvidence: input.seededPilotEvidence,
    env: input.env,
  });

  if (!isSupabaseAdminConfigured()) {
    return {
      persisted: false,
      reason: "Supabase admin runtime is not configured.",
      snapshot,
    };
  }

  await supabaseAdminRest("pilot_command_center_snapshots", {
    method: "POST",
    body: {
      organization_id: snapshot.organizationId,
      generated_by_user_id: input.userId,
      score: snapshot.score,
      status: snapshot.status,
      readiness_score: snapshot.readinessScore,
      sprint_plan: snapshot.sprintPlan,
      workstreams: snapshot.workstreams,
      queues: snapshot.queues,
      plugin_runtime: snapshot.pluginRuntime,
      execution_runtime: snapshot.executionRuntime,
      rag_evaluation: snapshot.ragEvaluation,
      recommendations: snapshot.recommendations,
    },
  });

  return {
    persisted: true,
    snapshot,
  };
}

function chooseSnapshotUser(users: UserRow[]) {
  return users.find((user) => user.role === "Organization Admin")
    ?? users.find((user) => user.role === "Super Admin")
    ?? users.find((user) => user.role === "Executive")
    ?? users.find((user) => user.role === "Manager")
    ?? users[0];
}

export async function listCommandCenterSnapshotTenants(input: { limit?: number } = {}): Promise<CommandCenterSnapshotTenant[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 250);
  const organizations = await supabaseAdminRest<OrganizationRow[]>("organizations", {
    query: new URLSearchParams({
      select: "id",
      order: "created_at.asc",
      limit: String(limit),
    }),
  });
  if (!organizations?.length) return [];

  const organizationIds = organizations.map((organization) => organization.id);
  const users = await supabaseAdminRest<UserRow[]>("users", {
    query: new URLSearchParams({
      select: "id,organization_id,role,status",
      organization_id: `in.(${organizationIds.join(",")})`,
      status: "eq.active",
      limit: String(limit * 8),
    }),
  });
  const usersByOrganization = new Map<string, UserRow[]>();
  for (const user of users ?? []) {
    usersByOrganization.set(user.organization_id, [...(usersByOrganization.get(user.organization_id) ?? []), user]);
  }

  return organizations.flatMap((organization) => {
    const snapshotUser = chooseSnapshotUser(usersByOrganization.get(organization.id) ?? []);
    return snapshotUser ? [{
      organizationId: organization.id,
      userId: snapshotUser.id,
      userRole: snapshotUser.role,
    }] : [];
  });
}

export async function persistAllTenantCommandCenterSnapshots(input: {
  env?: NodeJS.ProcessEnv;
  seededPilotEvidence?: boolean;
  limit?: number;
} = {}): Promise<PersistAllTenantCommandCenterSnapshotsResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      persisted: false,
      reason: "Supabase admin runtime is not configured.",
      tenantsSeen: 0,
      tenantsProcessed: 0,
      snapshotsPersisted: 0,
      snapshotsFailed: 0,
      results: [],
    };
  }

  const tenants = await listCommandCenterSnapshotTenants({ limit: input.limit });
  const results: PersistAllTenantCommandCenterSnapshotsResult["results"] = [];
  for (const tenant of tenants) {
    try {
      const result = await persistCommandCenterSnapshot({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        userRole: tenant.userRole,
        env: input.env,
        seededPilotEvidence: input.seededPilotEvidence,
      });
      results.push({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        persisted: result.persisted,
        status: result.snapshot.status,
        score: result.snapshot.score,
        reason: result.reason,
      });
    } catch (error) {
      results.push({
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        persisted: false,
        reason: error instanceof Error ? error.message : "Snapshot persistence failed.",
      });
    }
  }

  const summary = {
    persisted: results.some((result) => result.persisted),
    reason: tenants.length === 0 ? "No active tenants with snapshot users were found." : undefined,
    tenantsSeen: tenants.length,
    tenantsProcessed: results.length,
    snapshotsPersisted: results.filter((result) => result.persisted).length,
    snapshotsFailed: results.filter((result) => !result.persisted).length,
    results,
  };

  await supabaseAdminRest("command_center_snapshot_runs", {
    method: "POST",
    body: {
      status: summary.snapshotsFailed > 0 ? "warning" : "completed",
      tenants_seen: summary.tenantsSeen,
      tenants_processed: summary.tenantsProcessed,
      snapshots_persisted: summary.snapshotsPersisted,
      snapshots_failed: summary.snapshotsFailed,
      metadata: {
        seededPilotEvidence: input.seededPilotEvidence,
        results: summary.results,
      },
    },
  }).catch(() => undefined);

  return summary;
}
