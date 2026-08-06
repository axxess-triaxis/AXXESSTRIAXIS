import { describe, expect, it } from "vitest";
import { liteNavItems, liteTopLevelNavLimit } from "./liteNavigation";

// XL-2 (2026-08-05): the production navigation contract's hard cap ("Do not exceed 10 top-level
// nav items without founder approval") and the approved Option A 8-item list, enforced as tests,
// not just documentation. See
// docs/readiness/AXXESS_LITE_PRODUCTION_SCOPE_AND_NAVIGATION_CONTRACT_2026_08_05.md Section 6.
// XL-5 (2026-08-06): moved here from src/features/lite/liteNavigation.test.ts alongside the
// module itself.
describe("AXXESS Lite navigation contract", () => {
  it("never exceeds the founder-approved top-level nav limit (10)", () => {
    expect(liteNavItems.length).toBeLessThanOrEqual(liteTopLevelNavLimit);
  });

  it("matches the approved Option A contract exactly: Home, Work, Meetings, Projects, People, Files, Ask AXXESS, Settings", () => {
    expect(liteNavItems.map((item) => item.label)).toEqual([
      "Home",
      "Work",
      "Meetings",
      "Projects",
      "People",
      "Files",
      "Ask AXXESS",
      "Settings",
    ]);
  });

  it("has 8 top-level items, inside the 8-10 range the contract's soft constraint prefers", () => {
    expect(liteNavItems.length).toBe(8);
  });

  it("has no duplicate ids or paths", () => {
    const ids = liteNavItems.map((item) => item.id);
    const paths = liteNavItems.map((item) => item.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every path starts with /lite", () => {
    for (const item of liteNavItems) {
      expect(item.path.startsWith("/lite")).toBe(true);
    }
  });

  it("does not expose enterprise vocabulary in top-level labels (Tenant Health, Golden Path, Admin, Command Center)", () => {
    const labels = liteNavItems.map((item) => item.label).join(" ");
    expect(labels).not.toMatch(/tenant health|golden path|command center|admin console/i);
  });

  it("Settings folds in Payments/Billing and Help as documented sub-items, not as separate top-level entries", () => {
    expect(liteNavItems.some((item) => item.label === "Payments")).toBe(false);
    expect(liteNavItems.some((item) => item.label === "Help")).toBe(false);
    const settings = liteNavItems.find((item) => item.id === "settings");
    expect(settings?.subItems).toContain("Billing");
    expect(settings?.subItems).toContain("Help & Support");
  });
});
