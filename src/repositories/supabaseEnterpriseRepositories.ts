import type {
  AuditLog,
  BetaFeedback,
  Document,
  DocumentActivity,
  DocumentCategory,
  DocumentPermission,
  DocumentTag,
  DocumentVersion,
  EntityId,
  Invitation,
  KnowledgeArticle,
  Meeting,
  Notification,
  Organization,
  Program,
  Project,
  RoleName,
  Task,
  User,
} from "../domain";
import { normalizeRole } from "../auth/supabaseUser";
import type { UserContext } from "../security/rbac";
import type {
  AuditLogsRepository,
  BetaFeedbackRepository,
  CreateBetaFeedbackInput,
  DocumentActivityInput,
  DocumentActivityRepository,
  DocumentCategoriesRepository,
  DocumentPermissionsRepository,
  DocumentsRepository,
  DocumentTagsRepository,
  DocumentVersionsRepository,
  InvitationsRepository,
  KnowledgeArticlesRepository,
  KnowledgeSearchRepository,
  KnowledgeSearchResult,
  MeetingsRepository,
  MutableTenantRepository,
  NotificationsRepository,
  OrganizationsRepository,
  ProgramsRepository,
  ProjectsRepository,
  RepositoryQuery,
  TasksRepository,
  TenantCreateInput,
  TenantRepository,
  TenantScope,
  TenantUpdateInput,
  UsersRepository,
} from "./interfaces";

export type ResourceName =
  | "organizations"
  | "users"
  | "programs"
  | "projects"
  | "tasks"
  | "documents"
  | "document_versions"
  | "document_categories"
  | "document_tags"
  | "document_permissions"
  | "document_activity"
  | "knowledge_articles"
  | "meetings"
  | "notifications"
  | "audit_logs"
  | "invitations"
  | "beta_feedback";

type SupabaseRestOptions = {
  method?: "GET" | "POST" | "PATCH";
  accessToken: string;
  query?: URLSearchParams;
  body?: Record<string, unknown>;
  prefer?: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  sector: Organization["sector"];
  created_at: string;
  updated_at: string;
};

type UserRow = {
  id: string;
  organization_id: string;
  email: string;
  display_name: string;
  avatar_initials: string;
  role: string;
  status: User["status"];
  department_name: string | null;
  title: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
};

type ProgramRow = {
  id: string;
  organization_id: string;
  name: string;
  owner_id: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  program_id: string | null;
  name: string;
  description: string | null;
  owner_id: string | null;
  progress: number | string;
  risk_level: Project["riskLevel"];
  priority: Project["priority"];
  status: string;
  start_date: string | null;
  due_date: string | null;
  tags: string[] | null;
};

type TaskRow = {
  id: string;
  organization_id: string;
  program_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: Task["priority"];
  status: string;
  due_date: string | null;
  tags: string[] | null;
};

type DocumentRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  category_id: string | null;
  name: string;
  title: string | null;
  description: string | null;
  storage_path: string;
  file_name: string | null;
  file_size: number | string | null;
  mime_type: string;
  document_type: Document["documentType"] | null;
  status: Document["status"] | null;
  visibility: Document["visibility"] | null;
  classification: Document["classification"] | null;
  owner_user_id: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  current_version: number | string | null;
  tags: string[] | null;
  is_favorite?: boolean | null;
  last_viewed_at?: string | null;
  category?: { name: string | null } | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

type DocumentVersionRow = {
  id: string;
  organization_id: string;
  document_id: string;
  version_number: number | string;
  file_name: string;
  file_size: number | string;
  mime_type: string;
  storage_path: string;
  checksum: string | null;
  created_by_user_id: string | null;
  created_at: string;
};

