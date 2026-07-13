import { featureFlags } from "../config/featureFlags";
import { getCurrentAuthSession } from "../auth/session";
import { demoRepositories } from "../demo/demoRepositories";
import { emptyRepositories } from "../demo/emptyRepositories";
import { cleanTenantUserContext, demoUserContext, isDemoModeEnabled } from "../demo/demoMode";
import {
  auditLogsRepository,
  betaFeedbackRepository,
  documentActivityRepository,
  documentCategoriesRepository,
  documentPermissionsRepository,
  documentsRepository,
  documentTagsRepository,
  documentVersionsRepository,
  invitationsRepository,
  knowledgeArticlesRepository,
  knowledgeSearchRepository,
  meetingsRepository,
  notificationsRepository,
  organizationsRepository,
  programsRepository,
  projectsRepository,
  tasksRepository,
  usersRepository,
} from "../repositories/supabaseEnterpriseRepositories";
import { documentStorageRepository } from "../services/storage/documentStorage";
import { routeAiRequest } from "../services/ai/router/aiRouter";
import type {
  InstitutionalRepository,
  AuditLogsRepository,
  BetaFeedbackRepository,
  DocumentActivityRepository,
  DocumentCategoriesRepository,
  DocumentPermissionsRepository,
  DocumentsRepository,
  DocumentTagsRepository,
  DocumentVersionsRepository,
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
  TenantScope,
  UsersRepository,
} from "../repositories/interfaces";
import type { AiProviderService, AuthenticationService, ConfigurationService, NotificationService } from "../services/interfaces";

const authService: AuthenticationService = {
  getCurrentUser: () => {
    if (isDemoModeEnabled()) return demoUserContext;
    return getCurrentAuthSession().user ?? cleanTenantUserContext;
  },
  isAuthenticated: () => getCurrentAuthSession().status === "authenticated",
};

const aiService: AiProviderService = {
  async completeWithContext(prompt, contextIds) {
    const user = authService.getCurrentUser() ?? demoUserContext;
    const result = await routeAiRequest({
      prompt,
      task: "rag_answer",
      context: {
        organizationId: user.organizationId,
        userId: user.id,
        userRole: user.role,
        documentIds: contextIds,
        requiresCitation: contextIds.length > 0,
      },
    });
    return result.answer;
  },
};

const notificationService: NotificationService = {
  async markRead() {
    throw new Error("Notifications are not connected in Sprint 4.");
  },
};

