import type { RepositoryQuery, TenantScope } from "./interfaces";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import {
  createFallbackApprovalRequest,
  createFallbackProjectUpdate,
  createFallbackStakeholderNote,
  type ApprovalRequest,
  type CreateApprovalRequestInput,
  type CreateProjectUpdateInput,
  type CreateStakeholderNoteInput,
  type ProjectUpdate,
  type StakeholderNote,
} from "../services/workflows/workflowActionRecords";

type ApprovalRequestRow = {
  id: string;
  organization_id: string;
  requested_by_user_id: string | null;
  reviewer_user_id: string | null;
  source_ai_review_id: string | null;
  source_audit_log_id: string | null;
  title: string;
  description: string | null;
  priority: ApprovalRequest["priority"];
  status: ApprovalRequest["status"];
  due_at: string | null;
  decision_reason: string | null;
  metadata: Record<string, unknown> | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

type StakeholderNoteRow = {
  id: string;
  organization_id: string;
  stakeholder_id: string | null;
  created_by_user_id: string | null;
  source_ai_review_id: string | null;
  source_audit_log_id: string | null;
  title: string;
  body: string;
  sentiment: StakeholderNote["sentiment"];
  visibility: StakeholderNote["visibility"];
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ProjectUpdateRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  created_by_user_id: string | null;
  source_ai_review_id: string | null;
  source_audit_log_id: string | null;
  title: string;
  body: string;
  update_type: ProjectUpdate["updateType"];
  status: ProjectUpdate["status"];
  progress_delta: number | string;
  risk_level: ProjectUpdate["riskLevel"] | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type WorkflowActionRepository<TResource, TCreateInput> = {
  list(scope: TenantScope, query?: RepositoryQuery): Promise<TResource[]>;
  create(scope: TenantScope, input: TCreateInput): Promise<TResource>;
};

function maybeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function limitedPageSize(query?: RepositoryQuery) {
  return String(Math.min(Math.max(query?.pageSize ?? 50, 1), 100));
}

function applySearch(params: URLSearchParams, query: RepositoryQuery | undefined, columns: string[]) {
  if (!query?.search?.trim()) return;
  const escaped = query.search.replace(/[(),]/g, " ").trim();
  if (escaped) params.set("or", `(${columns.map((column) => `${column}.ilike.*${escaped}*`).join(",")})`);
}

function approvalRequestFromRow(row: ApprovalRequestRow): ApprovalRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    requestedByUserId: row.requested_by_user_id ?? undefined,
    reviewerUserId: row.reviewer_user_id ?? undefined,
    sourceAiReviewId: row.source_ai_review_id ?? undefined,
    sourceAuditLogId: row.source_audit_log_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority,
    status: row.status,
    dueAt: row.due_at ?? undefined,
    decisionReason: row.decision_reason ?? undefined,
    metadata: row.metadata ?? {},
    decidedAt: row.decided_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function stakeholderNoteFromRow(row: StakeholderNoteRow): StakeholderNote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    stakeholderId: row.stakeholder_id ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    sourceAiReviewId: row.source_ai_review_id ?? undefined,
    sourceAuditLogId: row.source_audit_log_id ?? undefined,
    title: row.title,
    body: row.body,
    sentiment: row.sentiment,
    visibility: row.visibility,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function projectUpdateFromRow(row: ProjectUpdateRow): ProjectUpdate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    sourceAiReviewId: row.source_ai_review_id ?? undefined,
    sourceAuditLogId: row.source_audit_log_id ?? undefined,
    title: row.title,
    body: row.body,
    updateType: row.update_type,
    status: row.status,
    progressDelta: Number(row.progress_delta),
    riskLevel: row.risk_level ?? undefined,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function approvalInsert(scope: TenantScope, input: CreateApprovalRequestInput) {
  return {
    organization_id: scope.organizationId,
    requested_by_user_id: maybeString(input.requestedByUserId) ?? scope.userId,
    reviewer_user_id: maybeString(input.reviewerUserId),
    source_ai_review_id: maybeString(input.sourceAiReviewId),
    source_audit_log_id: maybeString(input.sourceAuditLogId),
    title: input.title,
    description: maybeString(input.description),
    priority: input.priority ?? "high",
    due_at: maybeString(input.dueAt),
    metadata: input.metadata ?? {},
  };
}

function stakeholderNoteInsert(scope: TenantScope, input: CreateStakeholderNoteInput) {
  return {
    organization_id: scope.organizationId,
    stakeholder_id: maybeString(input.stakeholderId),
    created_by_user_id: maybeString(input.createdByUserId) ?? scope.userId,
    source_ai_review_id: maybeString(input.sourceAiReviewId),
    source_audit_log_id: maybeString(input.sourceAuditLogId),
    title: input.title,
    body: input.body,
    sentiment: input.sentiment ?? "neutral",
    visibility: input.visibility ?? "organization",
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
  };
}

function projectUpdateInsert(scope: TenantScope, input: CreateProjectUpdateInput) {
  return {
    organization_id: scope.organizationId,
    project_id: maybeString(input.projectId),
    created_by_user_id: maybeString(input.createdByUserId) ?? scope.userId,
    source_ai_review_id: maybeString(input.sourceAiReviewId),
    source_audit_log_id: maybeString(input.sourceAuditLogId),
    title: input.title,
    body: input.body,
    update_type: input.updateType ?? "ai_review",
    status: input.status ?? "recorded",
    progress_delta: input.progressDelta ?? 0,
    risk_level: input.riskLevel,
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
  };
}

export const approvalRequestsRepository: WorkflowActionRepository<ApprovalRequest, CreateApprovalRequestInput> = {
  async list(scope, query) {
    if (!isSupabaseAdminConfigured()) return [];
    const params = new URLSearchParams({
      organization_id: `eq.${scope.organizationId}`,
      select: "id,organization_id,requested_by_user_id,reviewer_user_id,source_ai_review_id,source_audit_log_id,title,description,priority,status,due_at,decision_reason,metadata,decided_at,created_at,updated_at",
      order: "created_at.desc",
      limit: limitedPageSize(query),
    });
    applySearch(params, query, ["title", "description", "status"]);
    const rows = await supabaseAdminRest<ApprovalRequestRow[]>("approval_requests", { query: params }).catch(() => []);
    return rows.map(approvalRequestFromRow);
  },
  async create(scope, input) {
    const organizationId = scope.organizationId;
    if (!isSupabaseAdminConfigured()) {
      return createFallbackApprovalRequest({ ...input, organizationId, requestedByUserId: input.requestedByUserId ?? scope.userId });
    }
    const rows = await supabaseAdminRest<ApprovalRequestRow[]>("approval_requests", {
      method: "POST",
      body: approvalInsert(scope, input),
    });
    return rows[0] ? approvalRequestFromRow(rows[0]) : createFallbackApprovalRequest({ ...input, organizationId, requestedByUserId: input.requestedByUserId ?? scope.userId });
  },
};

export const stakeholderNotesRepository: WorkflowActionRepository<StakeholderNote, CreateStakeholderNoteInput> = {
  async list(scope, query) {
    if (!isSupabaseAdminConfigured()) return [];
    const params = new URLSearchParams({
      organization_id: `eq.${scope.organizationId}`,
      select: "id,organization_id,stakeholder_id,created_by_user_id,source_ai_review_id,source_audit_log_id,title,body,sentiment,visibility,tags,metadata,created_at,updated_at",
      order: "created_at.desc",
      limit: limitedPageSize(query),
    });
    applySearch(params, query, ["title", "body"]);
    const rows = await supabaseAdminRest<StakeholderNoteRow[]>("stakeholder_notes", { query: params }).catch(() => []);
    return rows.map(stakeholderNoteFromRow);
  },
  async create(scope, input) {
    const organizationId = scope.organizationId;
    if (!isSupabaseAdminConfigured()) {
      return createFallbackStakeholderNote({ ...input, organizationId, createdByUserId: input.createdByUserId ?? scope.userId });
    }
    const rows = await supabaseAdminRest<StakeholderNoteRow[]>("stakeholder_notes", {
      method: "POST",
      body: stakeholderNoteInsert(scope, input),
    });
    return rows[0] ? stakeholderNoteFromRow(rows[0]) : createFallbackStakeholderNote({ ...input, organizationId, createdByUserId: input.createdByUserId ?? scope.userId });
  },
};

export const projectUpdatesRepository: WorkflowActionRepository<ProjectUpdate, CreateProjectUpdateInput> = {
  async list(scope, query) {
    if (!isSupabaseAdminConfigured()) return [];
    const params = new URLSearchParams({
      organization_id: `eq.${scope.organizationId}`,
      select: "id,organization_id,project_id,created_by_user_id,source_ai_review_id,source_audit_log_id,title,body,update_type,status,progress_delta,risk_level,tags,metadata,created_at,updated_at",
      order: "created_at.desc",
      limit: limitedPageSize(query),
    });
    applySearch(params, query, ["title", "body", "update_type"]);
    const rows = await supabaseAdminRest<ProjectUpdateRow[]>("project_updates", { query: params }).catch(() => []);
    return rows.map(projectUpdateFromRow);
  },
  async create(scope, input) {
    const organizationId = scope.organizationId;
    if (!isSupabaseAdminConfigured()) {
      return createFallbackProjectUpdate({ ...input, organizationId, createdByUserId: input.createdByUserId ?? scope.userId });
    }
    const rows = await supabaseAdminRest<ProjectUpdateRow[]>("project_updates", {
      method: "POST",
      body: projectUpdateInsert(scope, input),
    });
    return rows[0] ? projectUpdateFromRow(rows[0]) : createFallbackProjectUpdate({ ...input, organizationId, createdByUserId: input.createdByUserId ?? scope.userId });
  },
};
