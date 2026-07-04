import type {
  AuditLog,
  BetaFeedback,
  Document,
  DocumentActivity,
  DocumentCategory,
  DocumentPermission,
  DocumentTag,
  DocumentVersion,
  Invitation,
  KnowledgeArticle,
  Meeting,
  Notification,
  Program,
  Project,
  Task,
} from "../domain";
import type {
  AuditLogInput,
  AuditLogsRepository,
  BetaFeedbackRepository,
  CreateBetaFeedbackInput,
  CreateInvitationInput,
  DocumentActivityInput,
  DocumentActivityRepository,
  DocumentCategoriesRepository,
  DocumentPermissionsRepository,
  DocumentsRepository,
  DocumentTagsRepository,
  DocumentVersionsRepository,
  InstitutionalRepository,
  InvitationsRepository,
  KnowledgeArticlesRepository,
  KnowledgeSearchQuery,
  KnowledgeSearchRepository,
  MeetingsRepository,
  MutableTenantRepository,
  NotificationsRepository,
  OrganizationsRepository,
  ProgramsRepository,
  ProjectsRepository,
  RepositoryQuery,
  StorageRepository,
  TasksRepository,
  TenantCreateInput,
  TenantRepository,
  TenantScope,
  UsersRepository,
} from "../repositories/interfaces";
import { createDemoDataset, type DemoDataset } from "./demoDataset";
import { demoResetEvent } from "./demoMode";

let store: DemoDataset = createDemoDataset();

export function resetDemoRepositoryStore() {
  store = createDemoDataset();
}

if (typeof window !== "undefined") {
  window.addEventListener(demoResetEvent, resetDemoRepositoryStore);
}

function now() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nextId(prefix: string, rows: { id: string }[]) {
  return `${prefix}_${String(rows.length + 1).padStart(4, "0")}`;
}

function matchesSearch(row: unknown, search?: string) {
  if (!search?.trim()) return true;
  return JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase());
}

function paginate<T>(rows: T[], query?: RepositoryQuery) {
  const pageSize = query?.pageSize ?? rows.length;
  const page = query?.page ?? 1;
  const start = Math.max(0, (page - 1) * pageSize);
  return rows.slice(start, start + pageSize);
}

function scoped<T extends { organizationId: string }>(rows: T[], scope: TenantScope, query?: RepositoryQuery) {
  return paginate(rows.filter((row) => row.organizationId === scope.organizationId && matchesSearch(row, query?.search)), query);
}

function collection<K extends keyof DemoDataset>(key: K) {
  return store[key];
}

function setCollection<K extends keyof DemoDataset>(key: K, rows: DemoDataset[K]) {
  store = { ...store, [key]: rows };
}

function mutableRepository<
  K extends keyof DemoDataset,
  TResource extends { id: string; organizationId: string },
>(
  key: K,
  idPrefix: string,
  defaults: (scope: TenantScope, input: TenantCreateInput<TResource>) => Partial<TResource> = () => ({}),
): MutableTenantRepository<TResource> {
  const rows = () => collection(key) as unknown as TResource[];
  const setRows = (nextRows: TResource[]) => setCollection(key, nextRows as unknown as DemoDataset[K]);

  return {
    async list(scope, query) {
      return clone(scoped(rows(), scope, query));
    },
    async getById(scope, id) {
      return clone(rows().find((row) => row.organizationId === scope.organizationId && row.id === id));
    },
    async create(scope, input) {
      const current = rows();
      const created = {
        ...defaults(scope, input),
        ...input,
        id: input.id ?? nextId(idPrefix, current),
        organizationId: input.organizationId ?? scope.organizationId,
      } as TResource;
      setRows([created, ...current]);
      return clone(created);
    },
    async update(scope, id, input) {
      const current = rows();
      const existing = current.find((row) => row.organizationId === scope.organizationId && row.id === id);
      if (!existing) throw new Error(`Demo record not found: ${id}`);
      const updated = { ...existing, ...input, id, organizationId: existing.organizationId } as TResource;
      setRows(current.map((row) => row.id === id ? updated : row));
      return clone(updated);
    },
  };
}

function readonlyRepository<K extends keyof DemoDataset, TResource extends { id: string; organizationId: string }>(key: K): TenantRepository<TResource> {
  const rows = () => collection(key) as unknown as TResource[];
  return {
    async list(scope, query) {
      return clone(scoped(rows(), scope, query));
    },
    async getById(scope, id) {
      return clone(rows().find((row) => row.organizationId === scope.organizationId && row.id === id));
    },
  };
}

