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

  it("shows a real tenant its own honest (possibly empty) data, never fabricated demo content", async () => {
    const [projects, kpis] = await Promise.all([
      getDashboardProjects(cleanScope),
      getDashboardKpis(cleanScope),
    ]);

    // A genuinely empty real tenant must see 0, not the ~186 fabricated investor-demo projects.
    // See DEMO_DATA_LEAKAGE_AUDIT.md.
    expect(projects.length).toBe(0);
    expect(kpis.map((kpi) => kpi.label)).toContain("Pending Approvals");
    expect(kpis.find((kpi) => kpi.label === "Pending Approvals")?.value).toBe("0");
  });
});
