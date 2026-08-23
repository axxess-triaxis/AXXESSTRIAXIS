import { ChevronRight } from "lucide-react";
import { mobileMoreItems, type MobileFeatureId } from "./mobileFeatureRegistry";

type MobileMorePanelProps = {
  onNavigate: (id: MobileFeatureId) => void;
};

// MN-1 (2026-08-23): the remaining registry entries not promoted to a primary bottom-tab slot
// (Meetings, Reminders, Projects, Knowledge Hub, CRM Notes, Settings) -- a plain, real tappable
// list, not a fabricated menu. Every row navigates via the same NavSection routing every other
// mobile tab uses.
export function MobileMorePanel({ onNavigate }: MobileMorePanelProps) {
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
    </div>
  );
}
