import { mobileFeatureRegistry, type MobileFeatureId } from "./mobileFeatureRegistry";
import { MobileActionButton } from "./MobileActionButton";

type MobileCommandHomeProps = {
  displayName?: string;
  onNavigate: (id: MobileFeatureId) => void;
};

// MN-1 (2026-08-23): "home" has no NavSection to route to (see mobileFeatureRegistry.ts's comment
// on why) -- this is a real, honest MVP for the Today tab, not a placeholder screen and not a
// fabricated summary. It greets the actual authenticated user and offers real, working navigation
// to every other registered surface. It deliberately does NOT show urgent-item counts, SLA
// breaches, or any other metric, because doing so without wiring a real query would repeat this
// program's own DEMO_DATA_LEAKAGE_AUDIT.md mistake (a real-looking number with nothing behind it).
// A genuine Command Home with real "what needs attention" data is explicit MN-2 scope per
// docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md.
export function MobileCommandHome({ displayName, onNavigate }: MobileCommandHomeProps) {
  const quickLinks = mobileFeatureRegistry.filter((entry) => entry.id !== "home");

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <h1 className="text-lg font-semibold text-[#0F1117]">
          {displayName ? `Hi, ${displayName.split(" ")[0]}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-xs text-[#5F6B73]">
          A full daily catch-up view is landing in the next mobile sprint. For now, jump straight
          into what you need below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {quickLinks.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onNavigate(entry.id)}
            className="flex min-h-[44px] flex-col items-start gap-1.5 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 text-left transition-colors hover:bg-[#F8F9FA]"
          >
            <entry.icon size={18} className="text-[#8B1E2D]" />
            <span className="text-xs font-semibold text-[#0F1117]">{entry.label}</span>
          </button>
        ))}
      </div>

      <MobileActionButton variant="secondary" onClick={() => onNavigate("ai-workspace")} className="w-full">
        Ask AXXESS a question
      </MobileActionButton>
    </div>
  );
}