const baseDocumentsRepository = mutableRepository<"documents", Document>("documents", "document_demo", (scope, input) => ({
  storagePath: input.storagePath ?? `organizations/${scope.organizationId}/documents/${crypto.randomUUID()}`,
  mimeType: input.mimeType ?? "application/octet-stream",
  status: input.status ?? "active",
  visibility: input.visibility ?? "organization",
  createdAt: input.createdAt ?? now(),
  updatedAt: input.updatedAt ?? now(),
}));

export const demoInstitutionalRepository: InstitutionalRepository = {
  getAiMessages: () => clone(store.institutional.aiMessages),
  getApprovals: () => clone(store.institutional.approvals),
  getDocuments: () => clone(store.institutional.documents),
  getIntegrations: () => clone(store.institutional.integrations),
  getMeetings: () => clone(store.institutional.meetings),
  getOkrData: () => clone(store.institutional.okrData),
  getPerformanceData: () => clone(store.institutional.performanceData),
  getProjects: () => clone(store.institutional.projects),
  getStakeholders: () => clone(store.institutional.stakeholders),
  getTasks: () => clone(store.institutional.tasks),
  getWorkloadData: () => clone(store.institutional.workloadData),
};

export const demoOrganizationsRepository: OrganizationsRepository = {
  async list(scope, query) {
    return clone(paginate(store.organizations.filter((row) => row.id === scope.organizationId && matchesSearch(row, query?.search)), query));
  },
  async getById(scope, id) {
    return clone(store.organizations.find((row) => row.id === scope.organizationId && row.id === id));
  },
};

export const demoUsersRepository: UsersRepository = {
  async listByOrganization(scope, query) {
    return clone(scoped(store.users, scope, query));
  },
  async getById(scope, id) {
    return clone(store.users.find((row) => row.organizationId === scope.organizationId && row.id === id));
  },
  async update(scope, id, input) {
    const existing = store.users.find((row) => row.organizationId === scope.organizationId && row.id === id);
    if (!existing) throw new Error(`Demo user not found: ${id}`);
    const updated = { ...existing, ...input, id, organizationId: existing.organizationId, updatedAt: now() };
    store = { ...store, users: store.users.map((row) => row.id === id ? updated : row) };
    return clone(updated);
  },
};

export const demoProgramsRepository: ProgramsRepository = readonlyRepository<"programs", Program>("programs");

export const demoProjectsRepository: ProjectsRepository = mutableRepository<"projects", Project>("projects", "project_demo", (scope, input) => ({
  ownerId: input.ownerId ?? scope.userId,
  progress: input.progress ?? 0,
  riskLevel: input.riskLevel ?? "low",
  priority: input.priority ?? "medium",
  status: input.status ?? "planning",
  tags: input.tags ?? [],
}));

export const demoTasksRepository: TasksRepository = mutableRepository<"tasks", Task>("tasks", "task_demo", () => ({
  priority: "medium",
  status: "pending",
  tags: [],
}));

export const demoMeetingsRepository: MeetingsRepository = mutableRepository<"meetings", Meeting>("meetings", "meeting_demo", () => ({
  startsAt: now(),
  attendeeIds: [],
  decisions: [],
  actionItems: [],
  status: "scheduled",
}));

export const demoNotificationsRepository: NotificationsRepository = mutableRepository<"notifications", Notification>("notifications", "notification_demo", (scope) => ({
  userId: scope.userId,
  type: "system",
  title: "Demo notification",
  body: "Investor preview activity.",
  createdAt: now(),
}));

export const demoDocumentVersionsRepository: DocumentVersionsRepository = mutableRepository<"documentVersions", DocumentVersion>("documentVersions", "document_version_demo", () => ({
  versionNumber: 1,
  fileName: "demo-document.pdf",
  fileSize: 0,
  mimeType: "application/octet-stream",
  storagePath: "demo",
  createdAt: now(),
}));

export const demoDocumentCategoriesRepository: DocumentCategoriesRepository = mutableRepository<"documentCategories", DocumentCategory>("documentCategories", "document_category_demo", (_scope, input) => ({
  slug: input.slug ?? input.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? "category",
  createdAt: input.createdAt ?? now(),
  updatedAt: input.updatedAt ?? now(),
}));

