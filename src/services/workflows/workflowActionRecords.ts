import type { EntityId, ISODateTime, PriorityLevel } from "../../domain";

export type ApprovalRequestStatus = "pending" | "approved" | "rejected" | "changes_requested" | "completed";
export type StakeholderNoteSentiment = "positive" | "neutral" | "risk" | "urgent";
export type StakeholderNoteVisibility = "private" | "team" | "department" | "organization";
export type ProjectUpdateType = "status" | "risk" | "budget" | "scope" | "ai_review" | "meeting_follow_up";
export type ProjectUpdateStatus = "draft" | "recorded" | "applied" | "superseded";

export type ApprovalRequest = {
  id: EntityId;
  organizationId: EntityId;
  requestedByUserId?: EntityId;
  reviewerUserId?: EntityId;
  sourceAiReviewId?: string;
  sourceAuditLogId?: EntityId;
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: ApprovalRequestStatus;
  dueAt?: ISODateTime;
  decisionReason?: string;
  metadata: Record<string, unknown>;
  decidedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type StakeholderNote = {
  id: EntityId;
  organizationId: EntityId;
  stakeholderId?: EntityId;
  createdByUserId?: EntityId;
  sourceAiReviewId?: string;
  sourceAuditLogId?: EntityId;
  title: string;
  body: string;
  sentiment: StakeholderNoteSentiment;
  visibility: StakeholderNoteVisibility;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type ProjectUpdate = {
  id: EntityId;
  organizationId: EntityId;
  projectId?: EntityId;
  createdByUserId?: EntityId;
  sourceAiReviewId?: string;
  sourceAuditLogId?: EntityId;
  title: string;
  body: string;
  updateType: ProjectUpdateType;
  status: ProjectUpdateStatus;
  progressDelta: number;
  riskLevel?: PriorityLevel;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type CreateApprovalRequestInput = {
  organizationId?: EntityId;
  requestedByUserId?: EntityId;
  reviewerUserId?: EntityId;
  sourceAiReviewId?: string;
  sourceAuditLogId?: EntityId;
  title: string;
  description?: string;
  priority?: PriorityLevel;
  dueAt?: ISODateTime;
  metadata?: Record<string, unknown>;
};

export type CreateStakeholderNoteInput = {
  organizationId?: EntityId;
  stakeholderId?: EntityId;
  createdByUserId?: EntityId;
  sourceAiReviewId?: string;
  sourceAuditLogId?: EntityId;
  title: string;
  body: string;
  sentiment?: StakeholderNoteSentiment;
  visibility?: StakeholderNoteVisibility;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type CreateProjectUpdateInput = {
  organizationId?: EntityId;
  projectId?: EntityId;
  createdByUserId?: EntityId;
  sourceAiReviewId?: string;
  sourceAuditLogId?: EntityId;
  title: string;
  body: string;
  updateType?: ProjectUpdateType;
  status?: ProjectUpdateStatus;
  progressDelta?: number;
  riskLevel?: PriorityLevel;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export function fallbackRecordId(prefix: string, source?: string) {
  return `${prefix}-${source?.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 48) || Date.now()}`;
}

export function createFallbackApprovalRequest(
  input: CreateApprovalRequestInput & { organizationId: EntityId; requestedByUserId?: EntityId },
  now = new Date().toISOString(),
): ApprovalRequest {
  return {
    id: fallbackRecordId("approval-request", input.sourceAiReviewId),
    organizationId: input.organizationId,
    requestedByUserId: input.requestedByUserId,
    reviewerUserId: input.reviewerUserId,
    sourceAiReviewId: input.sourceAiReviewId,
    sourceAuditLogId: input.sourceAuditLogId,
    title: input.title,
    description: input.description,
    priority: input.priority ?? "high",
    status: "pending",
    dueAt: input.dueAt,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

export function createFallbackStakeholderNote(
  input: CreateStakeholderNoteInput & { organizationId: EntityId; createdByUserId?: EntityId },
  now = new Date().toISOString(),
): StakeholderNote {
  return {
    id: fallbackRecordId("stakeholder-note", input.sourceAiReviewId),
    organizationId: input.organizationId,
    stakeholderId: input.stakeholderId,
    createdByUserId: input.createdByUserId,
    sourceAiReviewId: input.sourceAiReviewId,
    sourceAuditLogId: input.sourceAuditLogId,
    title: input.title,
    body: input.body,
    sentiment: input.sentiment ?? "neutral",
    visibility: input.visibility ?? "organization",
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

export function createFallbackProjectUpdate(
  input: CreateProjectUpdateInput & { organizationId: EntityId; createdByUserId?: EntityId },
  now = new Date().toISOString(),
): ProjectUpdate {
  return {
    id: fallbackRecordId("project-update", input.sourceAiReviewId),
    organizationId: input.organizationId,
    projectId: input.projectId,
    createdByUserId: input.createdByUserId,
    sourceAiReviewId: input.sourceAiReviewId,
    sourceAuditLogId: input.sourceAuditLogId,
    title: input.title,
    body: input.body,
    updateType: input.updateType ?? "ai_review",
    status: input.status ?? "recorded",
    progressDelta: input.progressDelta ?? 0,
    riskLevel: input.riskLevel,
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}
