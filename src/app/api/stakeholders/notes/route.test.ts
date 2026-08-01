import { afterEach, describe, expect, it, vi } from "vitest";

// RAG Remediation Sprint 3 (A-57): this route is what makes a stakeholder note created from an
// approved AI Review Inbox escalation actually visible in the CRM workspace.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  notes: [] as Array<{ id: string; organizationId: string; title: string }>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

const listCalls: Array<{ organizationId: string }> = [];
vi.mock("../../../../repositories/workflowActionRepositories", () => ({
  stakeholderNotesRepository: {
    list: async (scope: { organizationId: string }) => {
      listCalls.push({ organizationId: scope.organizationId });
      return state.notes.filter((note) => note.organizationId === scope.organizationId);
    },
  },
}));

import { GET } from "./route";

function user(organizationId: string) {
  return { id: "user-1", organizationId, role: "Employee", accessToken: "token" };
}

describe("GET /api/stakeholders/notes (RAG Remediation Sprint 3, A-57)", () => {
  afterEach(() => {
    state.session = null;
    state.notes = [];
    listCalls.length = 0;
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns only the caller's own organization's notes", async () => {
    state.session = { user: user("org-1") };
    state.notes = [
      { id: "note-1", organizationId: "org-1", title: "Org 1 escalation" },
      { id: "note-2", organizationId: "org-2", title: "Org 2 escalation" },
    ];

    const response = await GET();
    const body = await response.json() as { notes: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.notes.map((note) => note.id)).toEqual(["note-1"]);
    expect(listCalls).toEqual([{ organizationId: "org-1" }]);
  });
});
