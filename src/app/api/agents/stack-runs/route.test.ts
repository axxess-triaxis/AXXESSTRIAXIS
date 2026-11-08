import { afterEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  auditRows: [] as unknown[],
  calls: [] as Array<{ table: string; query?: URLSearchParams }>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseAdmin", () => ({
  supabaseAdminRest: async (table: string, options: { query?: URLSearchParams } = {}) => {
    state.calls.push({ table, query: options.query });
    return table === "audit_logs" ? state.auditRows : [];
  },
}));

import { GET } from "./route";

function user(role: string, organizationId = "org-1") {
  return { id: "user-1", organizationId, role };
}

describe("GET /api/agents/stack-runs", () => {
  afterEach(() => {
    state.session = null;
    state.auditRows = [];
    state.calls = [];
  });

  it("refuses anyone who is not signed in", async () => {
    expect((await GET()).status).toBe(401);
    expect(state.calls).toEqual([]);
  });

  it("refuses roles below Organization Admin, without reading data", async () => {
    for (const role of ["Executive", "Manager", "Employee", "Consultant", "Guest"]) {
      state.session = { user: user(role) };
      expect((await GET()).status).toBe(403);
    }
    expect(state.calls).toEqual([]);
  });

  it("reads only the caller's own organization's agent tool calls", async () => {
    state.session = { user: user("Organization Admin", "org-7") };

    const response = await GET();

    expect(response.status).toBe(200);
    const query = state.calls[0].query;
    expect(state.calls[0].table).toBe("audit_logs");
    expect(query?.get("organization_id")).toBe("eq.org-7");
    expect(query?.get("resource_type")).toBe("eq.agent_tool_call");
    expect(query?.get("created_at")).toMatch(/^gte\./);
  });

  it("returns the summarized snapshot", async () => {
    state.session = { user: user("Super Admin") };
    state.auditRows = [{
      id: "log-1",
      action: "agent.custom.tool.create_task",
      created_at: new Date().toISOString(),
      metadata: { toolName: "create_task", success: true, args: { title: "Call back", description: "From Callismatic (lead, voice) item c-1. STILL event evt-1." } },
    }];

    const body = await (await GET()).json();

    expect(body.totals).toEqual({ runs: 1, tasksCreated: 1, pending: 0, failed: 0 });
    expect(body.runs[0]).toMatchObject({ source: "callismatic", status: "task-created", stillEventId: "evt-1" });
  });
});
