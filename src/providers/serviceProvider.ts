import { featureFlags } from "../config/featureFlags";
import { mockCurrentUserContext } from "../security/rbac";
import { institutionalMockRepository } from "../services/mockInstitutionalRepository";
import type { InstitutionalRepository, StorageRepository } from "../repositories/interfaces";
import type { AiProviderService, AuthenticationService, ConfigurationService, NotificationService } from "../services/interfaces";

const authService: AuthenticationService = {
  getCurrentUser: () => mockCurrentUserContext,
  isAuthenticated: () => true,
};

const aiService: AiProviderService = {
  async completeWithContext() {
    throw new Error("AI provider is not connected in Sprint 4.");
  },
};

const storageRepository: StorageRepository = {
  async getSignedUploadUrl() {
    throw new Error("Storage is not connected in Sprint 4.");
  },
  async getSignedDownloadUrl() {
    throw new Error("Storage is not connected in Sprint 4.");
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
  authService: AuthenticationService;
  aiService: AiProviderService;
  storageRepository: StorageRepository;
  notificationService: NotificationService;
  configurationService: ConfigurationService;
};

export const applicationServices: ApplicationServices = {
  institutionalRepository: institutionalMockRepository,
  authService,
  aiService,
  storageRepository,
  notificationService,
  configurationService,
};
