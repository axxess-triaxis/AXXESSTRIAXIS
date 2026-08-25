import { ChevronRight, LogOut } from "lucide-react";
import { mobileMoreItems, type MobileFeatureId } from "./mobileFeatureRegistry";

type MobileMorePanelProps = {
  onNavigate: (id: MobileFeatureId) => void;
  onLogout: () => void;
};

// MN-1 (2026-08-23): the remaining registry entries not promoted to a primary bottom-tab slot
// (Meetings, Reminders, Projects, Knowledge Hub, CRM Notes, Settings) -- a plain, real tappable
// list, not a fabricated menu. Every row navigates via the same NavSection routing every other
// mobile tab uses.
export function MobileMorePanel({ onNavigate, onLogout }: MobileMorePanelProps) {
  return (
    <div className="flex flex-col px-4 py-3">
      <h1 className="mb-2 px-1 text-lg font-semibold text-[#0F1117]">More</h1>
      <div className="divide-y divide-[rgba(15,17,23,0.06)] rounded-xl border border-[rgba(15,17,23,0.08)] bg-white">
        {mobileMoreItems.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onNavigate(entry.id)}
            className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8F9FA]"
          >
            <entry.icon size={18} className="flex-shrink-0 text-[#8B1E2D]" />
            <span className="flex-1 text-sm font-medium text-[#0F1117]">{entry.label}</span>
            <ChevronRight size={16} className="flex-shrink-0 text-[#5F6B73]" />
          </button>
        ))}
      </div>

      {/* MN-6 (2026-08-24): the only reachable sign-out control in the native app -- MN-1 replaced
          TopBar.tsx (the desktop-only home of sign-out) with this shell and never carried the
          control over, leaving Android testers with no way to log out at all. See
          docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md, item 1. */}
      <button
        onClick={onLogout}
        aria-label="Sign out"
        className="mt-4 flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-[rgba(139,30,45,0.24)] bg-white px-4 py-3 text-left transition-colors hover:bg-[#FBEEEF]"
      >
        <LogOut size={18} className="flex-shrink-0 text-[#8B1E2D]" />
        <span className="flex-1 text-sm font-medium text-[#8B1E2D]">Sign out</span>
      </button>
    </div>
  );
}
