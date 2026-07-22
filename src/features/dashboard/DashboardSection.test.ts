import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/dashboard/DashboardSection.tsx"), "utf8");

describe("DashboardSection (Sprint 4 -- demo/live project data separation, F-018 root cause)", () => {
  it("never uses the demo project fallback as the unconditional initial state", () => {
    // Previously `useState<DashboardProject[]>(() => getDashboardFallbackProjects())` gave every
    // user -- live or demo -- 186 fabricated projects as the very first render, before the real
    // fetch resolved. This corrupted BetaOnboardingChecklist's projectCount prop (which starts at
    // this value) and, because that component's completion logic is `projectCount > 0 ||
    // loaded.first_project`, permanently marked the "first_project" onboarding step done for a
    // brand-new live tenant that had never created a project -- this was F-018's root cause, not a
    // bug in the onboarding widget itself.
    expect(source).not.toContain("useState<DashboardProject[]>(() => getDashboardFallbackProjects())");
    expect(source).toContain("useState<DashboardProject[]>(() => (isDemoModeEnabled() ? getDashboardFallbackProjects() : []))");
  });

  it("never falls back to demo projects on a live fetch failure", () => {
    expect(source).toContain("setProjects(isDemoModeEnabled() ? getDashboardFallbackProjects() : []);");
  });
});
