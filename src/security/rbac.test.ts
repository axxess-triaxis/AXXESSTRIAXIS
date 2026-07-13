import { describe, expect, it } from "vitest";
import { routeForPath } from "../app/routing/routes";
import { canAccessRoute, canAccessSection, isRoleName, mockCurrentUserContext, type UserContext } from "./rbac";

describe("mock RBAC route guards", () => {
  it("allows organization admin access to admin routes", () => {
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin"))).toBe(true);
  });

  it("allows guest route architecture without real auth", () => {
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/auth"))).toBe(true);
  });

  it("uses the enterprise role vocabulary", () => {
    expect(isRoleName("Organization Admin")).toBe(true);
    expect(isRoleName("Consultant")).toBe(true);
    expect(isRoleName("External Partner")).toBe(false);
  });

  it("restricts system sections to organization administrators", () => {
    const employee: UserContext = {
      id: "user_employee",
      organizationId: "org_public_safety",
      role: "Employee",
    };

    expect(canAccessSection(employee, "dashboard")).toBe(true);
    expect(canAccessSection(employee, "integrations")).toBe(false);
    expect(canAccessSection(employee, "settings")).toBe(false);
    expect(canAccessRoute(employee, routeForPath("/admin/beta-readiness"))).toBe(false);
  });

  it("lets consultants reach delivery data without administrative sections", () => {
    const consultant: UserContext = {
      id: "user_consultant",
      organizationId: "org_public_safety",
      role: "Consultant",
    };

    expect(canAccessSection(consultant, "projects")).toBe(true);
    expect(canAccessSection(consultant, "tasks")).toBe(true);
    expect(canAccessSection(consultant, "settings")).toBe(false);
  });

  it("lets leadership view settings while keeping the admin route restricted", () => {
    const manager: UserContext = {
      id: "user_manager",
      organizationId: "org_public_safety",
      role: "Manager",
    };

    expect(canAccessSection(manager, "settings")).toBe(true);
    expect(canAccessRoute(manager, routeForPath("/admin"))).toBe(false);
    expect(canAccessRoute(manager, routeForPath("/admin/product-analytics"))).toBe(false);
  });

  it("allows organization admins to view Sprint 8 beta admin pages", () => {
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/beta-readiness"))).toBe(true);
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/product-analytics"))).toBe(true);
  });

  it("restricts Sprint 16 tenant administration and audit logs to administrators", () => {
    const employee: UserContext = {
      id: "user_employee",
      organizationId: "org_public_safety",
      role: "Employee",
    };
    const manager: UserContext = {
      id: "user_manager",
      organizationId: "org_public_safety",
      role: "Manager",
    };

    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/organization"))).toBe(true);
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/audit-logs"))).toBe(true);
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/pilot-conversion"))).toBe(true);
    expect(canAccessRoute(employee, routeForPath("/admin/organization"))).toBe(false);
    expect(canAccessRoute(employee, routeForPath("/admin/audit-logs"))).toBe(false);
    expect(canAccessRoute(employee, routeForPath("/admin/pilot-conversion"))).toBe(false);
    expect(canAccessRoute(manager, routeForPath("/admin/organization"))).toBe(false);
    expect(canAccessRoute(manager, routeForPath("/admin/audit-logs"))).toBe(false);
    expect(canAccessRoute(manager, routeForPath("/admin/pilot-conversion"))).toBe(false);
  });
});