const configurationService: ConfigurationService = {
  getFlag(name) {
    if (name === "enableDemoMode") return isDemoModeEnabled();
    return Boolean(featureFlags[name as keyof typeof featureFlags]);
  },
  getPublicValue(name) {
    const publicEnv: Record<string, string | undefined> = {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_AXXESS_AUTH_SHELL: process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL,
      NEXT_PUBLIC_AXXESS_DEMO_MODE: process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    return publicEnv[name];
  },
};

export type ApplicationServices = {
  institutionalRepository: InstitutionalRepository;
  organizationsRepository: OrganizationsRepository;
  usersRepository: UsersRepository;
  programsRepository: ProgramsRepository;
  projectsRepository: ProjectsRepository;
  tasksRepository: TasksRepository;
  meetingsRepository: MeetingsRepository;
  notificationsRepository: NotificationsRepository;
  documentsRepository: DocumentsRepository;
  documentVersionsRepository: DocumentVersionsRepository;
  documentCategoriesRepository: DocumentCategoriesRepository;
  documentTagsRepository: DocumentTagsRepository;
  documentPermissionsRepository: DocumentPermissionsRepository;
  documentActivityRepository: DocumentActivityRepository;
  knowledgeArticlesRepository: KnowledgeArticlesRepository;
  knowledgeSearchRepository: KnowledgeSearchRepository;
  invitationsRepository: InvitationsRepository;
  auditLogsRepository: AuditLogsRepository;
  betaFeedbackRepository: BetaFeedbackRepository;
  authService: AuthenticationService;
  aiService: AiProviderService;
  storageRepository: StorageRepository;
  notificationService: NotificationService;
  configurationService: ConfigurationService;
};

type RepositoryServices = Omit<ApplicationServices, "authService" | "aiService" | "notificationService" | "configurationService">;
type TenantResource = { id: string; organizationId: string };

const liveRepositories: RepositoryServices = {
  institutionalRepository: demoRepositories.institutionalRepository,
  organizationsRepository,
  usersRepository,
  programsRepository,
  projectsRepository,
  tasksRepository,
  meetingsRepository,
  notificationsRepository,
  documentsRepository,
  documentVersionsRepository,
  documentCategoriesRepository,
  documentTagsRepository,
  documentPermissionsRepository,
  documentActivityRepository,
  knowledgeArticlesRepository,
  knowledgeSearchRepository,
  invitationsRepository,
  auditLogsRepository,
  betaFeedbackRepository,
  storageRepository: documentStorageRepository,
};

function demoFallbackScope(scope: TenantScope): TenantScope {
  return {
    ...scope,
    organizationId: demoUserContext.organizationId,
    userId: demoUserContext.id,
    role: scope.role === "Guest" ? "Guest" : demoUserContext.role,
    accessToken: undefined,
  };
}

async function withDemoFallback<TValue>(primary: () => Promise<TValue>, fallback: () => Promise<TValue>) {
  try {
    return await primary();
  } catch {
    return fallback();
  }
}

function resilientTenantRepository<TResource extends TenantResource>(
  liveRepository: TenantRepository<TResource>,
  demoRepository: TenantRepository<TResource>,
): TenantRepository<TResource> {
  return {
    list: (scope, query) => withDemoFallback(
      () => liveRepository.list(scope, query),
      () => demoRepository.list(demoFallbackScope(scope), query),
    ),
    getById: (scope, id) => withDemoFallback(
      () => liveRepository.getById(scope, id),
      () => demoRepository.getById(demoFallbackScope(scope), id),
    ),
  };
}

function resilientMutableRepository<TResource extends TenantResource>(
  liveRepository: MutableTenantRepository<TResource>,
  demoRepository: MutableTenantRepository<TResource>,
): MutableTenantRepository<TResource> {
  const base = resilientTenantRepository(liveRepository, demoRepository);
  return {
    ...base,
    create: (scope, input) => withDemoFallback(
      () => liveRepository.create(scope, input),
      () => demoRepository.create(demoFallbackScope(scope), input),
    ),
    update: (scope, id, input) => withDemoFallback(
      () => liveRepository.update(scope, id, input),
      () => demoRepository.update(demoFallbackScope(scope), id, input),
    ),
  };
}

const resilientRepositories: RepositoryServices = {
  institutionalRepository: demoRepositories.institutionalRepository,
  organizationsRepository: {
    list: (scope, query) => withDemoFallback(
      () => liveRepositories.organizationsRepository.list(scope, query),
      () => demoRepositories.organizationsRepository.list(demoFallbackScope(scope), query),
    ),
    getById: (scope, id) => withDemoFallback(
      () => liveRepositories.organizationsRepository.getById(scope, id),
      () => demoRepositories.organizationsRepository.getById(demoFallbackScope(scope), id),
    ),
  },
  usersRepository: {
    listByOrganization: (scope, query) => withDemoFallback(
      () => liveRepositories.usersRepository.listByOrganization(scope, query),
      () => demoRepositories.usersRepository.listByOrganization(demoFallbackScope(scope), query),
    ),
    getById: (scope, id) => withDemoFallback(
      () => liveRepositories.usersRepository.getById(scope, id),
      () => demoRepositories.usersRepository.getById(demoFallbackScope(scope), id),
    ),
    update: (scope, id, input) => withDemoFallback(
      () => liveRepositories.usersRepository.update(scope, id, input),
      () => demoRepositories.usersRepository.update(demoFallbackScope(scope), id, input),
    ),
  },
  programsRepository: resilientTenantRepository(liveRepositories.programsRepository, demoRepositories.programsRepository),
  projectsRepository: resilientMutableRepository(liveRepositories.projectsRepository, demoRepositories.projectsRepository),
  tasksRepository: resilientMutableRepository(liveRepositories.tasksRepository, demoRepositories.tasksRepository),
  meetingsRepository: resilientMutableRepository(liveRepositories.meetingsRepository, demoRepositories.meetingsRepository),
  notificationsRepository: resilientMutableRepository(liveRepositories.notificationsRepository, demoRepositories.notificationsRepository),
  documentsRepository: {
    ...resilientMutableRepository(liveRepositories.documentsRepository, demoRepositories.documentsRepository),
    archive: (scope, id) => withDemoFallback(
      () => liveRepositories.documentsRepository.archive(scope, id),
      () => demoRepositories.documentsRepository.archive(demoFallbackScope(scope), id),
    ),
    restore: (scope, id) => withDemoFallback(
      () => liveRepositories.documentsRepository.restore(scope, id),
      () => demoRepositories.documentsRepository.restore(demoFallbackScope(scope), id),
    ),
    softDelete: (scope, id) => withDemoFallback(
      () => liveRepositories.documentsRepository.softDelete(scope, id),
      () => demoRepositories.documentsRepository.softDelete(demoFallbackScope(scope), id),
    ),
    listArchived: (scope, query) => withDemoFallback(
      () => liveRepositories.documentsRepository.listArchived(scope, query),
      () => demoRepositories.documentsRepository.listArchived(demoFallbackScope(scope), query),
    ),
    listFavorites: (scope, query) => withDemoFallback(
      () => liveRepositories.documentsRepository.listFavorites(scope, query),
      () => demoRepositories.documentsRepository.listFavorites(demoFallbackScope(scope), query),
    ),
    listSharedWithMe: (scope, query) => withDemoFallback(
      () => liveRepositories.documentsRepository.listSharedWithMe(scope, query),
      () => demoRepositories.documentsRepository.listSharedWithMe(demoFallbackScope(scope), query),
    ),
    recordActivity: (scope, input) => withDemoFallback(
      () => liveRepositories.documentsRepository.recordActivity(scope, input),
      () => demoRepositories.documentsRepository.recordActivity(demoFallbackScope(scope), input),
    ),
  },
  documentVersionsRepository: resilientMutableRepository(liveRepositories.documentVersionsRepository, demoRepositories.documentVersionsRepository),
  documentCategoriesRepository: resilientMutableRepository(liveRepositories.documentCategoriesRepository, demoRepositories.documentCategoriesRepository),
  documentTagsRepository: resilientMutableRepository(liveRepositories.documentTagsRepository, demoRepositories.documentTagsRepository),
  documentPermissionsRepository: resilientMutableRepository(liveRepositories.documentPermissionsRepository, demoRepositories.documentPermissionsRepository),
  documentActivityRepository: resilientTenantRepository(liveRepositories.documentActivityRepository, demoRepositories.documentActivityRepository),
  knowledgeArticlesRepository: resilientMutableRepository(liveRepositories.knowledgeArticlesRepository, demoRepositories.knowledgeArticlesRepository),
  knowledgeSearchRepository: {
    search: (scope, query) => withDemoFallback(
      () => liveRepositories.knowledgeSearchRepository.search(scope, query),
      () => demoRepositories.knowledgeSearchRepository.search(demoFallbackScope(scope), query),
    ),
  },
  invitationsRepository: {
    create: (scope, input) => withDemoFallback(
      () => liveRepositories.invitationsRepository.create(scope, input),
      () => demoRepositories.invitationsRepository.create(demoFallbackScope(scope), input),
    ),
    listPending: (scope, query) => withDemoFallback(
      () => liveRepositories.invitationsRepository.listPending(scope, query),
      () => demoRepositories.invitationsRepository.listPending(demoFallbackScope(scope), query),
    ),
  },
  auditLogsRepository: {
    list: (scope, query) => withDemoFallback(
      () => liveRepositories.auditLogsRepository.list(scope, query),
      () => demoRepositories.auditLogsRepository.list(demoFallbackScope(scope), query),
    ),
    record: (scope, input) => withDemoFallback(
      () => liveRepositories.auditLogsRepository.record(scope, input),
      () => demoRepositories.auditLogsRepository.record(demoFallbackScope(scope), input),
    ),
  },
  betaFeedbackRepository: {
    list: (scope, query) => withDemoFallback(
      () => liveRepositories.betaFeedbackRepository.list(scope, query),
      () => demoRepositories.betaFeedbackRepository.list(demoFallbackScope(scope), query),
    ),
    create: (scope, input) => withDemoFallback(
      () => liveRepositories.betaFeedbackRepository.create(scope, input),
      () => demoRepositories.betaFeedbackRepository.create(demoFallbackScope(scope), input),
    ),
    count: (scope) => withDemoFallback(
      () => liveRepositories.betaFeedbackRepository.count(scope),
      () => demoRepositories.betaFeedbackRepository.count(demoFallbackScope(scope)),
    ),
  },
  storageRepository: {
    getSignedUploadUrl: (path) => withDemoFallback(
      () => liveRepositories.storageRepository.getSignedUploadUrl(path),
      () => demoRepositories.storageRepository.getSignedUploadUrl(path),
    ),
    getSignedDownloadUrl: (path) => withDemoFallback(
      () => liveRepositories.storageRepository.getSignedDownloadUrl(path),
      () => demoRepositories.storageRepository.getSignedDownloadUrl(path),
    ),
    createDocumentUploadIntent: (input) => withDemoFallback(
      () => liveRepositories.storageRepository.createDocumentUploadIntent(input),
      () => demoRepositories.storageRepository.createDocumentUploadIntent(input),
    ),
    createDocumentDownloadIntent: (input) => withDemoFallback(
      () => liveRepositories.storageRepository.createDocumentDownloadIntent(input),
      () => demoRepositories.storageRepository.createDocumentDownloadIntent(input),
    ),
  },
};

function selectedRepositories(): RepositoryServices {
  if (isDemoModeEnabled()) return demoRepositories;
  if (featureFlags.enableSupabaseRuntime) return resilientRepositories;
  return emptyRepositories;
}

function selectedApplicationServices(): ApplicationServices {
  return {
    ...selectedRepositories(),
    authService,
    aiService,
    notificationService,
    configurationService,
  };
}

export const applicationServices: ApplicationServices = new Proxy({} as ApplicationServices, {
  get(_target, property) {
    return selectedApplicationServices()[property as keyof ApplicationServices];
  },
});
