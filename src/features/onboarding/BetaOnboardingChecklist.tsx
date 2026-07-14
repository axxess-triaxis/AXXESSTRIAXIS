"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
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

const steps: { id: OnboardingStepId; label: string; route: string; detail: string }[] = [
  { id: "organization", label: "Confirm organization", route: "/admin/organization", detail: "Tenant profile, sector, owner, and live/demo separation" },
  { id: "invite_team_member", label: "Invite pilot team", route: "/admin/invitations", detail: "Sponsor, department lead, manager, and first employee" },
  { id: "role_assignment", label: "Assign roles", route: "/admin/roles", detail: "Organization Admin, Executive, Manager, Employee, Guest" },
  { id: "first_project", label: "Create first project", route: "/projects", detail: "One real workflow with owner, risk, dates, and stakeholder" },
  { id: "upload_document", label: "Upload first document", route: "/documents", detail: "Policy, SOP, budget memo, or meeting note" },
  { id: "first_ai_question", label: "Ask first AI/RAG question", route: "/ai-workspace", detail: "Cited answer, confidence, sources, and human review" },
  { id: "first_task", label: "Create first task", route: "/tasks", detail: "Task created from workflow or AI answer" },
  { id: "first_approval", label: "Request first approval", route: "/approvals", detail: "Human decision with policy note and audit trail" },
  { id: "view_audit_trail", label: "View audit trail", route: "/admin/audit-logs", detail: "Evidence chain for pilot sponsor and compliance review" },
  { id: "send_feedback", label: "Send feedback / request support", route: "/dashboard", detail: "Capture pilot friction, interest, and next meeting" },
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
        void fetch("/api/pilot-readiness-events", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId: id,
            eventType: "step_completed",
            source: "web",
            metadata: {
              project_count: projectCount,
              completed_count: steps.filter((step) => next[step.id]).length,
            },
          }),
        }).catch(() => undefined);
        analytics.trackEvent("pilot_onboarding_step_completed", { step_id: id }, {
          organization_id: user.organizationId,
          user_id: user.id,
          user_role: user.role,
          module_name: "onboarding",
          route: "/dashboard",
        });
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
  const progressPercent = Math.round((completed / steps.length) * 100);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Pilot Onboarding</h3>
          <p className="mt-0.5 text-xs text-[#5F6B73]">{completed} of {steps.length} complete - first 10 minutes of a real tenant</p>
        </div>
        <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 font-mono text-[10px] text-[#5F6B73]">{progressPercent}%</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#F2F3F5]">
        <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        {steps.map((step) => {
          const done = progress[step.id];
          const Icon = done ? CheckCircle2 : Circle;
          return (
            <div key={step.id} className={`rounded-lg border p-3 text-left text-xs transition-colors ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[rgba(0,0,0,0.08)] bg-white text-[#5F6B73]"}`}>
              <button type="button" onClick={() => toggleStep(step.id)} className="flex w-full items-start gap-2 text-left">
                <Icon size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  <span className="block font-semibold">{step.label}</span>
                  <span className="mt-1 block leading-relaxed">{step.detail}</span>
                </span>
              </button>
              <a href={step.route} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B1E2D]">
                Open <ArrowRight size={11} />
              </a>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