export const demoDocumentTagsRepository: DocumentTagsRepository = mutableRepository<"documentTags", DocumentTag>("documentTags", "document_tag_demo", (_scope, input) => ({
  createdAt: input.createdAt ?? now(),
  updatedAt: input.updatedAt ?? now(),
}));

export const demoDocumentPermissionsRepository: DocumentPermissionsRepository = mutableRepository<"documentPermissions", DocumentPermission>("documentPermissions", "document_permission_demo", () => ({
  principalType: "organization",
  accessLevel: "viewer",
  createdAt: now(),
}));

export const demoDocumentActivityRepository: DocumentActivityRepository = readonlyRepository<"documentActivity", DocumentActivity>("documentActivity");

export const demoKnowledgeArticlesRepository: KnowledgeArticlesRepository = mutableRepository<"knowledgeArticles", KnowledgeArticle>("knowledgeArticles", "knowledge_article_demo", (scope, input) => ({
  bodyMarkdown: input.bodyMarkdown ?? "",
  status: input.status ?? "draft",
  authorUserId: input.authorUserId ?? scope.userId,
  tags: input.tags ?? [],
  createdAt: input.createdAt ?? now(),
  updatedAt: input.updatedAt ?? now(),
}));

export const demoDocumentsRepository: DocumentsRepository = {
  ...baseDocumentsRepository,
  async archive(scope, id) {
    return baseDocumentsRepository.update(scope, id, { status: "archived", archivedAt: now() });
  },
  async restore(scope, id) {
    return baseDocumentsRepository.update(scope, id, { status: "active", archivedAt: undefined, deletedAt: undefined });
  },
  async softDelete(scope, id) {
    return baseDocumentsRepository.update(scope, id, { status: "deleted", deletedAt: now() });
  },
  async listArchived(scope, query) {
    return clone(scoped(store.documents, scope, query).filter((document) => document.status === "archived"));
  },
  async listFavorites(scope, query) {
    return clone(scoped(store.documents, scope, query).filter((document) => document.isFavorite));
  },
  async listSharedWithMe(scope, query) {
    return clone(scoped(store.documents, scope, query).filter((document) => document.visibility === "shared"));
  },
  async recordActivity(scope, input: DocumentActivityInput) {
    const activity: DocumentActivity = {
      id: nextId("document_activity_demo", store.documentActivity),
      organizationId: scope.organizationId,
      documentId: input.documentId,
      actorUserId: scope.userId,
      action: input.action,
      metadata: input.metadata ?? {},
      createdAt: now(),
    };
    store = { ...store, documentActivity: [activity, ...store.documentActivity] };
    return clone(activity);
  },
};

export const demoKnowledgeSearchRepository: KnowledgeSearchRepository = {
  async search(scope, query: KnowledgeSearchQuery) {
    const normalized = query.search?.trim().toLowerCase() ?? "";
    const documents = scoped(store.documents, scope, query)
      .filter(() => query.scope !== "articles")
      .filter((document) => !query.categoryId || document.categoryId === query.categoryId)
      .filter((document) => !query.tag || document.tags?.includes(query.tag))
      .filter((document) => !query.ownerId || document.ownerId === query.ownerId)
      .filter((document) => query.scope !== "favorites" || document.isFavorite)
      .filter((document) => query.scope !== "shared" || document.visibility === "shared")
      .filter((document) => query.scope !== "archived" || document.status === "archived")
      .filter((document) => !normalized || matchesSearch(document, normalized))
      .map((item) => ({ type: "document" as const, item, score: 0.93 }));

    const articles = scoped(store.knowledgeArticles, scope, query)
      .filter(() => query.scope !== "documents")
      .filter((article) => !query.categoryId || article.categoryId === query.categoryId)
      .filter((article) => !query.tag || article.tags.includes(query.tag))
      .filter((article) => !query.ownerId || article.authorUserId === query.ownerId)
      .filter((article) => query.scope !== "archived" || article.status === "archived")
      .filter((article) => !normalized || matchesSearch(article, normalized))
      .map((item) => ({ type: "article" as const, item, score: 0.88 }));

    return clone(paginate([...documents, ...articles], query));
  },
};

