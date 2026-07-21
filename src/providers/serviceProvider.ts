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
  // No live (Supabase-backed) institutional repository exists yet. Falling back to an empty
  // repository here -- not the demo one -- so a real tenant never sees fabricated approvals,
  // AI messages, or institutional context. See DEMO_DATA_LEAKAGE_AUDIT.md.
  institutionalRepository: emptyRepositories.institutionalRepository,
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

// A live-call failure must never surface fabricated demo content to a real tenant (see
// DEMO_DATA_LEAKAGE_AUDIT.md). The fallback on any error is therefore always a genuinely empty,
// safe result (or a thrown error for mutations) -- never demoRepositories.
async function withResilientFallback<TValue>(primary: () => Promise<TValue>, fallback: () => Promise<TValue>) {
  try {
    return await primary();
  } catch {
    return fallback();
  }
}

function resilientTenantRepository<TResource extends TenantResource>(
  liveRepository: TenantRepository<TResource>,
  emptyRepository: TenantRepository<TResource>,
): TenantRepository<TResource> {
  return {
    list: (scope, query) => withResilientFallback(
      () => liveRepository.list(scope, query),
      () => emptyRepository.list(scope, query),
    ),
    getById: (scope, id) => withResilientFallback(
      () => liveRepository.getById(scope, id),
      () => emptyRepository.getById(scope, id),
    ),
  };
}

function resilientMutableRepository<TResource extends TenantResource>(
  liveRepository: MutableTenantRepository<TResource>,
  emptyRepository: MutableTenantRepository<TResource>,
): MutableTenantRepository<TResource> {
  const base = resilientTenantRepository(liveRepository, emptyRepository);
  return {
    ...base,
    create: (scope, input) => withResilientFallback(
      () => liveRepository.create(scope, input),
      () => emptyRepository.create(scope, input),
    ),
    update: (scope, id, input) => withResilientFallback(
      () => liveRepository.update(scope, id, input),
      () => emptyRepository.update(scope, id, input),
    ),
  };
}

