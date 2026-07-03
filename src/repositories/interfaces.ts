import type {
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
  Omit<Partial<TResource>, "id" | "organizationId"> & { organizationId?: EntityId };

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
}
