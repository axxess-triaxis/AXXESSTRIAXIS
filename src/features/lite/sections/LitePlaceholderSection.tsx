import type { LucideIcon } from "lucide-react";

// XL-1 (2026-08-05): honest shell-only placeholder, not a fake/demo-populated screen. XL-1's own
// scope is "surface separation and deploy/mobile readiness, not full product feature
// implementation" -- real data wiring (shared tasks/documents/stakeholders/RAG repositories) is
// XL-2's job per docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md. This component
// says so plainly instead of showing seeded-looking content that isn't real.
export function LitePlaceholderSection({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8B1E2D]/8 text-[#8B1E2D]">
        <Icon size={20} />
      </span>
      <h1 className="text-sm font-semibold text-[#0F1117]">{title}</h1>
      <p className="text-xs leading-relaxed text-[#5F6B73]">{description}</p>
      <p className="text-[11px] text-[#5F6B73]">This connects to your real data in an upcoming update. Nothing shown here is placeholder data pretending to be real.</p>
    </div>
  );
}
