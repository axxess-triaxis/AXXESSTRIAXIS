"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import type { UserContext } from "../../security/rbac";
import { useAnalytics } from "../../services/analytics";
import {
  defaultOnboardingProgress,
  LocalOnboardingProgressRepository,
  type OnboardingProgress,
  type OnboardingStepId,
} from "./onboardingProgress";

type BetaOnboardingChecklistProps = {
  user: UserContext;
  projectCount: number;
};

const steps: { id: OnboardingStepId; label: string }[] = [
  { id: "organization", label: "Create or join organization" },
  { id: "first_project", label: "Create first project" },
  { id: "first_task", label: "Create first task" },
  { id: "first_meeting", label: "Create first meeting" },
  { id: "invite_team_member", label: "Invite team member" },
  { id: "send_feedback", label: "Send feedback" },
];

export function BetaOnboardingChecklist({ user, projectCount }: BetaOnboardingChecklistProps) {
  const analytics = useAnalytics();
  const repository = useMemo(() => new LocalOnboardingProgressRepository(), []);
  const [progress, setProgress] = useState<OnboardingProgress>(() => defaultOnboardingProgress);

  useEffect(() => {
    const loaded = repository.load(user.id);
    setProgress({
      ...loaded,
      organization: Boolean(user.organizationId) || loaded.organization,
      first_project: projectCount > 0 || loaded.first_project,
    });
  }, [projectCount, repository, user.id, user.organizationId]);

  useEffect(() => {
    repository.save(user.id, progress);
  }, [progress, repository, user.id]);

  function toggleStep(id: OnboardingStepId) {
    setProgress((current) => {
      const nextValue = !current[id];
      const next = { ...current, [id]: nextValue };
      if (nextValue) {
        analytics.trackEvent("onboarding_step_completed", { step_id: id }, {
          organization_id: user.organizationId,
          user_id: user.id,
          user_role: user.role,
          module_name: "onboarding",
          route: "/dashboard",
        });
      }
      return next;
    });
  }

  const completed = steps.filter((step) => progress[step.id]).length;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Beta Onboarding</h3>
          <p className="mt-0.5 text-xs text-[#5F6B73]">{completed} of {steps.length} complete</p>
        </div>
        <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 font-mono text-[10px] text-[#5F6B73]">0.6 beta</span>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => {
          const done = progress[step.id];
          const Icon = done ? CheckCircle2 : Circle;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => toggleStep(step.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[rgba(0,0,0,0.08)] bg-white text-[#5F6B73] hover:bg-[#F8F9FA]"}`}
            >
              <Icon size={14} />
              <span className="font-medium">{step.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
