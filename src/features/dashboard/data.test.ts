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

  // A-20 (2026-08-15): proves getDashboardProjects reuses a prefetched {projectRecords,
  // programRecords} pair instead of calling projectsRepository.list/programsRepository.list itself
  // -- the fix for the duplicate fetch this function shared with getDashboardStrategicObjectives.
  it("reuses prefetched project/program records instead of calling projectsRepository.list/programsRepository.list itself", async () => {
    vi.resetModules();
    const projectsListMock = vi.fn().mockRejectedValue(new Error("should not be called -- prefetched data was supplied"));
    const programsListMock = vi.fn().mockRejectedValue(new Error("should not be called -- prefetched data was supplied"));
    vi.doMock("../../providers/serviceProvider", () => ({
      applicationServices: {
        projectsRepository: { list: projectsListMock },
        programsRepository: { list: programsListMock },
        usersRepository: { listByOrganization: vi.fn().mockResolvedValue([]) },
      },
    }));

    const { getDashboardProjects: getDashboardProjectsWithMock } = await import("./data");
    const prefetched = {
      projectRecords: [{ name: "Prefetched Project", progress: 25, riskLevel: "low", status: "active", dueDate: "2026-12-01T00:00:00.000Z" }],
      programRecords: [],
    } as never;

    const projects = await getDashboardProjectsWithMock(cleanScope, prefetched);

    expect(projectsListMock).not.toHaveBeenCalled();
    expect(programsListMock).not.toHaveBeenCalled();
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe("Prefetched Project");
  });
});

describe("getDashboardStrategicObjectives (Executive Dashboard Sprint ED-3 -- derived MVP)", () => {
  afterEach(() => {
    vi.doUnmock("../../providers/serviceProvider");
    vi.resetModules();
  });

  it("derives one objective per real program, averaging that program's own linked projects' progress", async () => {
    vi.resetModules();
    vi.doMock("../../providers/serviceProvider", () => ({
      applicationServices: {
        programsRepository: {
          list: vi.fn().mockResolvedValue([
            { id: "prog-1", name: "District Health Modernization", status: "active" },
            { id: "prog-2", name: "Empty Program", status: "planning" },
          ]),
        },
        projectsRepository: {
          list: vi.fn().mockResolvedValue([
            { programId: "prog-1", progress: 40 },
            { programId: "prog-1", progress: 60 },
            { programId: "prog-other", progress: 100 },
          ]),
        },
      },
    }));

    const { getDashboardStrategicObjectives: getObjectivesWithMock } = await import("./data");
    const objectives = await getObjectivesWithMock(cleanScope);

    expect(objectives).toHaveLength(2);
    const linked = objectives.find((objective) => objective.name === "District Health Modernization");
    expect(linked?.projectCount).toBe(2);
    expect(linked?.averageProgress).toBe(50);
    const empty = objectives.find((objective) => objective.name === "Empty Program");
    expect(empty?.projectCount).toBe(0);
    expect(empty?.averageProgress).toBe(0);
  });

  it("returns an empty list, not fabricated objectives, when the repository call fails", async () => {
    vi.resetModules();
    vi.doMock("../../providers/serviceProvider", () => ({
      applicationServices: {
        programsRepository: { list: vi.fn().mockRejectedValue(new Error("network error")) },
        projectsRepository: { list: vi.fn().mockResolvedValue([]) },
      },
    }));

    const { getDashboardStrategicObjectives: getObjectivesWithMock } = await import("./data");
    const objectives = await getObjectivesWithMock(cleanScope);

    expect(objectives).toEqual([]);
  });

  // A-20 (2026-08-15): mirrors the getDashboardProjects test above -- proves
  // getDashboardStrategicObjectives reuses prefetched records instead of re-fetching them itself.
  it("reuses prefetched project/program records instead of re-fetching them itself", async () => {
    vi.resetModules();
    const programsListMock = vi.fn().mockRejectedValue(new Error("should not be called -- prefetched data was supplied"));
    const projectsListMock = vi.fn().mockRejectedValue(new Error("should not be called -- prefetched data was supplied"));
    vi.doMock("../../providers/serviceProvider", () => ({
      applicationServices: {
        programsRepository: { list: programsListMock },
        projectsRepository: { list: projectsListMock },
      },
    }));

    const { getDashboardStrategicObjectives: getObjectivesWithMock } = await import("./data");
    const prefetched = {
      programRecords: [{ id: "prog-1", name: "Prefetched Program", status: "active" }],
      projectRecords: [{ programId: "prog-1", progress: 80 }],
    } as never;

    const objectives = await getObjectivesWithMock(cleanScope, prefetched);

    expect(programsListMock).not.toHaveBeenCalled();
    expect(projectsListMock).not.toHaveBeenCalled();
    expect(objectives).toHaveLength(1);
    expect(objectives[0].name).toBe("Prefetched Program");
    expect(objectives[0].averageProgress).toBe(80);
  });
});
