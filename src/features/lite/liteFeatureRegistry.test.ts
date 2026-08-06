import { describe, expect, it } from "vitest";
import { liteFeatureLimit, liteFeatures } from "./liteFeatureRegistry";

// XL-5 (2026-08-06): the full assertion suite moved to
// packages/features-lite/src/liteFeatureRegistry.test.ts alongside the module itself. This file
// now only proves the backward-compat re-export shim still surfaces the real, current data.
describe("src/features/lite/liteFeatureRegistry.ts backward-compat shim", () => {
  it("re-exports the real feature registry from @axxess/features-lite, not a stale copy", () => {
    expect(liteFeatures).toHaveLength(liteFeatureLimit);
    expect(liteFeatures.map((feature) => feature.id)).toContain("dashboard");
  });
});
