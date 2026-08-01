import { CriticalityBadge } from "../../components/ui/CriticalityBadge";
import type { DashboardTileDataState, ScoredTile as ScoredTileType } from "../../services/dashboard/tileScoring";

// Executive Dashboard Redesign Sprint ED-R1: generalizes TenantHealthCommandCenter.tsx's tile
// card shape (icon-less here since tiles now span many unrelated domains) into the scored-tile
// primitive every tier renders. Criticality band is the dominant visual element; the raw score is
// a small secondary label -- never the headline (plan doc section 6.5).
const dataStateStyles: Record<DashboardTileDataState, string> = {
  live: "bg-emerald-50 text-emerald-700",
  partial: "bg-amber-50 text-amber-700",
  "not-connected": "bg-[#F2F3F5] text-[#5F6B73]",
  empty: "bg-[#F2F3F5] text-[#5F6B73]",
  demo: "bg-[#8B1E2D]/8 text-[#8B1E2D]",
};

const dataStateLabels: Record<DashboardTileDataState, string> = {
  live: "Live",
  partial: "Partial",
  "not-connected": "Not connected",
  empty: "Empty",
  demo: "Demo",
};

export function ScoredTile({ tile }: { tile: ScoredTileType }) {
  const content = (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3 transition-colors hover:border-[#8B1E2D]/30 hover:bg-[#F8F9FA]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{tile.title}</span>
        <span className={"rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide " + dataStateStyles[tile.dataState]}>
          {dataStateLabels[tile.dataState]}
        </span>
      </div>
      <div className="font-mono text-lg font-semibold text-[#0F1117]">{tile.value}</div>
      <p className="flex-1 text-xs leading-relaxed text-[#5F6B73]">{tile.detail}</p>
      <div className="flex items-center justify-between gap-2">
        <CriticalityBadge criticality={tile.criticality} priority={tile.priority} />
        <span className="font-mono text-[10px] text-[#5F6B73]" title="Priority x Criticality score">
          Score {tile.score}
        </span>
      </div>
    </div>
  );

  if (!tile.route) return content;
  return (
    <a href={tile.route} className="block h-full focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/25 rounded-lg">
      {content}
    </a>
  );
}
