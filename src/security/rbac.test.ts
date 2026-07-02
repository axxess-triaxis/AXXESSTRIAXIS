import { describe, expect, it } from "vitest";
import { routeForPath } from "../app/routing/routes";
import { canAccessRoute, mockCurrentUserContext } from "./rbac";

describe("mock RBAC route guards", () => {
  it("allows organization admin access to admin routes", () => {
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin"))).toBe(true);
  });

  it("allows guest route architecture without real auth", () => {
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/auth"))).toBe(true);
  });
});