type DocumentCategoryRow = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentTagRow = {
  id: string;
  organization_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentPermissionRow = {
  id: string;
  organization_id: string;
  document_id: string;
  principal_type: DocumentPermission["principalType"];
  principal_id: string | null;
  access_level: DocumentPermission["accessLevel"];
  created_by_user_id: string | null;
  expires_at: string | null;
  created_at: string;
};

type DocumentActivityRow = {
  id: string;
  organization_id: string;
  document_id: string;
  actor_user_id: string | null;
  action: DocumentActivity["action"];
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type KnowledgeArticleRow = {
  id: string;
  organization_id: string;
  title: string;
  body_markdown: string;
  summary: string | null;
  status: KnowledgeArticle["status"];
  category_id: string | null;
  author_user_id: string | null;
  tags: string[] | null;
  is_favorite?: boolean | null;
  last_viewed_at?: string | null;
  category?: { name: string | null } | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type MeetingRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  program_id: string | null;
  stakeholder_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  attendee_ids: string[] | null;
  agenda: string | null;
  notes: string | null;
  decisions: string[] | null;
  action_items: string[] | null;
  status: Meeting["status"];
};

type NotificationRow = {
  id: string;
  organization_id: string;
  user_id: string;
  type: Notification["type"] | null;
  title: string;
  body: string;
  resource_type: string | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
};

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by_user_id: string | null;
  status: Invitation["status"];
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

type AuditLogRow = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  category: string | null;
  request_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type BetaFeedbackRow = {
  id: string;
  organization_id: string;
  user_id: string;
  feedback_type: BetaFeedback["feedbackType"];
  module: string;
  rating: number;
  message: string;
  permission_to_contact: boolean;
  status: BetaFeedback["status"];
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ResourceConfig<TRow, TResource> = {
  table: ResourceName;
  select: string;
  searchColumns: string[];
  defaultOrder: string;
  map(row: TRow): TResource;
  toInsert?(scope: TenantScope, input: Record<string, unknown>): Record<string, unknown>;
  toUpdate?(scope: TenantScope, input: Record<string, unknown>): Record<string, unknown>;
};

export function tenantScopeFromUser(user: UserContext, accessToken?: string): TenantScope {
  return {
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
    accessToken,
  };
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase repository runtime is not configured.");
  return { url, anonKey };
}

function gatewayQuery(query?: RepositoryQuery) {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.search) params.set("search", query.search);
  return params;
}

function applyRepositoryQuery(params: URLSearchParams, config: ResourceConfig<unknown, unknown>, scope: TenantScope, query?: RepositoryQuery) {
  params.set("select", config.select);
  params.set("order", config.defaultOrder);

  if (scope.role !== "Super Admin" && config.table !== "organizations") {
    params.set("organization_id", `eq.${scope.organizationId}`);
  }

  if (query?.search && config.searchColumns.length > 0) {
    const escapedSearch = query.search.replace(/[(),]/g, " ").trim();
    if (escapedSearch) {
      params.set("or", `(${config.searchColumns.map((column) => `${column}.ilike.*${escapedSearch}*`).join(",")})`);
    }
  }

  const pageSize = Math.min(Math.max(query?.pageSize ?? 50, 1), 100);
  const page = Math.max(query?.page ?? 1, 1);
  params.set("limit", String(pageSize));
  params.set("offset", String((page - 1) * pageSize));
}

async function supabaseRest<TResponse>(table: ResourceName, options: SupabaseRestOptions) {
  const { url, anonKey } = getSupabaseConfig();
  const queryString = options.query?.toString();
  const response = await fetch(`${url}/rest/v1/${table}${queryString ? `?${queryString}` : ""}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
      Prefer: options.prefer ?? "return=representation",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase repository request failed for ${table}: ${response.status} ${message}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as TResponse;
}

async function gatewayList<TResource>(resource: ResourceName, query?: RepositoryQuery, id?: EntityId) {
  const params = gatewayQuery(query);
  if (id) params.set("id", id);

  const response = await fetch(`/api/repositories/${resource}?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Repository gateway failed for ${resource}.`);
  return await response.json() as TResource[];
}

async function gatewayMutation<TResource>(
  resource: ResourceName,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
  id?: EntityId,
) {
  const params = new URLSearchParams();
  if (id) params.set("id", id);

  const response = await fetch(`/api/repositories/${resource}${params.toString() ? `?${params.toString()}` : ""}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Repository gateway mutation failed for ${resource}: ${message}`);
  }

  return await response.json() as TResource;
}

async function gatewayBetaFeedback<TResource>(method: "GET" | "POST", body?: Record<string, unknown>, query?: RepositoryQuery) {
  const params = gatewayQuery(query);
  const response = await fetch(`/api/beta-feedback${params.toString() ? `?${params.toString()}` : ""}`, {
    method,
    credentials: "include",
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Beta feedback gateway failed: ${message}`);
  }

  return await response.json() as TResource;
}

async function listResource<TRow, TResource>(
  resource: ResourceName,
  config: ResourceConfig<TRow, TResource>,
  scope: TenantScope,
  query?: RepositoryQuery,
) {
  if (!scope.accessToken) return gatewayList<TResource>(resource, query);

  const params = new URLSearchParams();
  applyRepositoryQuery(params, config as ResourceConfig<unknown, unknown>, scope, query);
  const rows = await supabaseRest<TRow[]>(config.table, { accessToken: scope.accessToken, query: params });
  return rows.map(config.map);
}

async function getResourceById<TRow, TResource extends { id: EntityId }>(
  resource: ResourceName,
  config: ResourceConfig<TRow, TResource>,
  scope: TenantScope,
  id: EntityId,
) {
  if (!scope.accessToken) {
    const rows = await gatewayList<TResource>(resource, undefined, id);
    return rows[0];
  }

  const params = new URLSearchParams();
  applyRepositoryQuery(params, config as ResourceConfig<unknown, unknown>, scope);
  params.set("id", `eq.${id}`);
  params.set("limit", "1");
  const rows = await supabaseRest<TRow[]>(config.table, { accessToken: scope.accessToken, query: params });
  return rows.map(config.map)[0];
}

async function createResource<TRow, TResource extends { id: EntityId; organizationId: EntityId }>(
  resource: ResourceName,
  config: ResourceConfig<TRow, TResource>,
  scope: TenantScope,
  input: TenantCreateInput<TResource>,
) {
  if (!config.toInsert) throw new Error(`Repository ${resource} does not support create.`);
  if (!scope.accessToken) return gatewayMutation<TResource>(resource, "POST", input as Record<string, unknown>);

  const rows = await supabaseRest<TRow[]>(config.table, {
    method: "POST",
    accessToken: scope.accessToken,
    body: config.toInsert(scope, input as Record<string, unknown>),
  });

  if (!rows[0]) throw new Error(`Created ${resource} record was not returned by Supabase.`);
  return config.map(rows[0]);
}

async function updateResource<TRow, TResource extends { id: EntityId; organizationId: EntityId }>(
  resource: ResourceName,
  config: ResourceConfig<TRow, TResource>,
  scope: TenantScope,
  id: EntityId,
  input: TenantUpdateInput<TResource>,
) {
  if (!config.toUpdate) throw new Error(`Repository ${resource} does not support update.`);
  if (!scope.accessToken) return gatewayMutation<TResource>(resource, "PATCH", input as Record<string, unknown>, id);

  const params = new URLSearchParams();
  params.set("id", `eq.${id}`);
  if (scope.role !== "Super Admin") params.set("organization_id", `eq.${scope.organizationId}`);

  const rows = await supabaseRest<TRow[]>(config.table, {
    method: "PATCH",
    accessToken: scope.accessToken,
    query: params,
    body: config.toUpdate(scope, input as Record<string, unknown>),
  });

  if (!rows[0]) throw new Error(`Updated ${resource} record was not returned by Supabase.`);
  return config.map(rows[0]);
}

function programStatus(status: string): Program["status"] {
  if (status === "completed") return "completed";
  if (status === "archived") return "archived";
  if (status === "at-risk") return "at-risk";
  if (status === "planning") return "planning";
  return "active";
}

function projectStatus(status: string): Project["status"] {
  if (status === "completed") return "complete";
  if (status === "review") return "review";
  if (status === "at-risk") return "at-risk";
  if (status === "planning") return "planning";
  return "in-progress";
}

function taskStatus(status: string): Task["status"] {
  if (status === "blocked") return "blocked";
  if (status === "completed") return "completed";
  if (status === "in-progress") return "in-progress";
  return "pending";
}

function projectStatusForDatabase(status: unknown) {
  if (status === "complete") return "completed";
  if (status === "review" || status === "at-risk" || status === "planning" || status === "in-progress") return status;
  return undefined;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function compactMutation(body: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

function optionalId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function slugFromName(value: unknown) {
  const text = typeof value === "string" ? value : "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "uncategorized";
}

function documentMutation(scope: TenantScope, input: Record<string, unknown>) {
  const name = nullableString(input.name) ?? nullableString(input.title);
  const fileName = nullableString(input.fileName) ?? name;

  return compactMutation({
    id: optionalId(input.id),
    organization_id: scope.organizationId,
    project_id: nullableString(input.projectId),
    category_id: nullableString(input.categoryId),
    name,
    title: nullableString(input.title) ?? name,
    description: nullableString(input.description),
    storage_path: nullableString(input.storagePath),
    file_name: fileName,
    file_size: nullableNumber(input.fileSize),
    mime_type: nullableString(input.mimeType),
    document_type: input.documentType,
    status: input.status ?? "active",
    visibility: input.visibility ?? "organization",
    classification: input.classification ?? "internal",
    owner_user_id: nullableString(input.ownerId) ?? scope.userId,
    created_by_user_id: nullableString(input.createdByUserId) ?? scope.userId,
    updated_by_user_id: scope.userId,
    current_version: typeof input.currentVersion === "number" ? input.currentVersion : 1,
    tags: stringArray(input.tags),
  });
}

function documentUpdateMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    project_id: input.projectId === undefined ? undefined : nullableString(input.projectId),
    category_id: input.categoryId === undefined ? undefined : nullableString(input.categoryId),
    name: input.name === undefined ? undefined : nullableString(input.name),
    title: input.title === undefined ? undefined : nullableString(input.title),
    description: input.description === undefined ? undefined : nullableString(input.description),
    storage_path: input.storagePath === undefined ? undefined : nullableString(input.storagePath),
    file_name: input.fileName === undefined ? undefined : nullableString(input.fileName),
    file_size: input.fileSize === undefined ? undefined : nullableNumber(input.fileSize),
    mime_type: input.mimeType === undefined ? undefined : nullableString(input.mimeType),
    document_type: input.documentType,
    status: input.status,
    visibility: input.visibility,
    classification: input.classification,
    owner_user_id: input.ownerId === undefined ? undefined : nullableString(input.ownerId),
    updated_by_user_id: scope.userId,
    current_version: input.currentVersion,
    tags: input.tags === undefined ? undefined : stringArray(input.tags),
    archived_at: input.archivedAt === undefined ? undefined : input.archivedAt,
    deleted_at: input.deletedAt === undefined ? undefined : input.deletedAt,
  });
}

function documentVersionMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    id: optionalId(input.id),
    organization_id: scope.organizationId,
    document_id: nullableString(input.documentId),
    version_number: typeof input.versionNumber === "number" ? input.versionNumber : 1,
    file_name: nullableString(input.fileName),
    file_size: nullableNumber(input.fileSize),
    mime_type: nullableString(input.mimeType),
    storage_path: nullableString(input.storagePath),
    checksum: nullableString(input.checksum),
    created_by_user_id: scope.userId,
  });
}

function categoryMutation(scope: TenantScope, input: Record<string, unknown>) {
  const name = nullableString(input.name);
  return compactMutation({
    id: optionalId(input.id),
    organization_id: scope.organizationId,
    name,
    slug: nullableString(input.slug) ?? slugFromName(name),
    description: nullableString(input.description),
    parent_id: nullableString(input.parentId),
  });
}

function categoryUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    name: input.name === undefined ? undefined : nullableString(input.name),
    slug: input.slug === undefined ? undefined : nullableString(input.slug) ?? slugFromName(input.name),
    description: input.description === undefined ? undefined : nullableString(input.description),
    parent_id: input.parentId === undefined ? undefined : nullableString(input.parentId),
  });
}

function tagMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    id: optionalId(input.id),
    organization_id: scope.organizationId,
    name: nullableString(input.name),
    color: nullableString(input.color),
  });
}

function tagUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    name: input.name === undefined ? undefined : nullableString(input.name),
    color: input.color === undefined ? undefined : nullableString(input.color),
  });
}

function documentPermissionMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    id: optionalId(input.id),
    organization_id: scope.organizationId,
    document_id: nullableString(input.documentId),
    principal_type: input.principalType,
    principal_id: nullableString(input.principalId),
    access_level: input.accessLevel ?? "viewer",
    created_by_user_id: scope.userId,
    expires_at: nullableString(input.expiresAt),
  });
}

function documentPermissionUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    principal_type: input.principalType,
    principal_id: input.principalId === undefined ? undefined : nullableString(input.principalId),
    access_level: input.accessLevel,
    expires_at: input.expiresAt === undefined ? undefined : nullableString(input.expiresAt),
  });
}

function documentActivityMutation(scope: TenantScope, input: DocumentActivityInput) {
  return {
    organization_id: scope.organizationId,
    document_id: input.documentId,
    actor_user_id: scope.userId,
    action: input.action,
    metadata: input.metadata ?? {},
  };
}

function articleMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    id: optionalId(input.id),
    organization_id: scope.organizationId,
    title: nullableString(input.title),
    body_markdown: nullableString(input.bodyMarkdown),
    summary: nullableString(input.summary),
    status: input.status ?? "draft",
    category_id: nullableString(input.categoryId),
    author_user_id: nullableString(input.authorUserId) ?? scope.userId,
    tags: stringArray(input.tags),
    published_at: nullableString(input.publishedAt),
    archived_at: nullableString(input.archivedAt),
  });
}

function articleUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    title: input.title === undefined ? undefined : nullableString(input.title),
    body_markdown: input.bodyMarkdown === undefined ? undefined : nullableString(input.bodyMarkdown),
    summary: input.summary === undefined ? undefined : nullableString(input.summary),
    status: input.status,
    category_id: input.categoryId === undefined ? undefined : nullableString(input.categoryId),
    author_user_id: input.authorUserId === undefined ? undefined : nullableString(input.authorUserId),
    tags: input.tags === undefined ? undefined : stringArray(input.tags),
    published_at: input.publishedAt === undefined ? undefined : nullableString(input.publishedAt),
    archived_at: input.archivedAt === undefined ? undefined : nullableString(input.archivedAt),
  });
}

function projectMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    organization_id: scope.organizationId,
    program_id: nullableString(input.programId),
    name: nullableString(input.name),
    description: nullableString(input.description),
    owner_id: nullableString(input.ownerId),
    progress: typeof input.progress === "number" ? input.progress : undefined,
    risk_level: input.riskLevel,
    priority: input.priority,
    status: projectStatusForDatabase(input.status),
    start_date: nullableString(input.startDate),
    due_date: nullableString(input.dueDate),
    tags: stringArray(input.tags),
    created_by_user_id: scope.userId,
    owner_role: scope.role,
  });
}

function projectUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    program_id: input.programId === undefined ? undefined : nullableString(input.programId),
    name: input.name === undefined ? undefined : nullableString(input.name),
    description: input.description === undefined ? undefined : nullableString(input.description),
    owner_id: input.ownerId === undefined ? undefined : nullableString(input.ownerId),
    progress: typeof input.progress === "number" ? input.progress : undefined,
    risk_level: input.riskLevel,
    priority: input.priority,
    status: input.status === undefined ? undefined : projectStatusForDatabase(input.status),
    start_date: input.startDate === undefined ? undefined : nullableString(input.startDate),
    due_date: input.dueDate === undefined ? undefined : nullableString(input.dueDate),
    tags: input.tags === undefined ? undefined : stringArray(input.tags),
  });
}

function taskMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    organization_id: scope.organizationId,
    program_id: nullableString(input.programId),
    project_id: nullableString(input.projectId),
    title: nullableString(input.title),
    description: nullableString(input.description),
    assignee_id: nullableString(input.assigneeId),
    priority: input.priority,
    status: input.status,
    due_date: nullableString(input.dueDate),
    tags: stringArray(input.tags),
    created_by_user_id: scope.userId,
    owner_role: scope.role,
  });
}

function taskUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    program_id: input.programId === undefined ? undefined : nullableString(input.programId),
    project_id: input.projectId === undefined ? undefined : nullableString(input.projectId),
    title: input.title === undefined ? undefined : nullableString(input.title),
    description: input.description === undefined ? undefined : nullableString(input.description),
    assignee_id: input.assigneeId === undefined ? undefined : nullableString(input.assigneeId),
    priority: input.priority,
    status: input.status,
    due_date: input.dueDate === undefined ? undefined : nullableString(input.dueDate),
    tags: input.tags === undefined ? undefined : stringArray(input.tags),
  });
}

function meetingMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    organization_id: scope.organizationId,
    project_id: nullableString(input.projectId),
    program_id: nullableString(input.programId),
    stakeholder_id: nullableString(input.stakeholderId),
    title: nullableString(input.title),
    starts_at: nullableString(input.startsAt),
    ends_at: nullableString(input.endsAt),
    attendee_ids: stringArray(input.attendeeIds),
    agenda: nullableString(input.agenda),
    notes: nullableString(input.notes),
    decisions: stringArray(input.decisions),
    action_items: stringArray(input.actionItems),
    status: input.status,
    created_by_user_id: scope.userId,
    owner_role: scope.role,
  });
}

function meetingUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    project_id: input.projectId === undefined ? undefined : nullableString(input.projectId),
    program_id: input.programId === undefined ? undefined : nullableString(input.programId),
    stakeholder_id: input.stakeholderId === undefined ? undefined : nullableString(input.stakeholderId),
    title: input.title === undefined ? undefined : nullableString(input.title),
    starts_at: input.startsAt === undefined ? undefined : nullableString(input.startsAt),
    ends_at: input.endsAt === undefined ? undefined : nullableString(input.endsAt),
    attendee_ids: input.attendeeIds === undefined ? undefined : stringArray(input.attendeeIds),
    agenda: input.agenda === undefined ? undefined : nullableString(input.agenda),
    notes: input.notes === undefined ? undefined : nullableString(input.notes),
    decisions: input.decisions === undefined ? undefined : stringArray(input.decisions),
    action_items: input.actionItems === undefined ? undefined : stringArray(input.actionItems),
    status: input.status,
  });
}

function notificationMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    organization_id: scope.organizationId,
    user_id: nullableString(input.userId) ?? scope.userId,
    type: input.type ?? "system",
    title: nullableString(input.title),
    body: nullableString(input.body),
    resource_type: nullableString(input.resourceType),
    resource_id: nullableString(input.resourceId),
    created_by_user_id: scope.userId,
    owner_role: scope.role,
  });
}

function notificationUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    type: input.type,
    title: input.title === undefined ? undefined : nullableString(input.title),
    body: input.body === undefined ? undefined : nullableString(input.body),
    resource_type: input.resourceType === undefined ? undefined : nullableString(input.resourceType),
    resource_id: input.resourceId === undefined ? undefined : nullableString(input.resourceId),
    read_at: input.readAt === undefined ? undefined : input.readAt,
  });
}

function userUpdateMutation(_scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    display_name: input.displayName === undefined ? undefined : nullableString(input.displayName),
    avatar_initials: input.avatarInitials === undefined ? undefined : nullableString(input.avatarInitials),
    department_name: input.department === undefined ? undefined : nullableString(input.department),
    title: input.title === undefined ? undefined : nullableString(input.title),
    timezone: input.timezone === undefined ? undefined : nullableString(input.timezone),
    role: input.role,
    status: input.status,
  });
}

function betaFeedbackMutation(scope: TenantScope, input: CreateBetaFeedbackInput) {
  return {
    organization_id: scope.organizationId,
    user_id: input.userId ?? scope.userId,
    feedback_type: input.feedbackType,
    module: input.module,
    rating: input.rating,
    message: input.message,
    permission_to_contact: input.permissionToContact,
    status: "new",
    metadata: input.metadata ?? {},
  };
}

const organizationConfig: ResourceConfig<OrganizationRow, Organization> = {
  table: "organizations",
  select: "id,name,slug,sector,created_at,updated_at",
  searchColumns: ["name", "slug"],
  defaultOrder: "name.asc",
  map: (row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sector: row.sector,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
};

const userConfig: ResourceConfig<UserRow, User> = {
  table: "users",
  select: "id,organization_id,email,display_name,avatar_initials,role,status,department_name,title,timezone,created_at,updated_at",
  searchColumns: ["email", "display_name"],
  defaultOrder: "display_name.asc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    displayName: row.display_name,
    avatarInitials: row.avatar_initials,
    role: normalizeRole(row.role),
    roleIds: [],
    department: row.department_name ?? undefined,
    title: row.title ?? undefined,
    timezone: row.timezone ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
  toUpdate: userUpdateMutation,
};

const programConfig: ResourceConfig<ProgramRow, Program> = {
  table: "programs",
  select: "id,organization_id,name,owner_id,status,start_date,end_date",
  searchColumns: ["name"],
  defaultOrder: "name.asc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    ownerId: row.owner_id ?? "",
    status: programStatus(row.status),
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
  }),
};

const projectConfig: ResourceConfig<ProjectRow, Project> = {
  table: "projects",
  select: "id,organization_id,program_id,name,description,owner_id,progress,risk_level,priority,status,start_date,due_date,tags",
  searchColumns: ["name", "description"],
  defaultOrder: "due_date.asc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    programId: row.program_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    ownerId: row.owner_id ?? "",
    progress: Number(row.progress),
    riskLevel: row.risk_level,
    priority: row.priority ?? row.risk_level,
    status: projectStatus(row.status),
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    tags: row.tags ?? [],
  }),
  toInsert: projectMutation,
  toUpdate: projectUpdateMutation,
};

const taskConfig: ResourceConfig<TaskRow, Task> = {
  table: "tasks",
  select: "id,organization_id,program_id,project_id,title,description,assignee_id,priority,status,due_date,tags",
  searchColumns: ["title", "description"],
  defaultOrder: "due_date.asc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    programId: row.program_id ?? undefined,
    projectId: row.project_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    priority: row.priority,
    status: taskStatus(row.status),
    dueDate: row.due_date ?? undefined,
    tags: row.tags ?? [],
  }),
  toInsert: taskMutation,
  toUpdate: taskUpdateMutation,
};

const documentConfig: ResourceConfig<DocumentRow, Document> = {
  table: "documents",
  select: "id,organization_id,project_id,category_id,name,title,description,storage_path,file_name,file_size,mime_type,document_type,status,visibility,classification,owner_user_id,created_by_user_id,updated_by_user_id,current_version,tags,created_at,updated_at,archived_at,deleted_at,category:document_categories(name)",
  searchColumns: ["name", "title", "description", "file_name", "mime_type"],
  defaultOrder: "updated_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    categoryName: row.category?.name ?? undefined,
    name: row.name,
    title: row.title ?? row.name,
    description: row.description ?? undefined,
    storagePath: row.storage_path,
    fileName: row.file_name ?? row.name,
    fileSize: row.file_size === null ? undefined : Number(row.file_size),
    mimeType: row.mime_type,
    documentType: row.document_type ?? "unknown",
    status: row.status ?? "active",
    visibility: row.visibility ?? "organization",
    classification: row.classification ?? "internal",
    ownerId: row.owner_user_id ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    updatedByUserId: row.updated_by_user_id ?? undefined,
    currentVersion: row.current_version === null ? undefined : Number(row.current_version),
    tags: row.tags ?? [],
    isFavorite: Boolean(row.is_favorite),
    lastViewedAt: row.last_viewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  }),
  toInsert: documentMutation,
  toUpdate: documentUpdateMutation,
};

const documentVersionConfig: ResourceConfig<DocumentVersionRow, DocumentVersion> = {
  table: "document_versions",
  select: "id,organization_id,document_id,version_number,file_name,file_size,mime_type,storage_path,checksum,created_by_user_id,created_at",
  searchColumns: ["file_name", "mime_type"],
  defaultOrder: "created_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    documentId: row.document_id,
    versionNumber: Number(row.version_number),
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    checksum: row.checksum ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    createdAt: row.created_at,
  }),
  toInsert: documentVersionMutation,
};

