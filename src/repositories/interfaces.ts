import type {
  BetaFeedback,
  BetaFeedbackType,
  Document,
  DocumentActivity,
  DocumentActivityAction,
  DocumentCategory,
  DocumentPermission,
  DocumentPermissionLevel,
  DocumentPermissionPrincipal,
  DocumentTag,
  DocumentVersion,
  Meeting,
  Notification,
  Organization,
  Program,
  Project,
  Task,
  User,
  RoleName,
  EntityId,
  Invitation,
  AuditLog,
  KnowledgeArticle,
} from "../domain";
import type {
  AiMessageView,
  ApprovalView,
  DocumentView,
  IntegrationView,
  MeetingView,
  OkrMetricView,
  PerformanceMetricView,
  ProjectView,
  StakeholderView,
  TaskView,
  WorkloadMetricView,
} from "../services/contracts";

export type TenantScope = {
  organizationId: EntityId;
  userId: EntityId;
  role: RoleName;
  accessToken?: string;
};

export type RepositoryQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export interface TenantRepository<TResource extends { id: EntityId; organizationId: EntityId }> {
  list(scope: TenantScope, query?: RepositoryQuery): Promise<TResource[]>;
  getById(scope: TenantScope, id: EntityId): Promise<TResource | undefined>;
}

export type TenantCreateInput<TResource extends { id: EntityId; organizationId: EntityId }> =
  Omit<Partial<TResource>, "organizationId"> & { organizationId?: EntityId };

export type TenantUpdateInput<TResource extends { id: EntityId; organizationId: EntityId }> =
  Omit<Partial<TResource>, "id" | "organizationId"> & { organizationId?: EntityId };

export interface MutableTenantRepository<TResource extends { id: EntityId; organizationId: EntityId }>
  extends TenantRepository<TResource> {
  create(scope: TenantScope, input: TenantCreateInput<TResource>): Promise<TResource>;
  update(scope: TenantScope, id: EntityId, input: TenantUpdateInput<TResource>): Promise<TResource>;
}

export interface OrganizationsRepository {
  list(scope: TenantScope, query?: RepositoryQuery): Promise<Organization[]>;
  getById(scope: TenantScope, id: EntityId): Promise<Organization | undefined>;
}

export interface UsersRepository {
  listByOrganization(scope: TenantScope, query?: RepositoryQuery): Promise<User[]>;
  getById(scope: TenantScope, id: EntityId): Promise<User | undefined>;
  update(scope: TenantScope, id: EntityId, input: TenantUpdateInput<User>): Promise<User>;
}

export type ProgramsRepository = TenantRepository<Program>;
export type ProjectsRepository = MutableTenantRepository<Project>;
export type TasksRepository = MutableTenantRepository<Task>;
export type MeetingsRepository = MutableTenantRepository<Meeting>;
export type NotificationsRepository = MutableTenantRepository<Notification>;
export type DocumentVersionsRepository = MutableTenantRepository<DocumentVersion>;
export type DocumentCategoriesRepository = MutableTenantRepository<DocumentCategory>;
export type DocumentTagsRepository = MutableTenantRepository<DocumentTag>;
export type DocumentPermissionsRepository = MutableTenantRepository<DocumentPermission>;
export type DocumentActivityRepository = TenantRepository<DocumentActivity>;
export type KnowledgeArticlesRepository = MutableTenantRepository<KnowledgeArticle>;

export type DocumentSearchScope =
  | "all"
  | "documents"
  | "articles"
  | "recent"
  | "favorites"
  | "shared"
  | "archived";

export type KnowledgeSearchQuery = RepositoryQuery & {
  scope?: DocumentSearchScope;
  categoryId?: EntityId;
  tag?: string;
  ownerId?: EntityId;
};

export type KnowledgeSearchResult =
  | { type: "document"; item: Document; score?: number }
  | { type: "article"; item: KnowledgeArticle; score?: number };

export type CreateDocumentPermissionInput = {
  documentId: EntityId;
  principalType: DocumentPermissionPrincipal;
  principalId?: EntityId;
  accessLevel: DocumentPermissionLevel;
  expiresAt?: string;
};

export type DocumentActivityInput = {
  documentId: EntityId;
  action: DocumentActivityAction;
  metadata?: Record<string, unknown>;
};

export interface DocumentsRepository extends MutableTenantRepository<Document> {
  archive(scope: TenantScope, id: EntityId): Promise<Document>;
  restore(scope: TenantScope, id: EntityId): Promise<Document>;
  softDelete(scope: TenantScope, id: EntityId): Promise<Document>;
  listArchived(scope: TenantScope, query?: RepositoryQuery): Promise<Document[]>;
  listFavorites(scope: TenantScope, query?: RepositoryQuery): Promise<Document[]>;
  listSharedWithMe(scope: TenantScope, query?: RepositoryQuery): Promise<Document[]>;
  recordActivity(scope: TenantScope, input: DocumentActivityInput): Promise<DocumentActivity | undefined>;
}

export interface KnowledgeSearchRepository {
  search(scope: TenantScope, query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult[]>;
}

export type CreateInvitationInput = {
  organizationId: EntityId;
  email: string;
  role: RoleName;
  invitedByUserId: EntityId;
  tokenHash: string;
  expiresAt: string;
};

export interface InvitationsRepository {
  create(scope: TenantScope, input: CreateInvitationInput): Promise<Invitation>;
  listPending(scope: TenantScope, query?: RepositoryQuery): Promise<Invitation[]>;
}

export type AuditLogInput = {
  action: string;
  resourceType: string;
  resourceId?: EntityId;
  category?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

export interface AuditLogsRepository {
  list(scope: TenantScope, query?: RepositoryQuery): Promise<AuditLog[]>;
  record(scope: TenantScope, input: AuditLogInput): Promise<AuditLog | undefined>;
}

export type CreateBetaFeedbackInput = {
  organizationId?: EntityId;
  userId?: EntityId;
  feedbackType: BetaFeedbackType;
  module: string;
  rating: number;
  message: string;
  permissionToContact: boolean;
  metadata?: Record<string, unknown>;
};

export interface BetaFeedbackRepository {
  list(scope: TenantScope, query?: RepositoryQuery): Promise<BetaFeedback[]>;
  create(scope: TenantScope, input: CreateBetaFeedbackInput): Promise<BetaFeedback>;
  count(scope: TenantScope): Promise<number>;
}

export interface InstitutionalRepository {
  getAiMessages(): AiMessageView[];
  getApprovals(): ApprovalView[];
  getDocuments(): DocumentView[];
  getIntegrations(): IntegrationView[];
  getMeetings(): MeetingView[];
  getOkrData(): OkrMetricView[];
  getPerformanceData(): PerformanceMetricView[];
  getProjects(): ProjectView[];
  getStakeholders(): StakeholderView[];
  getTasks(): TaskView[];
  getWorkloadData(): WorkloadMetricView[];
}

export interface StorageRepository {
  getSignedUploadUrl(path: string): Promise<string>;
  getSignedDownloadUrl(path: string): Promise<string>;
  createDocumentUploadIntent(input: DocumentStorageRequest): Promise<DocumentStorageIntent>;
  createDocumentDownloadIntent(input: DocumentStorageRequest): Promise<DocumentStorageIntent>;
}

export type DocumentStorageRequest = {
  path: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  expiresIn?: number;
};

export type DocumentStorageIntent = {
  bucket: string;
  path: string;
  signedUrl: string;
  token?: string;
  expiresIn: number;
};
