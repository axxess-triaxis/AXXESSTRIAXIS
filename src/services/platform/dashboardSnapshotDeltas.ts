import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";
import { recordWorkflowTimelineEvent } from "../workflows/liveTenantWorkflow";
import type { WorkflowTimelineEvent } from "../workflows/workflowEvidence";
import type { PilotCommandCenterSnapshot } from "./pilotCommandCenter";

export type DashboardSnapshotRow = {
  id: string;
  organization_id: string;
  generated_by_user_id: string | null;
  score: number | string;
  status: PilotCommandCenterSnapshot["status"];
  readiness_score: number | string;
  workstreams: unknown[] | null;
  queues: unknown[] | null;
  created_at: string;
};

export type DashboardSnapshotDelta = {
  id?: string;
  organizationId: string;
  snapshotId: string;
  previousSnapshotId?: string;
  generatedByUserId?: string;
  timelineEventId?: string;
  scoreDelta: number;
  readinessDelta: number;
  statusChanged: boolean;
  timelineEventIds: string[];
  keyChanges: Array<{ label: string; before?: string | number; after?: string | number }>;
  metrics: Record<string, unknown>;
  createdAt: string;
};

type TimelineEventRow = {
  id: string;
  created_at: string;
  title: string;
  event_type: string;
};

type DashboardSnapshotDeltaRow = {
  id: string;
  organization_id: string;
  snapshot_id: string;
  previous_snapshot_id: string | null;
  generated_by_user_id: string | null;
  timeline_event_id: string | null;
  score_delta: number | string;
  readiness_delta: number | string;
  status_changed: boolean;
  timeline_event_ids: string[] | null;
  key_changes: DashboardSnapshotDelta["keyChanges"] | null;
  metrics: Record<string, unknown> | null;
  created_at: string;
};

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value));
}

function deltaFromRow(row: DashboardSnapshotDeltaRow): DashboardSnapshotDelta {
  return {
    id: row.id,
    organizationId: row.organization_id,
    snapshotId: row.snapshot_id,
    previousSnapshotId: row.previous_snapshot_id ?? undefined,
    generatedByUserId: row.generated_by_user_id ?? undefined,
    timelineEventId: row.timeline_event_id ?? undefined,
    scoreDelta: Number(row.score_delta),
    readinessDelta: Number(row.readiness_delta),
    statusChanged: row.status_changed,
    timelineEventIds: row.timeline_event_ids ?? [],
    keyChanges: row.key_changes ?? [],
    metrics: row.metrics ?? {},
    createdAt: row.created_at,
  };
}

function statusCounts(items: unknown[] | null | undefined) {
  const counts = { pass: 0, warning: 0, blocked: 0 };
  for (const item of items ?? []) {
    if (typeof item !== "object" || item === null) continue;
    const status = (item as { status?: string }).status;
    if (status === "pass" || status === "warning" || status === "blocked") counts[status] += 1;
  }
  return counts;
}

function buildKeyChanges(current: DashboardSnapshotRow, previous?: DashboardSnapshotRow): DashboardSnapshotDelta["keyChanges"] {
  if (!previous) return [{ label: "baseline", after: "First persisted command-center snapshot" }];
  const changes: DashboardSnapshotDelta["keyChanges"] = [];
  if (Number(current.score) !== Number(previous.score)) {
    changes.push({ label: "command_center_score", before: Number(previous.score), after: Number(current.score) });
  }
  if (Number(current.readiness_score) !== Number(previous.readiness_score)) {
    changes.push({ label: "readiness_score", before: Number(previous.readiness_score), after: Number(current.readiness_score) });
  }
  if (current.status !== previous.status) {
    changes.push({ label: "status", before: previous.status, after: current.status });
  }
  return changes.length ? changes : [{ label: "snapshot", after: "No score movement; evidence refreshed" }];
}

async function previousSnapshotFor(current: DashboardSnapshotRow) {
  const rows = await supabaseAdminRest<DashboardSnapshotRow[]>("pilot_command_center_snapshots", {
    query: new URLSearchParams({
      select: "id,organization_id,generated_by_user_id,score,status,readiness_score,workstreams,queues,created_at",
      organization_id: `eq.${current.organization_id}`,
      id: `neq.${current.id}`,
      order: "created_at.desc",
      limit: "1",
    }),
  }).catch(() => []);
  return rows[0];
}