export const demoInvitationsRepository: InvitationsRepository = {
  async create(scope, input: CreateInvitationInput) {
    const invitation: Invitation = {
      id: nextId("invitation_demo", store.invitations),
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
      invitedByUserId: input.invitedByUserId ?? scope.userId,
      status: "pending",
      expiresAt: input.expiresAt,
      createdAt: now(),
      updatedAt: now(),
    };
    store = { ...store, invitations: [invitation, ...store.invitations] };
    return clone(invitation);
  },
  async listPending(scope, query) {
    return clone(scoped(store.invitations, scope, query).filter((invitation) => invitation.status === "pending"));
  },
};

export const demoAuditLogsRepository: AuditLogsRepository = {
  async list(scope, query) {
    return clone(scoped(store.auditLogs, scope, query));
  },
  async record(scope, input: AuditLogInput) {
    const user = store.users.find((row) => row.id === scope.userId);
    const auditLog: AuditLog = {
      id: nextId("audit_demo", store.auditLogs),
      organizationId: scope.organizationId,
      actorUserId: scope.userId,
      actorRole: scope.role,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      category: input.category,
      requestId: input.requestId,
      metadata: { ...input.metadata, actor: user?.displayName },
      createdAt: now(),
    };
    store = { ...store, auditLogs: [auditLog, ...store.auditLogs] };
    return clone(auditLog);
  },
};

export const demoBetaFeedbackRepository: BetaFeedbackRepository = {
  async list(scope, query) {
    return clone(scoped(store.betaFeedback, scope, query));
  },
  async create(scope, input: CreateBetaFeedbackInput) {
    const feedback: BetaFeedback = {
      id: nextId("beta_feedback_demo", store.betaFeedback),
      organizationId: input.organizationId ?? scope.organizationId,
      userId: input.userId ?? scope.userId,
      feedbackType: input.feedbackType,
      module: input.module,
      rating: input.rating,
      message: input.message,
      permissionToContact: input.permissionToContact,
      status: "new",
      metadata: input.metadata ?? {},
      createdAt: now(),
    };
    store = { ...store, betaFeedback: [feedback, ...store.betaFeedback] };
    return clone(feedback);
  },
  async count(scope) {
    return store.betaFeedback.filter((row) => row.organizationId === scope.organizationId).length;
  },
};

export const demoStorageRepository: StorageRepository = {
  async getSignedUploadUrl(path) {
    return `https://demo.axxess.local/storage/upload/${encodeURIComponent(path)}`;
  },
  async getSignedDownloadUrl(path) {
    return `https://demo.axxess.local/storage/download/${encodeURIComponent(path)}`;
  },
  async createDocumentUploadIntent(input) {
    return {
      bucket: "axxess-demo-documents",
      path: input.path,
      signedUrl: `https://demo.axxess.local/storage/upload/${encodeURIComponent(input.path)}`,
      expiresIn: input.expiresIn ?? 600,
    };
  },
  async createDocumentDownloadIntent(input) {
    return {
      bucket: "axxess-demo-documents",
      path: input.path,
      signedUrl: `https://demo.axxess.local/storage/download/${encodeURIComponent(input.path)}`,
      expiresIn: input.expiresIn ?? 600,
    };
  },
};

export const demoRepositories = {
  auditLogsRepository: demoAuditLogsRepository,
  betaFeedbackRepository: demoBetaFeedbackRepository,
  documentActivityRepository: demoDocumentActivityRepository,
  documentCategoriesRepository: demoDocumentCategoriesRepository,
  documentPermissionsRepository: demoDocumentPermissionsRepository,
  documentsRepository: demoDocumentsRepository,
  documentTagsRepository: demoDocumentTagsRepository,
  documentVersionsRepository: demoDocumentVersionsRepository,
  institutionalRepository: demoInstitutionalRepository,
  invitationsRepository: demoInvitationsRepository,
  knowledgeArticlesRepository: demoKnowledgeArticlesRepository,
  knowledgeSearchRepository: demoKnowledgeSearchRepository,
  meetingsRepository: demoMeetingsRepository,
  notificationsRepository: demoNotificationsRepository,
  organizationsRepository: demoOrganizationsRepository,
  programsRepository: demoProgramsRepository,
  projectsRepository: demoProjectsRepository,
  storageRepository: demoStorageRepository,
  tasksRepository: demoTasksRepository,
  usersRepository: demoUsersRepository,
};
