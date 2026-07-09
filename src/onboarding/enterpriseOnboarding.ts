import { axxessBetaRoles, axxessSectors, requiredOnboardingNotices, type AxxessBetaRole, type AxxessSector } from "../../packages/shared/src";

export type OnboardingMode = "create-organization" | "join-organization";
export type OnboardingStepId = "start" | "create-organization" | "join-organization" | "sector" | "workspace" | "security" | "complete";

export type EnterpriseOnboardingState = {
  mode?: OnboardingMode;
  organizationName?: string;
  invitationCode?: string;
  sector?: AxxessSector;
  role?: AxxessBetaRole;
  departmentName?: string;
  workspaceName?: string;
  acceptedNotices: string[];
};

export const enterpriseOnboardingSteps: { id: OnboardingStepId; title: string; path: string }[] = [
  { id: "start", title: "Start onboarding", path: "/onboarding" },
  { id: "create-organization", title: "Create organization", path: "/onboarding/create-organization" },
  { id: "join-organization", title: "Join organization", path: "/onboarding/join-organization" },
  { id: "sector", title: "Select sector and role", path: "/onboarding/sector" },
  { id: "workspace", title: "Create first workspace", path: "/onboarding/workspace" },
  { id: "security", title: "Accept security and beta notices", path: "/onboarding/security" },
  { id: "complete", title: "Complete provisioning", path: "/onboarding/complete" },
];

export function createDefaultOnboardingState(): EnterpriseOnboardingState {
  return {
    acceptedNotices: [],
  };
}

export function nextOnboardingPath(currentStep: OnboardingStepId, state: EnterpriseOnboardingState): string {
  if (currentStep === "start") return state.mode === "join-organization" ? "/onboarding/join-organization" : "/onboarding/create-organization";
  if (currentStep === "create-organization" || currentStep === "join-organization") return "/onboarding/sector";
  if (currentStep === "sector") return "/onboarding/workspace";
  if (currentStep === "workspace") return "/onboarding/security";
  if (currentStep === "security") return "/onboarding/complete";
  return "/dashboard";
}

export function isOnboardingComplete(state: EnterpriseOnboardingState): boolean {
  return Boolean(
    (state.organizationName || state.invitationCode) &&
    state.sector &&
    state.role &&
    state.departmentName &&
    state.workspaceName &&
    requiredOnboardingNotices.every((notice) => state.acceptedNotices.includes(notice)),
  );
}

export { axxessBetaRoles, axxessSectors, requiredOnboardingNotices };