const documentCategoryConfig: ResourceConfig<DocumentCategoryRow, DocumentCategory> = {
  table: "document_categories",
  select: "id,organization_id,name,slug,description,parent_id,created_at,updated_at",
  searchColumns: ["name", "slug", "description"],
  defaultOrder: "name.asc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    parentId: row.parent_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
  toInsert: categoryMutation,
  toUpdate: categoryUpdateMutation,
};

const documentTagConfig: ResourceConfig<DocumentTagRow, DocumentTag> = {
  table: "document_tags",
  select: "id,organization_id,name,color,created_at,updated_at",
  searchColumns: ["name"],
  defaultOrder: "name.asc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
  toInsert: tagMutation,
  toUpdate: tagUpdateMutation,
};

const documentPermissionConfig: ResourceConfig<DocumentPermissionRow, DocumentPermission> = {
  table: "document_permissions",
  select: "id,organization_id,document_id,principal_type,principal_id,access_level,created_by_user_id,expires_at,created_at",
  searchColumns: ["principal_type", "access_level"],
  defaultOrder: "created_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    documentId: row.document_id,
    principalType: row.principal_type,
    principalId: row.principal_id ?? undefined,
    accessLevel: row.access_level,
    createdByUserId: row.created_by_user_id ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  }),
  toInsert: documentPermissionMutation,
  toUpdate: documentPermissionUpdateMutation,
};

const documentActivityConfig: ResourceConfig<DocumentActivityRow, DocumentActivity> = {
  table: "document_activity",
  select: "id,organization_id,document_id,actor_user_id,action,metadata,created_at",
  searchColumns: ["action"],
  defaultOrder: "created_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    documentId: row.document_id,
    actorUserId: row.actor_user_id ?? undefined,
    action: row.action,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }),
};

const knowledgeArticleConfig: ResourceConfig<KnowledgeArticleRow, KnowledgeArticle> = {
  table: "knowledge_articles",
  select: "id,organization_id,title,body_markdown,summary,status,category_id,author_user_id,tags,published_at,archived_at,created_at,updated_at,category:document_categories(name)",
  searchColumns: ["title", "body_markdown", "summary"],
  defaultOrder: "updated_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    summary: row.summary ?? undefined,
    status: row.status,
    categoryId: row.category_id ?? undefined,
    categoryName: row.category?.name ?? undefined,
    authorUserId: row.author_user_id ?? "",
    tags: row.tags ?? [],
    isFavorite: Boolean(row.is_favorite),
    lastViewedAt: row.last_viewed_at ?? undefined,
    publishedAt: row.published_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
  toInsert: articleMutation,
  toUpdate: articleUpdateMutation,
};

const meetingConfig: ResourceConfig<MeetingRow, Meeting> = {
  table: "meetings",
  select: "id,organization_id,project_id,program_id,stakeholder_id,title,starts_at,ends_at,attendee_ids,agenda,notes,decisions,action_items,status",
  searchColumns: ["title"],
  defaultOrder: "starts_at.asc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    programId: row.program_id ?? undefined,
    stakeholderId: row.stakeholder_id ?? undefined,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    attendeeIds: row.attendee_ids ?? [],
    agenda: row.agenda ?? undefined,
    notes: row.notes ?? undefined,
    decisions: row.decisions ?? [],
    actionItems: row.action_items ?? [],
    status: row.status,
  }),
  toInsert: meetingMutation,
  toUpdate: meetingUpdateMutation,
};

const notificationConfig: ResourceConfig<NotificationRow, Notification> = {
  table: "notifications",
  select: "id,organization_id,user_id,type,title,body,resource_type,resource_id,read_at,created_at",
  searchColumns: ["title", "body"],
  defaultOrder: "created_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    type: row.type ?? "system",
    title: row.title,
    body: row.body,
    resourceType: row.resource_type ?? undefined,
    resourceId: row.resource_id ?? undefined,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  }),
  toInsert: notificationMutation,
  toUpdate: notificationUpdateMutation,
};

const invitationConfig: ResourceConfig<InvitationRow, Invitation> = {
  table: "invitations",
  select: "id,organization_id,email,role,invited_by_user_id,status,expires_at,accepted_at,created_at,updated_at",
  searchColumns: ["email"],
  defaultOrder: "created_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: normalizeRole(row.role),
    invitedByUserId: row.invited_by_user_id ?? undefined,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
};

const auditLogConfig: ResourceConfig<AuditLogRow, AuditLog> = {
  table: "audit_logs",
  select: "id,organization_id,actor_user_id,actor_role,action,resource_type,resource_id,category,request_id,metadata,created_at",
  searchColumns: ["action", "resource_type", "category"],
  defaultOrder: "created_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    actorUserId: row.actor_user_id ?? undefined,
    actorRole: row.actor_role ? normalizeRole(row.actor_role) : undefined,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id ?? undefined,
    category: row.category ?? undefined,
    requestId: row.request_id ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }),
};

const betaFeedbackConfig: ResourceConfig<BetaFeedbackRow, BetaFeedback> = {
  table: "beta_feedback",
  select: "id,organization_id,user_id,feedback_type,module,rating,message,permission_to_contact,status,metadata,created_at",
  searchColumns: ["feedback_type", "module", "status"],
  defaultOrder: "created_at.desc",
  map: (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    feedbackType: row.feedback_type,
    module: row.module,
    rating: row.rating,
    message: row.message,
    permissionToContact: row.permission_to_contact,
    status: row.status,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }),
};

function createTenantRepository<TRow, TResource extends { id: EntityId; organizationId: EntityId }>(
  resource: ResourceName,
  config: ResourceConfig<TRow, TResource>,
): TenantRepository<TResource> {
  return {
    list: (scope, query) => listResource(resource, config, scope, query),
    getById: (scope, id) => getResourceById(resource, config, scope, id),
  };
}

