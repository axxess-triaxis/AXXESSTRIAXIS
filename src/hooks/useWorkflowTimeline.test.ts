import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/hooks/useWorkflowTimeline.ts"), "utf8");

describe("useWorkflowTimeline", () => {
  it("keeps seeded workflow timeline events gated behind Demo Mode", () => {
    expect(source).toContain("isDemoModeEnabled()");
    expect(source).toContain("demoMode ? fallbackWorkflowTimelineEvents");
    expect(source).toContain(": []");
  });
});
