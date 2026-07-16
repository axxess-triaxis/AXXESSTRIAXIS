import type { AuditLog, Meeting, Task } from "../../domain";
import type {
  ApprovalRequest,
  ProjectUpdate,
  StakeholderNote,
} from "./workflowActionRecords";
import type {
  WorkflowActionRepository,
} from "../../repositories/workflowActionRepositories";
import type {
  AuditLogsRepository,
  MeetingsRepository,
  NotificationsRepository,
  ProjectsRepository,
  TasksRepository,
  TenantScope,
} from "../../repositories/interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";
import type { AiReviewInboxItem, AiReviewInboxStatus } from "../ai/reviewInbox";
import {
  buildWorkflowProgressRecords,
  fallbackWorkflowTimelineEvents,
  workflowActionLabels,
  type EnterpriseWorkflowProgressRecord,
  type EnterpriseWorkflowProgressStatus,
  type ReviewWorkflowActionType,
  type WorkflowTimelineEvent,
  type WorkflowTimelineEventType,
  type WorkflowTimelineResourceType,
} from "./workflowEvidence";
import type { EnterpriseGoldenPathSnapshot, EnterpriseWorkflowStepId } from "./enterpriseGoldenPath";

export type LiveTenantWorkflowRepositories = {
  tasksRepository: TasksRepository;
  projectsRepository?: ProjectsRepository;
  meetingsRepository?: MeetingsRepository;
  notificationsRepository?: NotificationsRepository;
  auditLogsRepository?: AuditLogsRepository;
  approvalRequestsRepository?: WorkflowActionRepository<ApprovalRequest, {
    organizationId?: string;
    requestedByUserId?: string;
    reviewerUserId?: string;
    sourceAiReviewId?: string;
    sourceAuditLogId?: string;
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    dueAt?: string;
    metadata?: Record<string, unknown>;
  }>;
  stakeholderNotesRepository?: WorkflowActionRepository<StakeholderNote, {
    organizationId?: string;
    stakeholderId?: string;
    createdByUserId?: string;
    sourceAiReviewId?: string;
    sourceAuditLogId?: string;
    title: string;
    body: string;
    sentiment?: "positive" | "neutral" | "risk" | "urgent";
    visibility?: "private" | "team" | "department" | "organization";
    tags?: string[];
    metadata?: Record<string, unknown>;
  }>;
  projectUpdatesRepository?: WorkflowActionRepository<ProjectUpdate, {
    organizationId?: string;
    projectId?: string;
    createdByUserId?: string;
    sourceAiReviewId?: string;
    sourceAuditLogId?: string;
    title: string;
    body: string;
    updateType?: "status" | "risk" | "budget" | "scope" | "ai_review" | "meeting_follow_up";
    status?: "draft" | "recorded" | "applied" | "superseded";
    progressDelta?: number;
    riskLevel?: "low" | "medium" | "high" | "urgent";
    tags?: string[];
    metadata?: Record<string, unknown>;
  }>;
};

export type AiReviewWorkflowActionInput = {
  review: AiReviewInboxItem;
  decision: AiReviewInboxStatus;
  actionType?: ReviewWorkflowActionType;
  actionTitle?: string;
  notes?: string;
};

export type AiReviewWorkflowActionResult = {
  ok: true;
  actionType?: ReviewWorkflowActionType;
  createdTask?: Task;
  createdMeeting?: Meeting;
  createdApprovalRequest?: ApprovalRequest;
  createdStakeholderNote?: StakeholderNote;
  createdProjectUpdate?: ProjectUpdate;
  auditLog?: AuditLog;
  timelineEvents: WorkflowTimelineEvent[];
  progress: EnterpriseWorkflowProgressRecord[];
};