function createMutableTenantRepository<TRow, TResource extends { id: EntityId; organizationId: EntityId }>(
  resource: ResourceName,
  config: ResourceConfig<TRow, TResource>,
): MutableTenantRepository<TResource> {
  return {
    list: (scope, query) => listResource(resource, config, scope, query),
    getById: (scope, id) => getResourceById(resource, config, scope, id),
    create: (scope, input) => createResource(resource, config, scope, input),
    update: (scope, id, input) => updateResource(resource, config, scope, id, input),
  };
}

export const organizationsRepository: OrganizationsRepository = {
  list: (scope, query) => listResource("organizations", organizationConfig, scope, query),
  getById: (scope, id) => getResourceById("organizations", organizationConfig, scope, id),
};

export const usersRepository: UsersRepository = {
  listByOrganization: (scope, query) => listResource("users", userConfig, scope, query),
  getById: (scope, id) => getResourceById("users", userConfig, scope, id),
  update: (scope, id, input) => updateResource("users", userConfig, scope, id, input),
};

export const programsRepository: ProgramsRepository = createTenantRepository("programs", programConfig);
export const projectsRepository: ProjectsRepository = createMutableTenantRepository("projects", projectConfig);
export const tasksRepository: TasksRepository = createMutableTenantRepository("tasks", taskConfig);
const baseDocumentsRepository = createMutableTenantRepository("documents", documentConfig);
export const documentVersionsRepository: DocumentVersionsRepository = createMutableTenantRepository("document_versions", documentVersionConfig);
export const documentCategoriesRepository: DocumentCategoriesRepository = createMutableTenantRepository("document_categories", documentCategoryConfig);
export const documentTagsRepository: DocumentTagsRepository = createMutableTenantRepository("document_tags", documentTagConfig);
export const documentPermissionsRepository: DocumentPermissionsRepository = createMutableTenantRepository("document_permissions", documentPermissionConfig);
export const documentActivityRepository: DocumentActivityRepository = createTenantRepository("document_activity", documentActivityConfig);
export const knowledgeArticlesRepository: KnowledgeArticlesRepository = createMutableTenantRepository("knowledge_articles", knowledgeArticleConfig);
export const meetingsRepository: MeetingsRepository = createMutableTenantRepository("meetings", meetingConfig);
export const notificationsRepository: NotificationsRepository = createMutableTenantRepository("notifications", notificationConfig);

export const documentsRepository: DocumentsRepository = {
  ...baseDocumentsRepository,
  archive(scope, id) {
    return baseDocumentsRepository.update(scope, id, { status: "archived", archivedAt: new Date().toISOString() });
  },
  restore(scope, id) {
    return baseDocumentsRepository.update(scope, id, { status: "active", archivedAt: undefined, deletedAt: undefined });
  },
  softDelete(scope, id) {
    return baseDocumentsRepository.update(scope, id, { status: "deleted", deletedAt: new Date().toISOString() });
  },
  async listArchived(scope, query) {
    const documents = await baseDocumentsRepository.list(scope, query);
    return documents.filter((document) => document.status === "archived");
  },
  async listFavorites(scope, query) {
    const documents = await baseDocumentsRepository.list(scope, query);
    return documents.filter((document) => document.isFavorite);
  },
  async listSharedWithMe(scope, query) {
    const documents = await baseDocumentsRepository.list(scope, query);
    return documents.filter((document) => document.visibility === "shared");
  },
  async recordActivity(scope, input) {
    if (!scope.accessToken) {
      return gatewayMutation<DocumentActivity>("document_activity", "POST", input as unknown as Record<string, unknown>);
    }

    const rows = await supabaseRest<DocumentActivityRow[]>("document_activity", {
      method: "POST",
      accessToken: scope.accessToken,
      body: documentActivityMutation(scope, input),
    });

    return rows[0] ? documentActivityConfig.map(rows[0]) : undefined;
  },
};

export const knowledgeSearchRepository: KnowledgeSearchRepository = {
  async search(scope, query) {
    const [documents, articles] = await Promise.all([
      query.scope === "articles" ? Promise.resolve([]) : documentsRepository.list(scope, query),
      query.scope === "documents" || query.scope === "shared" || query.scope === "archived" ? Promise.resolve([]) : knowledgeArticlesRepository.list(scope, query),
    ]);

    const normalized = (query.search ?? "").trim().toLowerCase();
    const tag = query.tag?.toLowerCase();

    const documentResults = documents
      .filter((document) => {
        if (query.scope === "archived" && document.status !== "archived") return false;
        if (query.scope === "favorites" && !document.isFavorite) return false;
        if (query.scope === "shared" && document.visibility !== "shared") return false;
        if (query.categoryId && document.categoryId !== query.categoryId) return false;
        if (tag && !(document.tags ?? []).some((item) => item.toLowerCase() === tag)) return false;
        if (!normalized) return true;
        return [
          document.name,
          document.title,
          document.description,
          document.fileName,
          document.categoryName,
          ...(document.tags ?? []),
        ].some((value) => value?.toLowerCase().includes(normalized));
      })
      .map((item): KnowledgeSearchResult => ({ type: "document", item }));

    const articleResults = articles
      .filter((article) => {
        if (query.scope === "archived" && article.status !== "archived") return false;
        if (query.scope === "favorites" && !article.isFavorite) return false;
        if (query.categoryId && article.categoryId !== query.categoryId) return false;
        if (tag && !article.tags.some((item) => item.toLowerCase() === tag)) return false;
        if (!normalized) return true;
        return [
          article.title,
          article.summary,
          article.bodyMarkdown,
          article.categoryName,
          ...article.tags,
        ].some((value) => value?.toLowerCase().includes(normalized));
      })
      .map((item): KnowledgeSearchResult => ({ type: "article", item }));

    return [...documentResults, ...articleResults];
  },
};

