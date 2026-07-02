import { featureFlags } from "../config/featureFlags";
import { mockCurrentUserContext, type MockUserContext } from "../security/rbac";

export type AuthSession = {
  status: "mock";
  source: "mock-rbac" | "auth-shell";
  user: MockUserContext;
};

export function getCurrentAuthSession(): AuthSession {
  return {
    status: "mock",
    source: featureFlags.enableAuthShell ? "auth-shell" : "mock-rbac",
    user: mockCurrentUserContext,
  };
}
