// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  projects: [] as Array<{ id: string; organizationId: string; name: string; tags: string[] }>,
  tasks: [] as Array<{ id: string; organizationId: string; title: string; tags: string[] }>,
  meetings: [] as Array<{ id: string; organizationId: string; title: string }>,
  documents: [] as Array<{ id: string; organizationId: string; name: string; tags: string[] }>,
  archivedDocumentIds: [] as string[],
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

const recordedAudits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }, accessToken?: string) => ({
    userId: user.id, organizationId: user.organizationId, role: user.role, accessToken,
  }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: { action: string; metadata?: Record<string, unknown> }) => {
      recordedAudits.push(input);
      return { id: "audit-1" };
    },
  },
  projectsRepository: { list: async () => state.projects },
  tasksRepository: { list: async () => state.tasks },
  meetingsRepository: { list: async () => state.meetings },
  documentsRepository: {
    list: async () => state.documents,
    archive: async (_scope: unknown, id: string) => {
      state.archivedDocumentIds.push(id);
      return { id };
    },
  },
}));

import { DELETE, GET } from "./route";

const orgId = "org-1";

function sampleFixtures() {
  state.projects = [
    { id: "proj-1", organizationId: orgId, name: "Sample: District Outreach Program", tags: ["sample-data"] },
    { id: "proj-2", organizationId: orgId, name: "Real Client Rollout", tags: [] },
  ];
  state.tasks = [
    { id: "task-1", organizationId: orgId, title: "Sample: Confirm district coordinator contacts", tags: ["sample-data"] },
    { id: "task-2", organizationId: orgId, title: "Real deliverable", tags: [] },
  ];
  state.meetings = [
    { id: "meet-1", organizationId: orgId, title: "Sample: Weekly Coordination Review" },
    { id: "meet-2", organizationId: orgId, title: "Real board sync" },
  ];
  state.documents = [
    { id: "doc-1", organizationId: orgId, name: "Sample: District Oxygen Resilience Note", tags: ["sample-data"] },
    { id: "doc-2", organizationId: orgId, name: "Real policy doc", tags: [] },
  ];
}

describe("/api/onboarding/sample-data", () => {
  afterEach(() => {
    state.session = null;
    state.projects = [];
    state.tasks = [];
    state.meetings = [];
    state.documents = [];
    state.archivedDocumentIds = [];
    recordedAudits.length = 0;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it("counts real sample-tagged/titled records across all four entity kinds", async () => {
      state.session = { user: { id: "user-1", organizationId: orgId, role: "Employee" } };
      sampleFixtures();

      const response = await GET();
      const body = await response.json() as { projects: number; tasks: number; meetings: number; documents: number; total: number };

      expect(body).toEqual({ projects: 1, tasks: 1, meetings: 1, documents: 1, total: 4 });
    });

    it("returns zero counts when no sample data exists, never a fabricated non-zero count", async () => {
      state.session = { user: { id: "user-1", organizationId: orgId, role: "Employee" } };
      state.projects = [{ id: "proj-2", organizationId: orgId, name: "Real Client Rollout", tags: [] }];

      const response = await GET();
      const body = await response.json() as { total: number };
      expect(body.total).toBe(0);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      const response = await DELETE();
      expect(response.status).toBe(401);
    });

    it("returns 403 for a non-admin role", async () => {
      state.session = { user: { id: "user-1", organizationId: orgId, role: "Employee" } };
      const response = await DELETE();
      expect(response.status).toBe(403);
    });

    it("hard-deletes sample projects/tasks/meetings and archives sample documents, leaving real records untouched", async () => {
      state.session = { user: { id: "user-1", organizationId: orgId, role: "Organization Admin" }, accessToken: "user-token" };
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
      sampleFixtures();

      const deletedUrls: string[] = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
        expect(init?.method).toBe("DELETE");
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer user-token");
        deletedUrls.push(url);
        return new Response(null, { status: 204 });
      }));

      const response = await DELETE();
      const body = await response.json() as { removed: { projects: number; tasks: number; meetings: number; documentsArchived: number }; failures: string[] };

      expect(response.status).toBe(200);
      expect(body.removed).toEqual({ projects: 1, tasks: 1, meetings: 1, documentsArchived: 1 });
      expect(body.failures).toHaveLength(0);
      expect(deletedUrls).toEqual(expect.arrayContaining([
        "https://example.supabase.co/rest/v1/tasks?id=eq.task-1",
        "https://example.supabase.co/rest/v1/projects?id=eq.proj-1",
        "https://example.supabase.co/rest/v1/meetings?id=eq.meet-1",
      ]));
      expect(deletedUrls.some((url) => url.includes("proj-2") || url.includes("task-2") || url.includes("meet-2"))).toBe(false);
      expect(state.archivedDocumentIds).toEqual(["doc-1"]);
      expect(recordedAudits[0]?.action).toBe("onboarding.sample_data_removed");
    });

    it("reports real per-record failures instead of silently claiming success", async () => {
      state.session = { user: { id: "user-1", organizationId: orgId, role: "Organization Admin" }, accessToken: "user-token" };
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
      state.projects = [{ id: "proj-1", organizationId: orgId, name: "Sample: District Outreach Program", tags: ["sample-data"] }];
      vi.stubGlobal("fetch", vi.fn(async () => new Response("locked", { status: 409 })));

      const response = await DELETE();
      const body = await response.json() as { removed: { projects: number }; failures: string[] };

      expect(response.status).toBe(200);
      expect(body.removed.projects).toBe(0);
      expect(body.failures).toHaveLength(1);
    });
  });
});
