import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { PilotReadinessEvent } from "../services/pilot/pilotHealth";
import type { PilotTenantAcceptanceSnapshot } from "../services/pilot/pilotAcceptance";

type PilotReadinessEventRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  step_id: PilotReadinessEvent["stepId"];
  event_type: PilotReadinessEvent["eventType"];
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type PilotAcceptanceRunRow = {
  id: string;
  organization_id: string;
};

export type PersistPilotAcceptanceInput = {
  snapshot: PilotTenantAcceptanceSnapshot;
  userId: string;
  decision: "snapshot" | "accepted" | "handoff_recorded";
  note?: string;
};

export type PersistPilotAcceptanceResult = {
  persisted: boolean;
  reason?: string;
  runId?: string;
};

function mapPilotReadinessEvent(row: PilotReadinessEventRow): PilotReadinessEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id ?? undefined,
    stepId: row.step_id,
    eventType: row.event_type,
    source: row.source,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function listPilotReadinessEventsForAcceptance(organizationId: string, limit = 200): Promise<PilotReadinessEvent[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const rows = await supabaseAdminRest<PilotReadinessEventRow[]>("pilot_readiness_events", {
    query: new URLSearchParams({
      select: "id,organization_id,user_id,step_id,event_type,source,metadata,created_at",
      organization_id: `eq.${organizationId}`,
      order: "created_at.desc",
      limit: String(Math.min(Math.max(limit, 1), 500)),
    }),
  });
  return (rows ?? []).map(mapPilotReadinessEvent);
}

export async function persistPilotAcceptanceSnapshot(input: PersistPilotAcceptanceInput): Promise<PersistPilotAcceptanceResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      persisted: false,
      reason: "Supabase admin runtime is not configured.",
    };
  }

  const { snapshot } = input;
  const acceptedAt = input.decision === "accepted" ? new Date().toISOString() : snapshot.acceptedAt;
  const rows = await supabaseAdminRest<PilotAcceptanceRunRow[]>("pilot_tenant_acceptance_runs", {
    method: "POST",
    body: {
      organization_id: snapshot.organizationId,
      recorded_by_user_id: input.userId,
      status: input.decision === "accepted" ? "accepted" : snapshot.status,
      stage: input.decision === "accepted" ? "live_operations" : snapshot.stage,
      acceptance_score: snapshot.score,
      completion_percent: snapshot.completionPercent,
      readiness_score: snapshot.readinessScore,
      command_center_score: snapshot.commandCenterScore,
      checklist: snapshot.criteria,
      handoffs: snapshot.handoffs,
      recommendations: snapshot.recommendations,
      accepted_at: acceptedAt,
      metadata: {
        decision: input.decision,
        note: input.note,
        missingEvidenceCount: snapshot.missingEvidenceCount,
        blockedCount: snapshot.blockedCount,
        generatedAt: snapshot.generatedAt,
      },
    },
  });
  const run = rows?.[0];

  if (run) {
    await supabaseAdminRest("pilot_acceptance_checklist_items", {
      method: "POST",
      body: snapshot.criteria.map((item) => ({
        organization_id: snapshot.organizationId,
        acceptance_run_id: run.id,
        criterion_id: item.id,
        label: item.label,
        status: input.decision === "accepted" && item.status !== "blocked" ? "accepted" : item.status,
        owner: item.owner,
        route: item.route,
        detail: item.detail,
        evidence: item.evidence,
        metadata: { source: "sprint_29_acceptance_snapshot" },
      })),
    });

    await supabaseAdminRest("pilot_live_ops_events", {
      method: "POST",
      body: {
        organization_id: snapshot.organizationId,
        acceptance_run_id: run.id,
        actor_user_id: input.userId,
        event_type: input.decision,
        status: input.decision === "accepted" ? "ready" : snapshot.nextOperatorAction.status,
        title: input.decision === "accepted" ? "Pilot tenant accepted for live operations" : snapshot.nextOperatorAction.title,
        description: input.note ?? snapshot.nextOperatorAction.trigger,
        route: snapshot.nextOperatorAction.route,
        evidence: snapshot.nextOperatorAction.evidence,
        metadata: {
          acceptanceScore: snapshot.score,
          stage: input.decision === "accepted" ? "live_operations" : snapshot.stage,
        },
      },
    });
  }

  return {
    persisted: true,
    runId: run?.id,
  };
}
