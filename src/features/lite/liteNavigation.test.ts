import { describe, expect, it } from "vitest";
import { liteNavItems, liteTopLevelNavLimit } from "./liteNavigation";

// XL-5 (2026-08-06): the full navigation-contract assertion suite moved to
// packages/features-lite/src/liteNavigation.test.ts alongside the module itself. This file now
// only proves the backward-compat re-export shim (src/features/lite/liteNavigation.ts) still
// surfaces the real, current data -- i.e. "old /lite still uses correct Lite modules," not a
// duplicate of the package's own full behavioral coverage.
describe("src/features/lite/liteNavigation.ts backward-compat shim", () => {
  it("re-exports the real navigation contract from @axxess/features-lite, not a stale copy", () => {
    expect(liteNavItems.length).toBe(8);
    expect(liteTopLevelNavLimit).toBe(10);
    expect(liteNavItems.map((item) => item.id)).toEqual([
      "home", "work", "meetings", "projects", "people", "files", "ask", "settings",
    ]);
  });
});
