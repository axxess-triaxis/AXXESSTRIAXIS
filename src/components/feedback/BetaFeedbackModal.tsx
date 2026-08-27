"use client";

import { ExternalLink, X } from "lucide-react";
import { useAnalytics } from "../../services/analytics";
import { surveyLinks as surveys } from "../../services/feedback/surveyLinks";
import type { UserContext } from "../../security/rbac";

type BetaFeedbackModalProps = {
  user: UserContext;
  moduleName: string;
  route: string;
  onClose: () => void;
};

// A-116 (2026-08-14): replaced the inline rating/message form (POST /api/beta-feedback -- kept
// as a real, working route, just no longer the entry point here) with direct links to the
// founder's real external surveys, per explicit instruction: "should have 3 links not this
// unempirical placeholder form." Each survey targets a different respondent -- routing people to
// the one meant for them beats one generic form asking everyone the same questions.
//
// 2026-08-27: the survey list itself moved to services/feedback/surveyLinks.ts so AXXESS Lite's
// own Help & Support tab (LiteHelpSection.tsx) can reuse the identical three links instead of
// resurrecting the deprecated inline form -- one list, not two that can drift out of sync.

export function BetaFeedbackModal({ user, moduleName, route, onClose }: BetaFeedbackModalProps) {
  const analytics = useAnalytics();

  function trackSurveyClick(surveyKey: string) {
    analytics.trackEvent("beta_feedback_link_clicked", { module: moduleName, survey: surveyKey }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: moduleName,
      route,
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="beta-feedback-title">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-gradient-to-br from-[#8B1E2D] to-[#6b1622] px-6 py-5">
          <div>
            <h2 id="beta-feedback-title" className="text-base font-semibold text-white">Help shape AXXESS</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/75">Pick the survey that matches how you use AXXESS -- two minutes, reviewed directly by the founding team.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2.5 p-5">
          {surveys.map((survey) => (
            <a
              key={survey.key}
              href={survey.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackSurveyClick(survey.key)}
              className="group flex items-center gap-3.5 rounded-xl border border-[rgba(0,0,0,0.07)] p-4 transition-all hover:border-[#8B1E2D]/30 hover:bg-[#FFF8F8] hover:shadow-sm"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#8B1E2D]/8 text-[#8B1E2D] transition-colors group-hover:bg-[#8B1E2D] group-hover:text-white">
                <survey.icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#0F1117]">{survey.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#5F6B73]">{survey.description}</span>
              </span>
              <ExternalLink size={14} className="flex-shrink-0 text-[#5F6B73] transition-colors group-hover:text-[#8B1E2D]" />
            </a>
          ))}
        </div>

        <div className="border-t border-[rgba(0,0,0,0.06)] px-6 py-3">
          <p className="text-[11px] text-[#5F6B73]">Release {analytics.releaseVersion}</p>
        </div>
      </div>
    </div>
  );
}
