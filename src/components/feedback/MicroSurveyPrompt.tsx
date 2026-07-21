"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAnalytics } from "../../services/analytics";
import type { UserContext } from "../../security/rbac";

type MicroSurveyPromptProps = {
  user?: UserContext | null;
  trigger: "ai_review_decision" | "golden_path_step";
  route: string;
  onDismiss: () => void;
};

const scores = [1, 2, 3, 4, 5];

export function MicroSurveyPrompt({ user, trigger, route, onDismiss }: MicroSurveyPromptProps) {
  const analytics = useAnalytics();
  const [respondedScore, setRespondedScore] = useState<number | null>(null);

  useEffect(() => {
    analytics.trackEvent("micro_survey_shown", { trigger }, {
      organization_id: user?.organizationId,
      user_id: user?.id,
      user_role: user?.role,
      module_name: "micro-survey",
      route,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function respond(score: number) {
    setRespondedScore(score);
    analytics.trackEvent("micro_survey_responded", { score, trigger }, {
      organization_id: user?.organizationId,
      user_id: user?.id,
      user_role: user?.role,
      module_name: "micro-survey",
      route,
    });
    setTimeout(onDismiss, 1200);
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[#0F1117]">
          {respondedScore ? "Thanks for the quick feedback!" : "Quick one: how useful was that?"}
        </p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-[#5F6B73] hover:text-[#0F1117]">
          <X size={13} />
        </button>
      </div>
      {!respondedScore && (
        <div className="mt-3 flex items-center justify-between gap-1.5">
          {scores.map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => respond(score)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.1)] text-xs font-bold text-[#5F6B73] hover:border-[#8B1E2D] hover:text-[#8B1E2D]"
            >
              {score}
            </button>
          ))}
        </div>
      )}
      {!respondedScore && (
        <div className="mt-1 flex items-center justify-between text-[10px] text-[#5F6B73]">
          <span>Not useful</span>
          <span>Very useful</span>
        </div>
      )}
    </div>
  );
}