type WorkflowTimelineRow = {
  id: string;
  organization_id: string;
  resource_type: WorkflowTimelineResourceType;
  resource_id: string | null;
  event_type: WorkflowTimelineEventType;
  title: string;
  description: string | null;
  actor_user_id: string | null;
  actor_label: string | null;
  source_type: string | null;
  source_id: string | null;
  audit_log_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type WorkflowProgressRow = {
  id: string;
  organization_id: string;
  step_id: EnterpriseWorkflowStepId;
  status: EnterpriseWorkflowProgressStatus;
  last_event_id: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function mapTimelineRow(row: WorkflowTimelineRow): WorkflowTimelineEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    resourceType: row.resource_type,
    resourceId: row.resource_id ?? undefined,
    eventType: row.event_type,
    title: row.title,
    description: row.description ?? undefined,
    actorUserId: row.actor_user_id ?? undefined,
    actorLabel: row.actor_label ?? undefined,
    sourceType: row.source_type ?? undefined,
    sourceId: row.source_id ?? undefined,
    auditLogId: row.audit_log_id ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function mapProgressRow(row: WorkflowProgressRow): EnterpriseWorkflowProgressRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    stepId: row.step_id,
    status: row.status,
    lastEventId: row.last_event_id ?? undefined,
    completedAt: row.completed_at ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function progressRow(record: EnterpriseWorkflowProgressRecord) {
  return {
    organization_id: record.organizationId,
    step_id: record.stepId,
    status: record.status,
    last_event_id: isUuid(record.lastEventId) ? record.lastEventId : null,
    completed_at: record.completedAt ?? null,
    metadata: record.metadata,
  };
}

function timelineRow(event: Omit<WorkflowTimelineEvent, "id" | "createdAt"> & { createdAt?: string }) {
  return {
    organization_id: event.organizationId,
    resource_type: event.resourceType,
    resource_id: isUuid(event.resourceId) ? event.resourceId : null,
    event_type: event.eventType,
    title: event.title,
    description: event.description ?? null,
    actor_user_id: isUuid(event.actorUserId) ? event.actorUserId : null,
    actor_label: event.actorLabel ?? null,
    source_type: event.sourceType ?? null,
    source_id: event.sourceId ?? null,
    audit_log_id: isUuid(event.auditLogId) ? event.auditLogId : null,
    metadata: event.metadata,
    created_at: event.createdAt ?? new Date().toISOString(),
  };
}

function fallbackEvent(event: Omit<WorkflowTimelineEvent, "id" | "createdAt"> & { createdAt?: string }): WorkflowTimelineEvent {
  return {
    ...event,
    id: `timeline-${event.eventType}-${Date.now()}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
  };
}

export async function listWorkflowTimeline(
  organizationId: string,
  options: { limit?: number; resourceType?: WorkflowTimelineResourceType; resourceId?: string } = {},
): Promise<WorkflowTimelineEvent[]> {
  if (!isSupabaseAdminConfigured()) return fallbackWorkflowTimelineEvents(organizationId).slice(0, options.limit ?? 20);

  const query = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    select: "id,organization_id,resource_type,resource_id,event_type,title,description,actor_user_id,actor_label,source_type,source_id,audit_log_id,metadata,created_at",
    order: "created_at.desc",
    limit: String(options.limit ?? 30),
  });
  if (options.resourceType) query.set("resource_type", `eq.${options.resourceType}`);
  if (options.resourceId && isUuid(options.resourceId)) query.set("resource_id", `eq.${options.resourceId}`);

  const rows = await supabaseAdminRest<WorkflowTimelineRow[]>("workflow_timeline_events", { query }).catch(() => []);
  return rows.length ? rows.map(mapTimelineRow) : fallbackWorkflowTimelineEvents(organizationId).slice(0, options.limit ?? 20);
}

export async function recordWorkflowTimelineEvent(
  event: Omit<WorkflowTimelineEvent, "id" | "createdAt"> & { createdAt?: string },
): Promise<WorkflowTimelineEvent> {
  if (!isSupabaseAdminConfigured()) return fallbackEvent(event);

  const rows = await supabaseAdminRest<WorkflowTimelineRow[]>("workflow_timeline_events", {
    method: "POST",
    body: timelineRow(event),
  });
  return rows[0] ? mapTimelineRow(rows[0]) : fallbackEvent(event);
}

export async function upsertWorkflowProgressRecords(records: EnterpriseWorkflowProgressRecord[]): Promise<EnterpriseWorkflowProgressRecord[]> {
  if (records.length === 0) return [];
  if (!isSupabaseAdminConfigured()) return records;

  const query = new URLSearchParams({ on_conflict: "organization_id,step_id" });
  const rows = await supabaseAdminRest<WorkflowProgressRow[]>("enterprise_workflow_progress", {
    method: "POST",
    query,
    prefer: "resolution=merge-duplicates,return=representation",
    body: records.map(progressRow),
  }).catch(() => []);
  return rows.length ? rows.map(mapProgressRow) : records;
}

export async function persistGoldenPathProgress(organizationId: string, snapshot: EnterpriseGoldenPathSnapshot) {
  return upsertWorkflowProgressRecords(buildWorkflowProgressRecords(organizationId, snapshot));
}

function defaultActionTitle(review: AiReviewInboxItem, actionType: ReviewWorkflowActionType) {
  const prefix = workflowActionLabels[actionType].replace("Create ", "");
  return `${prefix}: ${review.answerExcerpt.slice(0, 92)}`;
}

async function createApprovedAction(
  repositories: LiveTenantWorkflowRepositories,
  scope: TenantScope,
  input: AiReviewWorkflowActionInput & { actionType: ReviewWorkflowActionType },
) {
  const title = input.actionTitle?.trim() || defaultActionTitle(input.review, input.actionType);
  const description = [
    input.review.answerExcerpt,
    input.notes ? `Reviewer notes: ${input.notes}` : undefined,
    input.review.citations.length ? `Sources: ${input.review.citations.map((citation) => citation.title ?? citation.sourceId).filter(Boolean).join(", ")}` : undefined,
  ].filter(Boolean).join("\n\n");
  const metadata = {
    source: "ai_review",
    reviewId: input.review.id,
    sourceAuditId: input.review.sourceAuditId,
    confidence: input.review.confidence,
    citations: input.review.citations,
    decisionNotes: input.notes,
  };

  if (input.actionType === "approval_request" && repositories.approvalRequestsRepository) {
    const approvalRequest = await repositories.approvalRequestsRepository.create(scope, {
      organizationId: scope.organizationId,
      requestedByUserId: scope.userId,
      sourceAiReviewId: input.review.id,
      title,
      description,
      priority: "high",
      dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      metadata,
    });
    return { resourceType: "approval_request" as const, approvalRequest };
  }

  if (input.actionType === "stakeholder_note" && repositories.stakeholderNotesRepository) {
    const stakeholderNote = await repositories.stakeholderNotesRepository.create(scope, {
      organizationId: scope.organizationId,
      createdByUserId: scope.userId,
      sourceAiReviewId: input.review.id,
      title,
      body: description,
      sentiment: input.review.confidence < 0.7 ? "risk" : "neutral",
      visibility: "organization",
      tags: ["ai-review", "stakeholder-intelligence"],
      metadata,
    });
    return { resourceType: "stakeholder_note" as const, stakeholderNote };
  }

  if (input.actionType === "project_update" && repositories.projectUpdatesRepository) {
    const projectUpdate = await repositories.projectUpdatesRepository.create(scope, {
      organizationId: scope.organizationId,
      createdByUserId: scope.userId,
      sourceAiReviewId: input.review.id,
      title,
      body: description,
      updateType: "ai_review",
      status: "recorded",
      riskLevel: input.review.confidence < 0.7 ? "high" : "medium",
      tags: ["ai-review", "project-update"],
      metadata,
    });
    return { resourceType: "project_update" as const, projectUpdate };
  }

  if (input.actionType === "meeting_follow_up" && repositories.meetingsRepository) {
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const meeting = await repositories.meetingsRepository.create(scope, {
      organizationId: scope.organizationId,
      title,
      startsAt,
      attendeeIds: [scope.userId],
      agenda: description,
      decisions: [],
      actionItems: [input.review.answerExcerpt],
      status: "scheduled",
    });
    return { resourceType: "meeting" as const, meeting };
  }

  const priority = input.actionType === "approval_request" ? "high" : "medium";
  const task = await repositories.tasksRepository.create(scope, {
    organizationId: scope.organizationId,
    title,
    description,
    assigneeId: scope.userId,
    priority,
    status: "pending",
    tags: ["ai-review", "governance", input.actionType.replace(/_/g, "-")],
  });
  return { resourceType: "task" as const, task };
}

export async function createWorkflowActionFromAiReview(
  repositories: LiveTenantWorkflowRepositories,
  scope: TenantScope,
  input: AiReviewWorkflowActionInput,
): Promise<AiReviewWorkflowActionResult> {
  const now = new Date().toISOString();
  const actionType = input.actionType ?? "task";
  let createdTask: Task | undefined;
  let createdMeeting: Meeting | undefined;
  let createdApprovalRequest: ApprovalRequest | undefined;
  let createdStakeholderNote: StakeholderNote | undefined;
  let createdProjectUpdate: ProjectUpdate | undefined;
  let resourceType: WorkflowTimelineResourceType = "ai_review";
  let resourceId: string | undefined;

  if (input.decision === "approved") {
    const created = await createApprovedAction(repositories, scope, { ...input, actionType });
    createdTask = "task" in created ? created.task : undefined;
    createdMeeting = "meeting" in created ? created.meeting : undefined;
    createdApprovalRequest = "approvalRequest" in created ? created.approvalRequest : undefined;
    createdStakeholderNote = "stakeholderNote" in created ? created.stakeholderNote : undefined;
    createdProjectUpdate = "projectUpdate" in created ? created.projectUpdate : undefined;
    resourceType = created.resourceType;
    resourceId = createdTask?.id ?? createdMeeting?.id ?? createdApprovalRequest?.id ?? createdStakeholderNote?.id ?? createdProjectUpdate?.id;
  }

  const auditLog = await repositories.auditLogsRepository?.record(scope, {
    action: input.decision === "approved" ? "ai.review.workflow_action_created" : `ai.review.${input.decision}`,
    resourceType,
    resourceId,
    category: "workflow",
    metadata: {
      reviewId: input.review.id,
      sourceAuditId: input.review.sourceAuditId,
      actionType: input.decision === "approved" ? actionType : undefined,
      decision: input.decision,
      confidence: input.review.confidence,
      citations: input.review.citations,
      notes: input.notes,
    },
  }).catch(() => undefined);

  await repositories.notificationsRepository?.create(scope, {
    organizationId: scope.organizationId,
    userId: scope.userId,
    type: resourceType === "task" ? "task" : "system",
    title: input.decision === "approved" ? "Workflow action created" : "AI review decision recorded",
    body: input.decision === "approved"
      ? `${workflowActionLabels[actionType]} was created from a reviewed AI answer.`
      : `AI output was marked ${input.decision}.`,
    resourceType,
    resourceId,
  }).catch(() => undefined);

  const decisionEvent = await recordWorkflowTimelineEvent({
    organizationId: scope.organizationId,
    resourceType: "ai_review",
    resourceId: isUuid(input.review.id) ? input.review.id : undefined,
    eventType: "human_decision",
    title: `AI review ${input.decision}`,
    description: input.notes ?? input.review.answerExcerpt,
    actorUserId: scope.userId,
    actorLabel: scope.role,
    sourceType: "ai_review",
    sourceId: input.review.id,
    auditLogId: auditLog?.id,
    metadata: {
      confidence: input.review.confidence,
      humanReviewFlag: input.review.humanReviewFlag,
      citationCount: input.review.citations.length,
    },
    createdAt: now,
  });

  const actionEvent = input.decision === "approved" && resourceId
    ? await recordWorkflowTimelineEvent({
      organizationId: scope.organizationId,
      resourceType,
      resourceId,
      eventType: "workflow_action_created",
      title: workflowActionLabels[actionType],
      description: createdTask?.title
        ?? createdMeeting?.title
        ?? createdApprovalRequest?.title
        ?? createdStakeholderNote?.title
        ?? createdProjectUpdate?.title
        ?? input.review.answerExcerpt,
      actorUserId: scope.userId,
      actorLabel: scope.role,
      sourceType: "ai_review",
      sourceId: input.review.id,
      auditLogId: auditLog?.id,
      metadata: {
        actionType,
        reviewId: input.review.id,
        sourceAuditId: input.review.sourceAuditId,
      },
      createdAt: now,
    })
    : undefined;

  const auditEvent = await recordWorkflowTimelineEvent({
    organizationId: scope.organizationId,
    resourceType: "audit",
    resourceId: auditLog?.id,
    eventType: "audit_recorded",
    title: "Workflow audit evidence recorded",
    description: "Source, AI output, human decision and created work were linked for tenant audit review.",
    actorUserId: scope.userId,
    actorLabel: "AXXESS Audit Layer",
    sourceType: resourceType,
    sourceId: resourceId ?? input.review.id,
    auditLogId: auditLog?.id,
    metadata: {
      actionType: input.decision === "approved" ? actionType : undefined,
      decision: input.decision,
    },
    createdAt: now,
  });

  const progress = await upsertWorkflowProgressRecords([
    {
      organizationId: scope.organizationId,
      stepId: "human-review",
      status: "complete",
      lastEventId: decisionEvent.id,
      completedAt: now,
      metadata: { reviewId: input.review.id, decision: input.decision },
    },
    {
      organizationId: scope.organizationId,
      stepId: "workflow-action",
      status: input.decision === "approved" ? "complete" : "ready",
      lastEventId: actionEvent?.id ?? decisionEvent.id,
      completedAt: input.decision === "approved" ? now : undefined,
      metadata: { actionType: input.decision === "approved" ? actionType : undefined, resourceType, resourceId },
    },
    {
      organizationId: scope.organizationId,
      stepId: "dashboard-feedback",
      status: "active",
      lastEventId: actionEvent?.id ?? decisionEvent.id,
      metadata: { reason: "Workflow action should refresh dashboard health indicators." },
    },
    {
      organizationId: scope.organizationId,
      stepId: "audit-evidence",
      status: "needs_review",
      lastEventId: auditEvent.id,
      metadata: { auditLogId: auditLog?.id, resourceType, resourceId },
    },
  ]);

  return {
    ok: true,
    actionType: input.decision === "approved" ? actionType : undefined,
    createdTask,
    createdMeeting,
    createdApprovalRequest,
    createdStakeholderNote,
    createdProjectUpdate,
    auditLog,
    timelineEvents: [decisionEvent, actionEvent, auditEvent].filter((event): event is WorkflowTimelineEvent => Boolean(event)),
    progress,
  };
}
