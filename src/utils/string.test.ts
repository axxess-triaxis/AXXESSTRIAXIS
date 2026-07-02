import { describe, expect, it } from "vitest";
import { compactLabel } from "./string";

describe("compactLabel", () => {
  it("trims and normalizes whitespace", () => {
    expect(compactLabel("  AXXESS   Enterprise   SaaS  ")).toBe("AXXESS Enterprise SaaS");
  });
});
