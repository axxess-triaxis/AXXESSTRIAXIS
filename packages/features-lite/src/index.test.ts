import { describe, expect, it } from "vitest";
import { liteFeatureLimit, liteFeatures, liteNavItemForPath, liteNavItems, liteTopLevelNavLimit } from "./index";

// XL-5 (2026-08-06): package export integrity -- proves the package's public surface (what
// @axxess/features-lite's consumers actually see) re-exports both modules correctly, not just
// that the individual source files work in isolation.
describe("@axxess/features-lite package exports", () => {
  it("exports the navigation contract", () => {
    expect(liteNavItems.length).toBeGreaterThan(0);
    expect(liteTopLevelNavLimit).toBe(10);
    expect(liteNavItemForPath("/lite")?.id).toBe("home");
  });

  it("exports the feature registry", () => {
    expect(liteFeatures.length).toBe(liteFeatureLimit);
  });
});
