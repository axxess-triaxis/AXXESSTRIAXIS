"use client";

import { useEffect } from "react";
import { PartyPopper } from "lucide-react";

type WorkflowCompletionCelebrationProps = {
  message: string;
  onDismiss: () => void;
  autoDismissMs?: number;
};

export function WorkflowCompletionCelebration({ message, onDismiss, autoDismissMs = 3000 }: WorkflowCompletionCelebrationProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [onDismiss, autoDismissMs]);

  return (
    <div
      role="status"
      className="fixed right-5 top-5 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg"
    >
      <PartyPopper size={16} className="flex-shrink-0 text-emerald-600" />
      {message}
    </div>
  );
}
