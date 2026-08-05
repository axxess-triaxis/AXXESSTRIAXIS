"use client";

import Link from "next/link";
import { useAuth } from "../../../auth/AuthProvider";
import { liteNavItems } from "../liteNavigation";

// XL-1 (2026-08-05): Lite's home screen. Deliberately not the tiered/scored/criticality-banded
// Executive Dashboard (src/features/dashboard/DashboardSection.tsx) -- a small, fixed set of
// shortcuts only, per docs/readiness/AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md Section 4.
export function LiteHomeSection() {
  const { session } = useAuth();
  const firstName = session.user?.displayName?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <h1 className="text-base font-semibold text-[#0F1117]">Hi {firstName}</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Here&apos;s what you can do in AXXESS Lite.</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {liteNavItems
          .filter((item) => item.id !== "home")
          .map((item) => (
            <Link
              key={item.id}
              href={item.path}
              className="flex flex-col gap-1.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3.5 hover:border-[#8B1E2D]/30"
            >
              <item.icon size={17} className="text-[#8B1E2D]" />
              <span className="text-xs font-semibold text-[#0F1117]">{item.label}</span>
              <span className="text-[10px] leading-snug text-[#5F6B73]">{item.description}</span>
            </Link>
          ))}
      </div>
    </div>
  );
}
