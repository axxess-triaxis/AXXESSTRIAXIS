import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("getDashboardProjects (Executive Dashboard Sprint ED-2 -- no fabricated budget/spent)", () => {
  afterEach(() => {
    vi.doUnmock("../../providers/serviceProvider");
    vi.resetModules();
  });

  it("never returns budget/spent fields, even when the underlying repository call succeeds", async () => {
    vi.resetModules();
    vi.doMock("../../providers/serviceProvider", () => ({
      applicationServices: {
        projectsRepository: {
          list: vi.fn().mockResolvedValue([
            { name: "District Outreach Program", progress: 40, riskLevel: "medium", status: "active", dueDate: "2026-12-01T00:00:00.000Z" },
            { name: "Cold-Chain Modernization", progress: 60, riskLevel: "low", status: "active", dueDate: "2026-11-01T00:00:00.000Z" },
          ]),
        },
        programsRepository: { list: vi.fn().mockResolvedValue([]) },
        usersRepository: { listByOrganization: vi.fn().mockResolvedValue([]) },
      },
    }));

    const { getDashboardProjects: getDashboardProjectsWithMock } = await import("./data");
    const projects = await getDashboardProjectsWithMock(cleanScope);

    expect(projects.length).toBe(2);
    for (const project of projects) {
      expect(project).not.toHaveProperty("budget");
      expect(project).not.toHaveProperty("spent");
    }
  });
});
