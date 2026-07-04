"use client";

import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { useAnalytics } from "../../services/analytics";
import type { UserContext } from "../../security/rbac";
import { BetaFeedbackModal } from "./BetaFeedbackModal";

type BetaFeedbackButtonProps = {
  user: UserContext;
  moduleName: string;
  route: string;
};

export function BetaFeedbackButton({ user, moduleName, route }: BetaFeedbackButtonProps) {
  const analytics = useAnalytics();
  const [open, setOpen] = useState(false);

  function openFeedback() {
    analytics.trackEvent("feedback_opened", { module: moduleName }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: moduleName,
      route,
    });
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openFeedback}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-xs font-semibold text-[#0F1117] shadow-lg transition-colors hover:bg-[#F8F9FA]"
      >
        <MessageSquareText size={14} className="text-[#8B1E2D]" /> Send Feedback
      </button>
      {open && <BetaFeedbackModal user={user} moduleName={moduleName} route={route} onClose={() => setOpen(false)} />}
    </>
  );
}
