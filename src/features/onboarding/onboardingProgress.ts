export type OnboardingStepId =
  | "organization"
  | "invite_team_member"
  | "role_assignment"
  | "first_project"
  | "upload_document"
  | "first_ai_question"
  | "first_task"
  | "first_approval"
  | "view_audit_trail"
  | "send_feedback";

export type OnboardingProgress = Record<OnboardingStepId, boolean>;

export interface OnboardingProgressRepository {
  load(userId: string): OnboardingProgress;
  save(userId: string, progress: OnboardingProgress): void;
}

export const defaultOnboardingProgress: OnboardingProgress = {
  organization: false,
  invite_team_member: false,
  role_assignment: false,
  first_project: false,
  upload_document: false,
  first_ai_question: false,
  first_task: false,
  first_approval: false,
  view_audit_trail: false,
  send_feedback: false,
};

export class LocalOnboardingProgressRepository implements OnboardingProgressRepository {
  load(userId: string): OnboardingProgress {
    if (typeof window === "undefined") return defaultOnboardingProgress;
    const stored = window.localStorage.getItem(`axxess:onboarding:${userId}`);
    if (!stored) return defaultOnboardingProgress;
    try {
      return { ...defaultOnboardingProgress, ...JSON.parse(stored) } as OnboardingProgress;
    } catch {
      return defaultOnboardingProgress;
    }
  }

  save(userId: string, progress: OnboardingProgress) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`axxess:onboarding:${userId}`, JSON.stringify(progress));
  }
}
