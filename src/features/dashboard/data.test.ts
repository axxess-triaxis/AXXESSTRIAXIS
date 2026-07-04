import { describe, expect, it } from "vitest";
import { demoUserContext } from "../../demo/demoMode";
import type { TenantScope } from "../../repositories/interfaces";
import {
  dashboardFallbackScope,
  getDashboardFallbackKpis,
  getDashboardFallbackProjects,
  getDashboardKpis,
  getDashboardProjects,
} from "./data";

const cleanScope: TenantScope = {
  organizationId: "org_clean_tenant",
  userId: "user_clean_admin",
  role: "Organization Admin",
};

describe("dashboard fallback data", () => {
  it("renders investor preview metrics immediately", () => {
    const kpis = getDashboardFallbackKpis();
    const projects = getDashboardFallbackProjects();

    expect(dashboardFallbackScope.organizationId).toBe(demoUserContext.organizationId);
    expect(projects.length).toBeGreaterThan(100);
    expect(kpis.find((kpi) => kpi.label === "RAG Sources Indexed")?.value).toBe("2,200");
  });

  it("falls back to institutional data when production repositories are empty", async () => {
    const [projects, kpis] = await Promise.all([
      getDashboardProjects(cleanScope),
      getDashboardKpis(cleanScope),
    ]);

    expect(projects.length).toBeGreaterThan(100);
    expect(kpis.map((kpi) => kpi.label)).toContain("Pending Approvals");
  });
});
