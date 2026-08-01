import type { CriticalityBand } from "../../services/dashboard/tileScoring";

// Executive Dashboard Redesign Sprint ED-R1: a genuinely 5-tone badge for the new 5-point
// Criticality scale. RiskBadge.tsx is a 3-tone badge (red/amber/emerald) and cannot represent
// Yellow/Orange as visually distinct from Green/Amber -- this is a new component, not an
// extension of RiskBadge, per the plan doc's explicit "do not collapse 5-band criticality into
// the old 3-band RiskBadge" instruction.
const styles: Record<CriticalityBand, string> = {
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  yellow: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  orange: "bg-orange-50 text-orange-700 border border-orange-200",
  amber: "bg-amber-50 text-amber-800 border border-amber-300",
  red: "bg-red-50 text-red-700 border border-red-200",
};

const labels: Record<CriticalityBand, string> = {
  green: "Green",
  yellow: "Yellow",
  orange: "Orange",
  amber: "Amber",
  red: "Red",
};

export function CriticalityBadge({ criticality, priority }: { criticality: CriticalityBand; priority?: number }) {
  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono " + styles[criticality]}>
      {labels[criticality]}
      {priority !== undefined && <span className="opacity-70">&middot; P{priority}</span>}
    </span>
  );
}