const resilientRepositories: RepositoryServices = {
  institutionalRepository: emptyRepositories.institutionalRepository,
  organizationsRepository: {
    list: (scope, query) => withResilientFallback(
      () => liveRepositories.organizationsRepository.list(scope, query),
      () => emptyRepositories.organizationsRepository.list(scope, query),
    ),
    getById: (scope, id) => withResilientFallback(
      () => liveRepositories.organizationsRepository.getById(scope, id),
      () => emptyRepositories.organizationsRepository.getById(scope, id),
    ),
  },
  usersRepository: {
    listByOrganization: (scope, query) => withResilientFallback(
      () => liveRepositories.usersRepository.listByOrganization(scope, query),
      () => emptyRepositories.usersRepository.listByOrganization(scope, query),
    ),
    getById: (scope, id) => withResilientFallback(
      () => liveRepositories.usersRepository.getById(scope, id),
      () => emptyRepositories.usersRepository.getById(scope, id),
    ),
    update: (scope, id, input) => withResilientFallback(
      () => liveRepositories.usersRepository.update(scope, id, input),
      () => emptyRepositories.usersRepository.update(scope, id, input),
    ),
  },
  programsRepository: resilientTenantRepository(liveRepositories.programsRepository, emptyRepositories.programsRepository),
  projectsRepository: resilientMutableRepository(liveRepositories.projectsRepository, emptyRepositories.projectsRepository),
  tasksRepository: resilientMutableRepository(liveRepositories.tasksRepository, emptyRepositories.tasksRepository),
  meetingsRepository: resilientMutableRepository(liveRepositories.meetingsRepository, emptyRepositories.meetingsRepository),
  notificationsRepository: resilientMutableRepository(liveRepositories.notificationsRepository, emptyRepositories.notificationsRepository),
  documentsRepository: {
    ...resilientMutableRepository(liveRepositories.documentsRepository, emptyRepositories.documentsRepository),
    archive: (scope, id) => withResilientFallback(
      () => liveRepositories.documentsRepository.archive(scope, id),
      () => emptyRepositories.documentsRepository.archive(scope, id),
    ),
    restore: (scope, id) => withResilientFallback(
      () => liveRepositories.documentsRepository.restore(scope, id),
      () => emptyRepositories.documentsRepository.restore(scope, id),
    ),
    softDelete: (scope, id) => withResilientFallback(
      () => liveRepositories.documentsRepository.softDelete(scope, id),
      () => emptyRepositories.documentsRepository.softDelete(scope, id),
    ),
    listArchived: (scope, query) => withResilientFallback(
      () => liveRepositories.documentsRepository.listArchived(scope, query),
      () => emptyRepositories.documentsRepository.listArchived(scope, query),
    ),
    listFavorites: (scope, query) => withResilientFallback(
      () => liveRepositories.documentsRepository.listFavorites(scope, query),
      () => emptyRepositories.documentsRepository.listFavorites(scope, query),
    ),
    listSharedWithMe: (scope, query) => withResilientFallback(
      () => liveRepositories.documentsRepository.listSharedWithMe(scope, query),
      () => emptyRepositories.documentsRepository.listSharedWithMe(scope, query),
    ),
    recordActivity: (scope, input) => withResilientFallback(
      () => liveRepositories.documentsRepository.recordActivity(scope, input),
      () => emptyRepositories.documentsRepository.recordActivity(scope, input),
    ),
  },
  documentVersionsRepository: resilientMutableRepository(liveRepositories.documentVersionsRepository, emptyRepositories.documentVersionsRepository),
  documentCategoriesRepository: resilientMutableRepository(liveRepositories.documentCategoriesRepository, emptyRepositories.documentCategoriesRepository),
  documentTagsRepository: resilientMutableRepository(liveRepositories.documentTagsRepository, emptyRepositories.documentTagsRepository),
  documentPermissionsRepository: resilientMutableRepository(liveRepositories.documentPermissionsRepository, emptyRepositories.documentPermissionsRepository),
  documentActivityRepository: resilientTenantRepository(liveRepositories.documentActivityRepository, emptyRepositories.documentActivityRepository),
  knowledgeArticlesRepository: resilientMutableRepository(liveRepositories.knowledgeArticlesRepository, emptyRepositories.knowledgeArticlesRepository),
  knowledgeSearchRepository: {
    search: (scope, query) => withResilientFallback(
      () => liveRepositories.knowledgeSearchRepository.search(scope, query),
      () => emptyRepositories.knowledgeSearchRepository.search(scope, query),
    ),
  },
  invitationsRepository: {
    create: (scope, input) => withResilientFallback(
      () => liveRepositories.invitationsRepository.create(scope, input),
      () => emptyRepositories.invitationsRepository.create(scope, input),
    ),
    listPending: (scope, query) => withResilientFallback(
      () => liveRepositories.invitationsRepository.listPending(scope, query),
      () => emptyRepositories.invitationsRepository.listPending(scope, query),
    ),
  },
  auditLogsRepository: {
    list: (scope, query) => withResilientFallback(
      () => liveRepositories.auditLogsRepository.list(scope, query),
      () => emptyRepositories.auditLogsRepository.list(scope, query),
    ),
    record: (scope, input) => withResilientFallback(
      () => liveRepositories.auditLogsRepository.record(scope, input),
      () => emptyRepositories.auditLogsRepository.record(scope, input),
    ),
  },
  betaFeedbackRepository: {
    list: (scope, query) => withResilientFallback(
      () => liveRepositories.betaFeedbackRepository.list(scope, query),
      () => emptyRepositories.betaFeedbackRepository.list(scope, query),
    ),
    create: (scope, input) => withResilientFallback(
      () => liveRepositories.betaFeedbackRepository.create(scope, input),
      () => emptyRepositories.betaFeedbackRepository.create(scope, input),
    ),
    count: (scope) => withResilientFallback(
      () => liveRepositories.betaFeedbackRepository.count(scope),
      () => emptyRepositories.betaFeedbackRepository.count(scope),
    ),
  },
  storageRepository: {
    getSignedUploadUrl: (path) => withResilientFallback(
      () => liveRepositories.storageRepository.getSignedUploadUrl(path),
      () => emptyRepositories.storageRepository.getSignedUploadUrl(path),
    ),
    getSignedDownloadUrl: (path) => withResilientFallback(
      () => liveRepositories.storageRepository.getSignedDownloadUrl(path),
      () => emptyRepositories.storageRepository.getSignedDownloadUrl(path),
    ),
    createDocumentUploadIntent: (input) => withResilientFallback(
      () => liveRepositories.storageRepository.createDocumentUploadIntent(input),
      () => emptyRepositories.storageRepository.createDocumentUploadIntent(input),
    ),
    createDocumentDownloadIntent: (input) => withResilientFallback(
      () => liveRepositories.storageRepository.createDocumentDownloadIntent(input),
      () => emptyRepositories.storageRepository.createDocumentDownloadIntent(input),
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
