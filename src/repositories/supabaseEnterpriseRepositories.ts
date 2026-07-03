import type {
  AuditLog,
  EntityId,
  Invitation,
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
  InvitationsRepository,
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

export type ResourceName = "organizations" | "users" | "programs" | "projects" | "tasks" | "meetings" | "notifications" | "audit_logs" | "invitations";

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

function organizationIdForMutation(scope: TenantScope, input: Record<string, unknown>) {
  if (scope.role === "Super Admin" && typeof input.organizationId === "string") return input.organizationId;
  return scope.organizationId;
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

function projectMutation(scope: TenantScope, input: Record<string, unknown>) {
  return compactMutation({
    organization_id: organizationIdForMutation(scope, input),
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
    organization_id: organizationIdForMutation(scope, input),
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
    organization_id: organizationIdForMutation(scope, input),
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
    organization_id: organizationIdForMutation(scope, input),
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
    role: input.role,
    status: input.status,
  });
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
  select: "id,organization_id,email,display_name,avatar_initials,role,status,created_at,updated_at",
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
export const meetingsRepository: MeetingsRepository = createMutableTenantRepository("meetings", meetingConfig);
export const notificationsRepository: NotificationsRepository = createMutableTenantRepository("notifications", notificationConfig);

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
        organization_id: input.organizationId,
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
  meetings: meetingsRepository,
  notifications: notificationsRepository,
  audit_logs: { list: auditLogsRepository.list, getById: async () => undefined },
  invitations: { list: invitationsRepository.listPending, getById: async () => undefined },
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
