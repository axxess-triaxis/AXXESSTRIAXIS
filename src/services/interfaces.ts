import type { UserContext } from "../security/rbac";

export interface AuthenticationService {
  getCurrentUser(): UserContext | null;
  isAuthenticated(): boolean;
}

export interface AiProviderService {
  completeWithContext(prompt: string, contextIds: string[]): Promise<string>;
}

export interface NotificationService {
  markRead(notificationId: string): Promise<void>;
}

export interface ConfigurationService {
  getFlag(name: string): boolean;
  getPublicValue(name: string): string | undefined;
}
