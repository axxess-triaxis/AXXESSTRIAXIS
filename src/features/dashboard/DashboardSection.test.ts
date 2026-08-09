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
    // A-106 fix (2026-08-09): the initial-state seed uses isDemoModeSsrSafe(), not isDemoModeEnabled(),
    // since this useState initializer runs during SSR and during the client's hydration-time first
    // render -- isDemoModeEnabled() reads localStorage, which is unsafe there. See
    // docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md.
    expect(source).toContain("useState<DashboardProject[]>(() => (isDemoModeSsrSafe() ? getDashboardFallbackProjects() : []))");
  });

  it("never falls back to demo projects on a live fetch failure", () => {
    expect(source).toContain("setProjects(isDemoModeEnabled() ? getDashboardFallbackProjects() : []);");
  });
});

describe("DashboardSection (A-106 -- hydration-safe demo-mode read, 2026-08-09)", () => {
  it("reads demo mode via the hydration-safe hook in the render body, not the raw localStorage-reading function", () => {
    expect(source).toContain("const demoMode = useDemoModeEnabled();");
    expect(source).not.toContain("const demoMode = isDemoModeEnabled();");
  });
});
