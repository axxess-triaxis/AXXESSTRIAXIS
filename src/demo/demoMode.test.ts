import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoDataset, demoDatasetSummary } from "./demoDataset";
import {
  demoSessionCookieName,
  demoUserContext,
  isDemoLogin,
  isDemoModeEnabled,
  resetDemoEnvironment,
  setDemoModeEnabled,
} from "./demoMode";
import { demoProjectsRepository, demoKnowledgeSearchRepository, resetDemoRepositoryStore } from "./demoRepositories";
import type { TenantScope } from "../repositories/interfaces";

const demoScope: TenantScope = {
  organizationId: demoUserContext.organizationId,
  userId: demoUserContext.id,
  role: demoUserContext.role,
};

afterEach(() => {
  window.localStorage.clear();
  document.cookie = `${demoSessionCookieName}=; path=/; max-age=0`;
  vi.unstubAllEnvs();
  resetDemoRepositoryStore();
});

describe("Demo Mode", () => {
  it("creates a coherent institutional dataset at investor-preview scale", () => {
    const dataset = createDemoDataset();

    expect(dataset.organization.name).toBe(demoDatasetSummary.organizationName);
    expect(dataset.projects).toHaveLength(demoDatasetSummary.projects);
    expect(dataset.programs).toHaveLength(demoDatasetSummary.programs);
    expect(dataset.documents).toHaveLength(demoDatasetSummary.documents);
    expect(dataset.knowledgeArticles).toHaveLength(demoDatasetSummary.knowledgeArticles);
    expect(dataset.documentActivity).toHaveLength(demoDatasetSummary.activities);
    expect(dataset.institutional.approvals).toHaveLength(demoDatasetSummary.approvals);
    expect(dataset.auditLogs).toHaveLength(demoDatasetSummary.auditLogs);
    expect(new Set(dataset.projects.map((project) => project.organizationId))).toEqual(new Set([dataset.organization.id]));
  });

  it("sets a non-secret demo-session cookie the edge proxy can see, and clears it when disabled (Investor Preview fix, 2026-07-24)", () => {
    expect(document.cookie).not.toContain(`${demoSessionCookieName}=`);

    setDemoModeEnabled(true);
    expect(document.cookie).toContain(`${demoSessionCookieName}=true`);

    setDemoModeEnabled(false);
    expect(document.cookie).not.toContain(`${demoSessionCookieName}=true`);
  });

  it("can be enabled by storage, environment, or demo login", () => {
    expect(isDemoModeEnabled()).toBe(false);
    setDemoModeEnabled(true);
    expect(isDemoModeEnabled()).toBe(true);

    window.localStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "true");
    expect(isDemoModeEnabled()).toBe(true);
    expect(isDemoLogin("investor.preview@axxess.demo", "preview")).toBe(true);
    expect(isDemoLogin("demo@axxess.local", "demo")).toBe(true);
  });

  it("resets mutable demo repositories back to pristine seeded data", async () => {
    const originalProjects = await demoProjectsRepository.list(demoScope, { pageSize: 500 });

    await demoProjectsRepository.create(demoScope, {
      name: "Investor rehearsal project",
      ownerId: demoScope.userId,
      progress: 5,
      riskLevel: "low",
      priority: "medium",
      status: "planning",
      tags: ["rehearsal"],
    });
    expect(await demoProjectsRepository.list(demoScope, { pageSize: 500 })).toHaveLength(originalProjects.length + 1);

    resetDemoEnvironment();
    resetDemoRepositoryStore();

    expect(await demoProjectsRepository.list(demoScope, { pageSize: 500 })).toHaveLength(originalProjects.length);
  });

  it("searches demo Knowledge Hub content immediately", async () => {
    const results = await demoKnowledgeSearchRepository.search(demoScope, { search: "clinical", pageSize: 25 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.type === "document" || result.type === "article")).toBe(true);
  });
});
