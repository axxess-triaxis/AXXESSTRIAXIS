import type { ScoredTile } from "../../services/dashboard/tileScoring";
import { TierUrgentBar } from "./TierUrgentBar";

// Executive Dashboard Redesign Sprint ED-R1: three stacked urgent-attention bars, one per tier.
//
// Positioning: AppShell.tsx renders the app's scrollable content inside <main
// className="overflow-y-auto">, with TopBar as a normal-flow sibling above it (not inside the
// scroll container) -- so DashboardSection (this stack's parent) is itself a child of that
// scrolling <main>. position: sticky (relative to that scrolling ancestor) is therefore the
// correct mechanism here, not position: fixed against the viewport -- sticky both (a) pins
// correctly below the already-non-scrolling TopBar with no header-height offset math required,
// and (b) reclaims its own space automatically when a bar collapses to zero height, since it
// stays in normal document flow. This resolves the plan doc's "verify PageShell header height +
// ResizeObserver-driven content offset" risk note by construction, not by extra plumbing.
export function UrgentAttentionBarStack({ tiles }: { tiles: ScoredTile[] }) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-2 bg-[#F8F9FA]/95 py-1 backdrop-blur-sm">
      <TierUrgentBar tier={1} tiles={tiles} />
      <TierUrgentBar tier={2} tiles={tiles} />
      <TierUrgentBar tier={3} tiles={tiles} />
    </div>
  );
}
