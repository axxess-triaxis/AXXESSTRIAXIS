import { describe, expect, it } from "vitest";
import { DEFAULT_ROW_PAGE_SIZE, nextVisibleRowCount } from "./useVisibleRowCount";

describe("nextVisibleRowCount", () => {
  it("adds one page at a time", () => {
    expect(nextVisibleRowCount(DEFAULT_ROW_PAGE_SIZE, 2200)).toBe(DEFAULT_ROW_PAGE_SIZE * 2);
  });

  it("never goes past the total", () => {
    expect(nextVisibleRowCount(50, 60)).toBe(60);
    expect(nextVisibleRowCount(60, 60)).toBe(60);
  });
});
