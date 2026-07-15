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
