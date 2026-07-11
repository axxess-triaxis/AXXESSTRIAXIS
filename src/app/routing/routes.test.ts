import { describe, expect, it } from "vitest";
import { routeForPath, routeForSection, sectionFromPath } from "./routes";

describe("enterprise route metadata", () => {
  it("maps canonical sections to Next paths", () => {
    expect(routeForSection("dashboard").path).toBe("dashboard");
    expect(routeForSection("projects").path).toBe("projects");
  });

  it("maps enterprise aliases to preserved feature sections", () => {
    expect(sectionFromPath("/programs")).toBe("projects");
    expect(sectionFromPath("/crm")).toBe("stakeholders");
    expect(routeForPath("/admin").section).toBe("settings");
    expect(routeForPath("/admin/beta-readiness").section).toBe("beta-readiness");
    expect(routeForPath("/admin/product-analytics").section).toBe("product-analytics");
  });

  it("maps Sprint 8 admin pages to role-protected routes", () => {
    expect(routeForSection("beta-readiness").path).toBe("admin/beta-readiness");
    expect(routeForSection("product-analytics").path).toBe("admin/product-analytics");
    expect(routeForPath("/admin/beta-readiness").requiredRoles).toEqual(["Super Admin", "Organization Admin"]);
  });

  it("maps Sprint 16 pilot admin and audit pages to protected routes", () => {
    expect(routeForSection("organization-admin").path).toBe("admin/organization");
    expect(routeForSection("audit-logs").path).toBe("admin/audit-logs");
    expect(sectionFromPath("/admin/organization")).toBe("organization-admin");
    expect(sectionFromPath("/admin/audit-logs")).toBe("audit-logs");
    expect(routeForPath("/admin/organization").requiredRoles).toEqual(["Super Admin", "Organization Admin"]);
    expect(routeForPath("/admin/audit-logs").requiredRoles).toEqual(["Super Admin", "Organization Admin"]);
  });
});
