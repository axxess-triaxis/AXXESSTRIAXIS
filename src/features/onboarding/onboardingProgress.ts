export type OnboardingStepId =
  | "organization"
  | "first_project"
  | "first_task"
  | "first_meeting"
  | "invite_team_member"
  | "send_feedback";

export type OnboardingProgress = Record<OnboardingStepId, boolean>;

export interface OnboardingProgressRepository {
  load(userId: string): OnboardingProgress;
  save(userId: string, progress: OnboardingProgress): void;
}

export const defaultOnboardingProgress: OnboardingProgress = {
  organization: false,
  first_project: false,
  first_task: false,
  first_meeting: false,
  invite_team_member: false,
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
