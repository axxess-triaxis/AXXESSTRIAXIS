import type {
  Document,
  DocumentActivity,
  DocumentCategory,
  DocumentPermission,
  DocumentTag,
  DocumentVersion,
  KnowledgeArticle,
  Meeting,
  Notification,
  Organization,
  Program,
  Project,
  Task,
  User,
} from "../domain";
import type {
  AuditLogsRepository,
  BetaFeedbackRepository,
  DocumentActivityRepository,
  DocumentCategoriesRepository,
  DocumentPermissionsRepository,
  DocumentsRepository,
  DocumentTagsRepository,
  DocumentVersionsRepository,
  InstitutionalRepository,
  InvitationsRepository,
  KnowledgeArticlesRepository,
  KnowledgeSearchRepository,
  MeetingsRepository,
  MutableTenantRepository,
  NotificationsRepository,
  OrganizationsRepository,
  ProgramsRepository,
  ProjectsRepository,
  StorageRepository,
  TasksRepository,
  TenantRepository,
  UsersRepository,
} from "../repositories/interfaces";
import { cleanTenantUserContext } from "./demoMode";

const cleanOrganization: Organization = {
  id: cleanTenantUserContext.organizationId,
  name: "New Organization",
  slug: "new-organization",
  sector: "enterprise",
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

const cleanUser: User = {
  id: cleanTenantUserContext.id,
  organizationId: cleanTenantUserContext.organizationId,
  email: cleanTenantUserContext.email ?? "admin@example.com",
  displayName: cleanTenantUserContext.displayName ?? "Workspace Admin",
  avatarInitials: cleanTenantUserContext.avatarInitials ?? "WA",
  role: cleanTenantUserContext.role,
  roleIds: [],
  status: "active",
  createdAt: cleanOrganization.createdAt,
  updatedAt: cleanOrganization.updatedAt,
};

function emptyReadonlyRepository<TResource extends { id: string; organizationId: string }>(): TenantRepository<TResource> {
  return {
    async list() {
      return [];
    },
    async getById() {
      return undefined;
    },
  };
}

function emptyMutableRepository<TResource extends { id: string; organizationId: string }>(resourceName: string): MutableTenantRepository<TResource> {
  return {
    ...emptyReadonlyRepository<TResource>(),
    async create() {
      throw new Error(`${resourceName} requires a connected data backend.`);
    },
    async update() {
      throw new Error(`${resourceName} requires a connected data backend.`);
    },
  };
}

const emptyInstitutionalRepository: InstitutionalRepository = {
  getAiMessages: () => [],
  getApprovals: () => [],
  getDocuments: () => [],
  getIntegrations: () => [],
  getMeetings: () => [],
  getOkrData: () => [],
  getPerformanceData: () => [],
  getProjects: () => [],
  getStakeholders: () => [],
  getTasks: () => [],
  getWorkloadData: () => [],
};

const emptyOrganizationsRepository: OrganizationsRepository = {
  async list(scope) {
    return scope.organizationId === cleanOrganization.id ? [cleanOrganization] : [];
  },
  async getById(scope, id) {
    return scope.organizationId === cleanOrganization.id && id === cleanOrganization.id ? cleanOrganization : undefined;
  },
};

const emptyUsersRepository: UsersRepository = {
  async listByOrganization(scope) {
    return scope.organizationId === cleanUser.organizationId ? [cleanUser] : [];
  },
  async getById(scope, id) {
    return scope.organizationId === cleanUser.organizationId && id === cleanUser.id ? cleanUser : undefined;
  },
  async update() {
    throw new Error("User administration requires a connected data backend.");
  },
};

const emptyDocumentsRepository: DocumentsRepository = {
  ...emptyMutableRepository<Document>("Documents"),
  async archive() {
    throw new Error("Documents require a connected data backend.");
  },
  async restore() {
    throw new Error("Documents require a connected data backend.");
  },
  async softDelete() {
    throw new Error("Documents require a connected data backend.");
  },
  async listArchived() {
    return [];
  },
  async listFavorites() {
    return [];
  },
  async listSharedWithMe() {
    return [];
  },
  async recordActivity() {
    return undefined;
  },
};

const emptyInvitationsRepository: InvitationsRepository = {
  async create() {
    throw new Error("Invitations require a connected data backend.");
  },
  async listPending() {
    return [];
  },
};

const emptyAuditLogsRepository: AuditLogsRepository = {
  async list() {
    return [];
  },
  async record() {
    return undefined;
  },
};

const emptyBetaFeedbackRepository: BetaFeedbackRepository = {
  async list() {
    return [];
  },
  async create() {
    throw new Error("Feedback requires a connected data backend.");
  },
  async count() {
    return 0;
  },
};

const emptyKnowledgeSearchRepository: KnowledgeSearchRepository = {
  async search() {
    return [];
  },
};

const emptyStorageRepository: StorageRepository = {
  async getSignedUploadUrl() {
    throw new Error("Storage requires a connected data backend.");
  },
  async getSignedDownloadUrl() {
    throw new Error("Storage requires a connected data backend.");
  },
  async createDocumentUploadIntent() {
    throw new Error("Storage requires a connected data backend.");
  },
  async createDocumentDownloadIntent() {
    throw new Error("Storage requires a connected data backend.");
  },
};

export const emptyRepositories = {
  auditLogsRepository: emptyAuditLogsRepository,
  betaFeedbackRepository: emptyBetaFeedbackRepository,
  documentActivityRepository: emptyReadonlyRepository<DocumentActivity>() as DocumentActivityRepository,
  documentCategoriesRepository: emptyMutableRepository<DocumentCategory>("Document categories") as DocumentCategoriesRepository,
  documentPermissionsRepository: emptyMutableRepository<DocumentPermission>("Document permissions") as DocumentPermissionsRepository,
  documentsRepository: emptyDocumentsRepository,
  documentTagsRepository: emptyMutableRepository<DocumentTag>("Document tags") as DocumentTagsRepository,
  documentVersionsRepository: emptyMutableRepository<DocumentVersion>("Document versions") as DocumentVersionsRepository,
  institutionalRepository: emptyInstitutionalRepository,
  invitationsRepository: emptyInvitationsRepository,
  knowledgeArticlesRepository: emptyMutableRepository<KnowledgeArticle>("Knowledge articles") as KnowledgeArticlesRepository,
  knowledgeSearchRepository: emptyKnowledgeSearchRepository,
  meetingsRepository: emptyMutableRepository<Meeting>("Meetings") as MeetingsRepository,
  notificationsRepository: emptyMutableRepository<Notification>("Notifications") as NotificationsRepository,
  organizationsRepository: emptyOrganizationsRepository,
  programsRepository: emptyReadonlyRepository<Program>() as ProgramsRepository,
  projectsRepository: emptyMutableRepository<Project>("Projects") as ProjectsRepository,
  storageRepository: emptyStorageRepository,
  tasksRepository: emptyMutableRepository<Task>("Tasks") as TasksRepository,
  usersRepository: emptyUsersRepository,
};
