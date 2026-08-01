import { describe, expect, it } from "vitest";
import { routeForPath } from "../app/routing/routes";
import { assertOrganizationAccess, canAccessRoute, canAccessSection, canManageOrganization, isRoleName, mockCurrentUserContext, type UserContext } from "./rbac";

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

  it("restricts Sprint 20 and 21 platform control routes to administrators", () => {
    const manager: UserContext = {
      id: "user_manager",
      organizationId: "org_public_safety",
      role: "Manager",
    };

    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/plugin-runtime"))).toBe(true);
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/model-policy"))).toBe(true);
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/execution-runs"))).toBe(true);
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/usage-limits"))).toBe(true);
    expect(canAccessRoute(mockCurrentUserContext, routeForPath("/admin/support-ops"))).toBe(true);
    expect(canAccessRoute(manager, routeForPath("/admin/plugin-runtime"))).toBe(false);
    expect(canAccessRoute(manager, routeForPath("/admin/model-policy"))).toBe(false);
  });

  // Sprint 3 finding: "Super Admin" is a self-selectable role at onboarding (packages/shared/src
  // axxessBetaRoles), not a cross-tenant platform-operator role -- there is no such role in this
  // codebase. canManageOrganization/assertOrganizationAccess previously let a "Super Admin" scope
  // manage or claim access to an arbitrary organizationId; both must always match the acting
  // user's own organization regardless of role.
  describe("canManageOrganization / assertOrganizationAccess (Sprint 3 tenant-isolation fix)", () => {
    const superAdminOrgA: UserContext = {
      id: "user_super_admin",
      organizationId: "org_a",
      role: "Super Admin",
    };
    const orgAdminOrgA: UserContext = {
      id: "user_org_admin",
      organizationId: "org_a",
      role: "Organization Admin",
    };
    const employeeOrgA: UserContext = {
      id: "user_employee",
      organizationId: "org_a",
      role: "Employee",
    };

    it("allows Super Admin and Organization Admin to manage only their own organization", () => {
      expect(canManageOrganization(superAdminOrgA, "org_a")).toBe(true);
      expect(canManageOrganization(orgAdminOrgA, "org_a")).toBe(true);
    });

    it("blocks a Super Admin from managing a different organization, even by naming its id", () => {
      expect(canManageOrganization(superAdminOrgA, "org_b")).toBe(false);
    });

    it("blocks a non-admin role even for their own organization", () => {
      expect(canManageOrganization(employeeOrgA, "org_a")).toBe(false);
    });

    it("assertOrganizationAccess throws for any cross-organization id, regardless of role", () => {
      expect(() => assertOrganizationAccess(superAdminOrgA, "org_b")).toThrow("Cross-organization access denied.");
      expect(() => assertOrganizationAccess(superAdminOrgA, "org_a")).not.toThrow();
    });
  });
});
