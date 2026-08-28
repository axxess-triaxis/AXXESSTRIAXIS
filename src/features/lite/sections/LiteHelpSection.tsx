"use client";

import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { surveyLinks } from "../../../services/feedback/surveyLinks";

// Lite Settings real-modules pass (2026-08-27): reuses the exact same three external surveys X0's
// BetaFeedbackModal already links to (see services/feedback/surveyLinks.ts) rather than resurrecting
// the inline rating/message form the founder explicitly replaced on X0 per A-116 -- one real
// feedback mechanism, not a second, lesser one just for Lite.
export function LiteHelpSection() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link href="/lite/settings" className="flex items-center gap-1 text-xs font-semibold text-[#5F6B73] hover:text-[#0F1117]">
        <ChevronLeft size={14} /> Settings
      </Link>
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Help & Support</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Get help or send feedback about AXXESS Lite.</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {surveyLinks.map((survey) => (
          <a
            key={survey.key}
            href={survey.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3.5 hover:border-[#8B1E2D]/30"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#8B1E2D]/8 text-[#8B1E2D]">
              <survey.icon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-[#0F1117]">{survey.title}</span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-[#5F6B73]">{survey.description}</span>
            </span>
            <ExternalLink size={13} className="flex-shrink-0 text-[#5F6B73]" />
          </a>
        ))}
      </div>
    </div>
  );
}
