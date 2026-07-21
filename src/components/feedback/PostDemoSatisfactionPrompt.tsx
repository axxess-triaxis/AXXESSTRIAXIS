"use client";

import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useAnalytics } from "../../services/analytics";
import type { UserContext } from "../../security/rbac";

type PostDemoSatisfactionPromptProps = {
  user?: UserContext | null;
  route: string;
  onDismiss: () => void;
};

export function PostDemoSatisfactionPrompt({ user, route, onDismiss }: PostDemoSatisfactionPromptProps) {
  const analytics = useAnalytics();
  const [responded, setResponded] = useState<"positive" | "negative" | null>(null);

  useEffect(() => {
    analytics.trackEvent("post_demo_satisfaction_shown", {}, {
      organization_id: user?.organizationId,
      user_id: user?.id,
      user_role: user?.role,
      module_name: "post-demo-satisfaction",
      route,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function respond(sentiment: "positive" | "negative") {
    setResponded(sentiment);
    analytics.trackEvent("post_demo_satisfaction_responded", { sentiment }, {
      organization_id: user?.organizationId,
      user_id: user?.id,
      user_role: user?.role,
      module_name: "post-demo-satisfaction",
      route,
    });
    setTimeout(onDismiss, 1200);
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[#0F1117]">
          {responded ? "Thanks for letting us know!" : "Before you go -- how did this demo land?"}
        </p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-[#5F6B73] hover:text-[#0F1117]">
          <X size={13} />
        </button>
      </div>
      {!responded && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => respond("positive")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] py-2 text-xs font-semibold text-[#5F6B73] hover:border-emerald-500 hover:text-emerald-600"
          >
            <ThumbsUp size={14} /> It landed well
          </button>
          <button
            type="button"
            onClick={() => respond("negative")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] py-2 text-xs font-semibold text-[#5F6B73] hover:border-rose-500 hover:text-rose-600"
          >
            <ThumbsDown size={14} /> Needs work
          </button>
        </div>
      )}
    </div>
  );
}
