import { useMemo } from "react";
import { staggerDelay } from "../../lib/ui/staggerDelay";
import type { ScoredTile as ScoredTileType } from "../../services/dashboard/tileScoring";
import { ScoredTile } from "./ScoredTile";

// Executive Dashboard Redesign Sprint ED-R1: renders tiles in a responsive grid, sorted
// descending by score, row-major reading order -- NOT position:absolute corner-pinning. This is
// the "flexible left-weighted descending order" resolution to the plan doc's R6 finding (the
// PMC eye-tracking study found rigid corner-pinning underperforms flexible ordering): the
// highest-score tile lands first in reading order, which is the top-left cell of the first row in
// an LTR grid -- left-central for that row -- without literal absolute positioning.
export function TileGrid({ tiles }: { tiles: ScoredTileType[] }) {
  const sorted = useMemo(() => [...tiles].sort((a, b) => b.score - a.score), [tiles]);

  if (sorted.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {sorted.map((tile, index) => (
        <div key={tile.id} className="axxess-stagger-item" style={staggerDelay(index)}>
          <ScoredTile tile={tile} />
        </div>
      ))}
    </div>
  );
}
