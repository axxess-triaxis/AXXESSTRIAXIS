import { featureFlags } from "../config/featureFlags";
import { getCurrentAuthSession } from "../auth/session";
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
import { mockCurrentUserContext } from "../security/rbac";
import { legacyInstitutionalViewRepository } from "../services/legacyInstitutionalViewRepository";
import { documentStorageRepository } from "../services/storage/documentStorage";
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
  NotificationsRepository,
  OrganizationsRepository,
  ProgramsRepository,
  ProjectsRepository,
  StorageRepository,
  TasksRepository,
  UsersRepository,
} from "../repositories/interfaces";
import type { AiProviderService, AuthenticationService, ConfigurationService, NotificationService } from "../services/interfaces";

const authService: AuthenticationService = {
  getCurrentUser: () => getCurrentAuthSession().user ?? mockCurrentUserContext,
  isAuthenticated: () => getCurrentAuthSession().status === "authenticated",
};

const aiService: AiProviderService = {
  async completeWithContext() {
    throw new Error("AI provider is not connected in Sprint 4.");
  },
};

const notificationService: NotificationService = {
  async markRead() {
    throw new Error("Notifications are not connected in Sprint 4.");
  },
};

const configurationService: ConfigurationService = {
  getFlag(name) {
    return Boolean(featureFlags[name as keyof typeof featureFlags]);
  },
  getPublicValue(name) {
    const publicEnv: Record<string, string | undefined> = {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_AXXESS_AUTH_SHELL: process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL,
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

export const applicationServices: ApplicationServices = {
  institutionalRepository: legacyInstitutionalViewRepository,
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
  authService,
  aiService,
  storageRepository: documentStorageRepository,
  notificationService,
  configurationService,
};