async function recentTimelineEvents(organizationId: string, after?: string) {
  const query = new URLSearchParams({
    select: "id,created_at,title,event_type",
    organization_id: `eq.${organizationId}`,
    order: "created_at.desc",
    limit: "20",
  });
  if (after) query.set("created_at", `gte.${after}`);
  return await supabaseAdminRest<TimelineEventRow[]>("workflow_timeline_events", { query }).catch(() => []);
}

export function buildDashboardSnapshotDelta(input: {
  current: DashboardSnapshotRow;
  previous?: DashboardSnapshotRow;
  timelineEvents?: Pick<WorkflowTimelineEvent, "id">[];
  timelineEventId?: string;
}): DashboardSnapshotDelta {
  const currentCounts = statusCounts(input.current.workstreams);
  const previousCounts = statusCounts(input.previous?.workstreams);
  const timelineEventIds = (input.timelineEvents ?? []).map((event) => event.id).filter(isUuid);
  return {
    organizationId: input.current.organization_id,
    snapshotId: input.current.id,
    previousSnapshotId: input.previous?.id,
    generatedByUserId: input.current.generated_by_user_id ?? undefined,
    timelineEventId: input.timelineEventId,
    scoreDelta: Number(input.current.score) - Number(input.previous?.score ?? input.current.score),
    readinessDelta: Number(input.current.readiness_score) - Number(input.previous?.readiness_score ?? input.current.readiness_score),
    statusChanged: Boolean(input.previous && input.current.status !== input.previous.status),
    timelineEventIds,
    keyChanges: buildKeyChanges(input.current, input.previous),
    metrics: {
      currentStatus: input.current.status,
      previousStatus: input.previous?.status,
      currentWorkstreams: currentCounts,
      previousWorkstreams: previousCounts,
      queueCount: input.current.queues?.length ?? 0,
      linkedTimelineEvents: timelineEventIds.length,
    },
    createdAt: new Date().toISOString(),
  };
}

export async function persistDashboardSnapshotDelta(input: {
  current: DashboardSnapshotRow;
  snapshot: PilotCommandCenterSnapshot;
}): Promise<DashboardSnapshotDelta> {
  const previous = isSupabaseAdminConfigured() ? await previousSnapshotFor(input.current) : undefined;
  const timelineRows = isSupabaseAdminConfigured()
    ? await recentTimelineEvents(input.current.organization_id, previous?.created_at)
    : [];
  const timelineEvents = timelineRows.map((row) => ({ id: row.id }));
  const draft = buildDashboardSnapshotDelta({ current: input.current, previous, timelineEvents });

  if (!isSupabaseAdminConfigured()) return draft;

  const timelineEvent = await recordWorkflowTimelineEvent({
    organizationId: input.current.organization_id,
    resourceType: "dashboard",
    resourceId: input.current.id,
    eventType: "dashboard_updated",
    title: previous ? "Command-center dashboard delta recorded" : "Command-center dashboard baseline recorded",
    description: `${input.snapshot.status} command-center snapshot with score ${input.snapshot.score}.`,
    actorUserId: input.current.generated_by_user_id ?? undefined,
    actorLabel: "AXXESS Command Center",
    sourceType: "pilot_command_center_snapshot",
    sourceId: input.current.id,
    metadata: {
      scoreDelta: draft.scoreDelta,
      readinessDelta: draft.readinessDelta,
      statusChanged: draft.statusChanged,
      linkedTimelineEvents: draft.timelineEventIds.length,
    },
  });

  const rows = await supabaseAdminRest<DashboardSnapshotDeltaRow[]>("dashboard_snapshot_deltas", {
    method: "POST",
    body: {
      organization_id: draft.organizationId,
      snapshot_id: draft.snapshotId,
      previous_snapshot_id: draft.previousSnapshotId ?? null,
      generated_by_user_id: draft.generatedByUserId ?? null,
      timeline_event_id: isUuid(timelineEvent.id) ? timelineEvent.id : null,
      score_delta: draft.scoreDelta,
      readiness_delta: draft.readinessDelta,
      status_changed: draft.statusChanged,
      timeline_event_ids: draft.timelineEventIds,
      key_changes: draft.keyChanges,
      metrics: draft.metrics,
    },
  });

  return rows[0] ? deltaFromRow(rows[0]) : { ...draft, timelineEventId: timelineEvent.id };
}
