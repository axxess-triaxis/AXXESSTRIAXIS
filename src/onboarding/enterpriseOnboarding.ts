import { axxessBetaRoles, axxessSectors, requiredOnboardingNotices, type AxxessBetaRole, type AxxessSector } from "../../packages/shared/src";

export type OnboardingMode = "create-organization" | "join-organization";
export type OnboardingStepId = "start" | "create-organization" | "join-organization" | "sector" | "workspace" | "security" | "complete";

// Each goal maps to a real, live-data-backed module (documents+AI, projects+tasks, or meetings) --
// never a module without a real repository (e.g. Approvals/Stakeholders/Analytics), per
// DEMO_DATA_LEAKAGE_AUDIT.md's "no dummy data" principle. Sample data seeded for a goal is real,
// persisted, editable, and deletable -- not decorative demo content.
export type OnboardingGoal = "knowledge_ai" | "workflow_tasks" | "meetings_coordination";

export const onboardingGoals: { id: OnboardingGoal; title: string; description: string; route: string }[] = [
  { id: "knowledge_ai", title: "Knowledge & AI decision support", description: "Upload institutional documents and ask governed, cited questions.", route: "/ai-workspace" },
  { id: "workflow_tasks", title: "Workflow & task execution", description: "Track projects and accountable tasks with AI-assisted follow-through.", route: "/tasks" },
  { id: "meetings_coordination", title: "Meetings & institutional coordination", description: "Capture meetings, decisions, and action items across your team.", route: "/meetings" },
];

export type EnterpriseOnboardingState = {
  mode?: OnboardingMode;
  organizationName?: string;
  invitationCode?: string;
  sector?: AxxessSector;
  role?: AxxessBetaRole;
  departmentName?: string;
  workspaceName?: string;
  acceptedNotices: string[];
  primaryGoal?: OnboardingGoal;
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
  // departmentName/workspaceName are intentionally not required here -- the provisioning backend
  // (provisionTenantForUser) already treats them as optional and defaults sensibly when blank.
  // Requiring them here was an unnecessary setup decision blocking first value; see
  // PRE_DEMO_ACTIONABLES.md A18.
  return Boolean(
    (state.organizationName || state.invitationCode) &&
    state.sector &&
    state.role &&
    requiredOnboardingNotices.every((notice) => state.acceptedNotices.includes(notice)),
  );
}

export { axxessBetaRoles, axxessSectors, requiredOnboardingNotices };
