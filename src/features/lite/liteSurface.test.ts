import { describe, expect, it } from "vitest";
import { getLiteSurface, isForbiddenForLiteSurface, isLiteSurface, liteSurfaceId } from "./liteSurface";

describe("AXXESS Lite surface marker", () => {
  it("marks Lite as its own product surface", () => {
    expect(liteSurfaceId).toBe("lite");
    expect(getLiteSurface()).toBe("lite");
    expect(isLiteSurface("lite")).toBe(true);
  });

  it("does not let X0 or Demo activate Lite assumptions", () => {
    expect(isLiteSurface("x0")).toBe(false);
    expect(isLiteSurface("demo")).toBe(false);
    expect(isForbiddenForLiteSurface("x0")).toBe(true);
    expect(isForbiddenForLiteSurface("demo")).toBe(true);
  });
});
