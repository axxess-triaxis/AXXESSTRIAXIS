"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { UserContext } from "../../security/rbac";
import { ChatbotPanel } from "./ChatbotPanel";

type ChatbotLauncherProps = {
  user: UserContext;
  routePath: string;
  moduleName: string;
};

// Mounted once inside AppShell.tsx, as a sibling of BetaFeedbackButton -- stacked directly above it
// on the same edge (bottom-20 vs bottom-5) so both floating triggers stay reachable without
// colliding, and are visually distinct (circular FAB vs. pill button).
export function ChatbotLauncher({ user, routePath, moduleName }: ChatbotLauncherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        id="chatbot-trigger"
        aria-label="Open AXXESS Copilot"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#8B1E2D] shadow-xl transition-colors hover:bg-[#7a1a27]"
      >
        <Sparkles size={18} className="text-white" />
      </button>
      {open && (
        <ChatbotPanel user={user} routePath={routePath} moduleName={moduleName} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
