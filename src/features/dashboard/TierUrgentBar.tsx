import { useMemo } from "react";
import { CriticalityBadge } from "../../components/ui/CriticalityBadge";
import { qualifiesForUrgentAttention, type DashboardTier, type ScoredTile } from "../../services/dashboard/tileScoring";

const tierLabel: Record<DashboardTier, string> = {
  1: "Tier 1 · Performance",
  2: "Tier 2 · AI & BI",
  3: "Tier 3 · Compliance",
};

// Executive Dashboard Redesign Sprint ED-R1: filters to this tier's own urgent tiles (score >= 16)
// and renders a single-row horizontal strip. Collapses to null (zero height, not a styled-empty
// placeholder) when this tier has no qualifying tiles, so the common case -- most tiers quiet --
// doesn't reserve three bars' worth of permanent vertical space. Overflow scrolls horizontally,
// never grows vertically, keeping each bar's height bounded.
export function TierUrgentBar({ tier, tiles }: { tier: DashboardTier; tiles: ScoredTile[] }) {
  const urgentTiles = useMemo(
    () => tiles.filter((tile) => tile.tier === tier && qualifiesForUrgentAttention(tile.priority, tile.criticality)),
    [tiles, tier],
  );

  if (urgentTiles.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-red-700">{tierLabel[tier]}</span>
      <div className="flex flex-shrink-0 items-center gap-2">
        {urgentTiles.map((tile) => (
          <a
            key={tile.id}
            href={tile.route}
            className="flex flex-shrink-0 items-center gap-2 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs hover:border-red-300 hover:bg-red-50/60"
          >
            <CriticalityBadge criticality={tile.criticality} priority={tile.priority} />
            <span className="font-semibold text-[#0F1117]">{tile.title}</span>
            <span className="font-mono text-[#5F6B73]">{tile.value}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
