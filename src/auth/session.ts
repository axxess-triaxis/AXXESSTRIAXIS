import { featureFlags } from "../config/featureFlags";
import { cleanTenantUserContext, demoUserContext, isDemoModeEnabled } from "../demo/demoMode";
import type { UserContext } from "../security/rbac";

export type AuthSession = {
  status: "authenticated" | "unauthenticated";
  source: "mock-rbac" | "supabase-auth";
  user: UserContext | null;
};

export function getCurrentAuthSession(): AuthSession {
  if (isDemoModeEnabled()) {
    return {
      status: "authenticated",
      source: "mock-rbac",
      user: demoUserContext,
    };
  }

  if (featureFlags.enableAuthShell) {
    return {
      status: "unauthenticated",
      source: "supabase-auth",
      user: null,
    };
  }

  return {
    status: "authenticated",
    source: "mock-rbac",
    user: cleanTenantUserContext,
  };
}
