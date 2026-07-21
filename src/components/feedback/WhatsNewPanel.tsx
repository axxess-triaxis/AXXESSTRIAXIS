"use client";

import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { useAnalytics } from "../../services/analytics";
import type { UserContext } from "../../security/rbac";

type WhatsNewPanelProps = {
  user?: UserContext | null;
  route: string;
  onDismiss: () => void;
};

// Per PRE_DEMO_ACTIONABLES.md A16: must reflect real shipped work, not placeholder copy. Update
// this list each release from ITERATION_PROGRESS.md's most recent entries -- these 3 are accurate
// as of Sprint 1/2 (merged to main via PR #146).
const recentEntries = [
  "Golden Path is now optional -- jump straight to what you need, or opt into the full guided setup.",
  "AI answers now show their sourcing rationale, not just the answer.",
  "Bulk-approve low-risk AI reviews in one click, without losing per-item audit logging.",
];

export function WhatsNewPanel({ user, route, onDismiss }: WhatsNewPanelProps) {
  const analytics = useAnalytics();

  useEffect(() => {
    analytics.trackEvent("whats_new_panel_viewed", { entry_count: recentEntries.length }, {
      organization_id: user?.organizationId,
      user_id: user?.id,
      user_role: user?.role,
      module_name: "whats-new",
      route,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismiss() {
    analytics.trackEvent("whats_new_panel_dismissed", {}, {
      organization_id: user?.organizationId,
      user_id: user?.id,
      user_role: user?.role,
      module_name: "whats-new",
      route,
    });
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[rgba(0,0,0,0.06)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#8B1E2D]" />
            <h2 className="text-sm font-semibold text-[#0F1117]">What&apos;s New</h2>
          </div>
          <button onClick={handleDismiss} className="rounded-lg p-1.5 text-[#5F6B73] hover:bg-[#F2F3F5]" aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <ul className="space-y-3 px-5 py-4">
          {recentEntries.map((entry) => (
            <li key={entry} className="flex gap-2 text-xs leading-relaxed text-[#3F4750]">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8B1E2D]" />
              {entry}
            </li>
          ))}
        </ul>
        <div className="border-t border-[rgba(0,0,0,0.06)] px-5 py-3">
          <button
            onClick={handleDismiss}
            className="w-full rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