export const invitationsRepository: InvitationsRepository = {
  async create(scope, input) {
    if (!scope.accessToken) {
      const response = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Invitation gateway request failed.");
      return await response.json() as Invitation;
    }

    const rows = await supabaseRest<InvitationRow[]>("invitations", {
      method: "POST",
      accessToken: scope.accessToken,
      body: {
        // Always the acting session's own organization, never input.organizationId -- see
        // canManageOrganization in src/security/rbac.ts. The caller (POST /api/invitations)
        // already enforces this too, but the repository must not depend solely on that.
        organization_id: scope.organizationId,
        email: input.email,
        role: input.role,
        invited_by_user_id: input.invitedByUserId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt,
        status: "pending",
      },
    });

    if (!rows[0]) throw new Error("Invitation was not returned by Supabase.");
    return invitationConfig.map(rows[0]);
  },
  async listPending(scope, query) {
    const rows = await listResource("invitations", invitationConfig, scope, query);
    return rows.filter((invitation) => invitation.status === "pending");
  },
};

export const auditLogsRepository: AuditLogsRepository = {
  list: (scope, query) => listResource("audit_logs", auditLogConfig, scope, query),
  async record(scope, input) {
    if (!scope.accessToken) {
      const response = await fetch("/api/audit-logs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) return undefined;
      return await response.json() as AuditLog;
    }

    const rows = await supabaseRest<AuditLogRow[]>("audit_logs", {
      method: "POST",
      accessToken: scope.accessToken,
      body: {
        organization_id: scope.organizationId,
        actor_user_id: scope.userId,
        actor_role: scope.role as RoleName,
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        category: input.category,
        request_id: input.requestId,
        metadata: input.metadata ?? {},
      },
    });

    return rows[0] ? auditLogConfig.map(rows[0]) : undefined;
  },
};

export const betaFeedbackRepository: BetaFeedbackRepository = {
  list: (scope, query) => {
    if (!scope.accessToken) return gatewayBetaFeedback<BetaFeedback[]>("GET", undefined, query);
    return listResource("beta_feedback", betaFeedbackConfig, scope, query);
  },
  async create(scope, input) {
    if (!scope.accessToken) return gatewayBetaFeedback<BetaFeedback>("POST", input as Record<string, unknown>);

    const rows = await supabaseRest<BetaFeedbackRow[]>("beta_feedback", {
      method: "POST",
      accessToken: scope.accessToken,
      body: betaFeedbackMutation(scope, input),
    });

    if (!rows[0]) throw new Error("Beta feedback was not returned by Supabase.");
    return betaFeedbackConfig.map(rows[0]);
  },
  async count(scope) {
    const rows = await betaFeedbackRepository.list(scope, { pageSize: 100 });
    return rows.length;
  },
};

export async function listRepositoryResource(resource: ResourceName, scope: TenantScope, query?: RepositoryQuery, id?: EntityId) {
  if (id) {
    const item = await resourceRepositories[resource].getById(scope, id);
    return item ? [item] : [];
  }

  return resourceRepositories[resource].list(scope, query);
}

type RepositoryRuntime = {
  list(scope: TenantScope, query?: RepositoryQuery): Promise<unknown[]>;
  getById(scope: TenantScope, id: EntityId): Promise<unknown | undefined>;
  create?(scope: TenantScope, input: Record<string, unknown>): Promise<unknown>;
  update?(scope: TenantScope, id: EntityId, input: Record<string, unknown>): Promise<unknown>;
};

export async function createRepositoryResource(resource: ResourceName, scope: TenantScope, input: Record<string, unknown>) {
  const repository = resourceRepositories[resource] as RepositoryRuntime;
  if (!repository.create) {
    throw new Error(`Repository ${resource} does not support create.`);
  }

  return repository.create(scope, input);
}

export async function updateRepositoryResource(resource: ResourceName, scope: TenantScope, id: EntityId, input: Record<string, unknown>) {
  const repository = resourceRepositories[resource] as RepositoryRuntime;
  if (!repository.update) {
    throw new Error(`Repository ${resource} does not support update.`);
  }

  return repository.update(scope, id, input);
}

export const resourceRepositories = {
  organizations: organizationsRepository,
  users: { list: usersRepository.listByOrganization, getById: usersRepository.getById, update: usersRepository.update },
  programs: programsRepository,
  projects: projectsRepository,
  tasks: tasksRepository,
  documents: documentsRepository,
  document_versions: documentVersionsRepository,
  document_categories: documentCategoriesRepository,
  document_tags: documentTagsRepository,
  document_permissions: documentPermissionsRepository,
  document_activity: { ...documentActivityRepository, create: documentsRepository.recordActivity },
  knowledge_articles: knowledgeArticlesRepository,
  meetings: meetingsRepository,
  notifications: notificationsRepository,
  audit_logs: { list: auditLogsRepository.list, getById: async () => undefined },
  invitations: { list: invitationsRepository.listPending, getById: async () => undefined },
  beta_feedback: { list: betaFeedbackRepository.list, getById: async () => undefined, create: betaFeedbackRepository.create },
} satisfies Record<ResourceName, {
  list(scope: TenantScope, query?: RepositoryQuery): Promise<unknown[]>;
  getById(scope: TenantScope, id: EntityId): Promise<unknown | undefined>;
  create?(scope: TenantScope, input: Record<string, unknown>): Promise<unknown>;
  update?(scope: TenantScope, id: EntityId, input: Record<string, unknown>): Promise<unknown>;
}>;

export function ownerInitialsForProject(project: Project, users: User[]) {
  return users.find((user) => user.id === project.ownerId)?.avatarInitials ?? "AU";
}

export function projectDepartment(project: Project, programs: Program[]) {
  return programs.find((program) => program.id === project.programId)?.name ?? "Enterprise Portfolio";
}
