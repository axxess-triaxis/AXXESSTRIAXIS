import { useMemo } from "react";
import { SectionCard } from "../../components/enterprise";
import type { DashboardTier as DashboardTierNumber, ScoredTile } from "../../services/dashboard/tileScoring";
import { TileGrid } from "./TileGrid";

const tierCopy: Record<DashboardTierNumber, { title: string; description: string }> = {
  1: {
    title: "Tier 1 · Executive & performance",
    description: "Tasks, meetings, HITL review, approvals, projects, and customer-facing work.",
  },
  2: {
    title: "Tier 2 · AI operating infrastructure & business intelligence",
    description: "Knowledge indexing, workflow activity, integrations, and AI spend.",
  },
  3: {
    title: "Tier 3 · Compliance, audit, governance & policy",
    description: "Audit trail, compliance summaries, and financial governance.",
  },
};

export function DashboardTier({ tier, tiles }: { tier: DashboardTierNumber; tiles: ScoredTile[] }) {
  const tierTiles = useMemo(() => tiles.filter((t) => t.tier === tier), [tiles, tier]);
  const copy = tierCopy[tier];

  return (
    <SectionCard title={copy.title} description={copy.description}>
      <TileGrid tiles={tierTiles} />
    </SectionCard>
  );
}
