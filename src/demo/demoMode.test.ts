import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoDataset, demoDatasetSummary } from "./demoDataset";
import {
  demoSessionCookieName,
  demoUserContext,
  isDemoLogin,
  isDemoModeEnabled,
  isDemoModeForcedByEnv,
  refreshDemoSessionCookie,
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

const originalLocation = window.location;

// jsdom's history.pushState enforces same-origin, so it can't be used to simulate a request from a
// different hostname (e.g. lite.triaxisventures.com) the way a real cross-deployment Vercel
// project would see it -- stubbing window.location directly instead.
function stubWindowHostname(hostname: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: { ...originalLocation, hostname },
  });
}

afterEach(() => {
  window.localStorage.clear();
  document.cookie = `${demoSessionCookieName}=; path=/; max-age=0`;
  vi.unstubAllEnvs();
  resetDemoRepositoryStore();
  Object.defineProperty(window, "location", { writable: true, configurable: true, value: originalLocation });
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

  it("refreshDemoSessionCookie re-issues a fresh-TTL cookie without touching the localStorage flag (Attempt 4, 2026-07-24 stale-session fix)", () => {
    setDemoModeEnabled(true);
    expect(window.localStorage.getItem("axxess.demoMode.enabled")).toBe("true");
    document.cookie = `${demoSessionCookieName}=; path=/; max-age=0`;
    expect(document.cookie).not.toContain(`${demoSessionCookieName}=true`);

    refreshDemoSessionCookie();

    expect(document.cookie).toContain(`${demoSessionCookieName}=true`);
    expect(window.localStorage.getItem("axxess.demoMode.enabled")).toBe("true");
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

// XL-4 (2026-08-05): Investor Demo is an X0-only concept. NEXT_PUBLIC_ env vars are project-scoped
// and baked into the client bundle at build time -- so unlike src/proxy.ts's Edge Runtime host
// checks, this couldn't previously tell which Vercel project's deployment it was running in. If
// NEXT_PUBLIC_AXXESS_DEMO_MODE=true were ever copied onto the Lite Vercel project's env by
// mistake, it would have silently forced demo data on for the entire deployment, including inside
// /lite/* pages themselves. This closes that gap using window.location.hostname, which jsdom
// (this test environment) and real browsers both provide once hydrated.
describe("isDemoModeForcedByEnv refuses to honor NEXT_PUBLIC_AXXESS_DEMO_MODE on a Lite host (XL-4)", () => {
  it("is forced true on a normal (non-Lite) host when the env var is true, unchanged from before this sprint", () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "true");
    stubWindowHostname("investor.triaxisventures.com");

    expect(isDemoModeForcedByEnv()).toBe(true);
  });

  it("is false on the real custom Lite domain even when the env var is true", () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "true");
    stubWindowHostname("lite.triaxisventures.com");

    expect(isDemoModeForcedByEnv()).toBe(false);
  });

  it("is false on the *.vercel.app Lite domain even when the env var is true", () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "true");
    stubWindowHostname("triaxis-product-lite-web.vercel.app");

    expect(isDemoModeForcedByEnv()).toBe(false);
  });

  it("is false everywhere when the env var itself is not \"true\", independent of host", () => {
    stubWindowHostname("investor.triaxisventures.com");
    expect(isDemoModeForcedByEnv()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "false");
    expect(isDemoModeForcedByEnv()).toBe(false);
  });
});
