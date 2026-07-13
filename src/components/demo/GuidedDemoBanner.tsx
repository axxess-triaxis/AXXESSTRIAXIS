"use client";

import type { NavSection } from "../../app/navigation";
import { useGuidedDemo } from "../../hooks/useGuidedDemo";
import { DemoProgress } from "./DemoProgress";

export function GuidedDemoBanner({ activeSection, onNavigate }: { activeSection: NavSection; onNavigate: (section: NavSection) => void }) {
  const demo = useGuidedDemo(activeSection, onNavigate);

  if (!demo.active) return null;

  return (
    <div className="mb-5 rounded-lg border border-[#8B1E2D]/20 bg-white p-4 shadow-[0_8px_24px_rgba(15,17,23,0.06)]">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_auto] lg:items-center">
        <DemoProgress currentIndex={demo.currentIndex} progressPercent={demo.progressPercent} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[#8B1E2D]/8 px-2 py-1 text-[11px] font-semibold text-[#8B1E2D]">Demo workflow using seeded enterprise data</span>
            <span className="rounded-lg bg-[#F2F3F5] px-2 py-1 text-[11px] font-semibold text-[#5F6B73]">{demo.currentStep.proof}</span>
          </div>
          <h2 className="mt-2 text-sm font-semibold text-[#0F1117]">{demo.currentStep.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{demo.currentStep.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={demo.goPrevious}
            disabled={demo.isFirstStep}
            className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          {demo.isLastStep ? (
            <a href="mailto:founders@triaxis.ventures?subject=AXXESS%20pilot%20request" className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27]">
              Request pilot
            </a>
          ) : (
            <button type="button" onClick={demo.goNext} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27]">
              {demo.currentStep.cta}
            </button>
          )}
          <button type="button" onClick={demo.stopDemo} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
