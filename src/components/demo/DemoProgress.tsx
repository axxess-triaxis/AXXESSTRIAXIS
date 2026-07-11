import { guidedDemoSteps } from "../../lib/demo/demoWorkflow";

export function DemoProgress({ currentIndex, progressPercent }: { currentIndex: number; progressPercent: number }) {
  return (
    <div aria-label="Guided demo progress">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">
        <span>Guided demo</span>
        <span className="font-mono">{currentIndex + 1}/{guidedDemoSteps.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(15,17,23,0.08)]">
        <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}
