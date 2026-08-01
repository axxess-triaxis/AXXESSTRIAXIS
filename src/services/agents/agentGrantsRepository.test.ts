import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: [] as unknown[],
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

import { createGrant, hasGrant, listGrants, revokeGrant } from "./agentGrantsRepository";

describe("agentGrantsRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    vi.clearAllMocks();
  });

  it("hasGrant queries only active (non-revoked) grants for the exact connection+tool", async () => {
    state.responses = [[{ id: "grant-1" }]];
    const granted = await hasGrant("conn-1", "create_meeting");

    expect(granted).toBe(true);
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("agent_connection_id")).toBe("eq.conn-1");
    expect(query.get("tool_name")).toBe("eq.create_meeting");
    expect(query.get("revoked_at")).toBe("is.null");
  });

  it("hasGrant returns false when no active grant exists", async () => {
    state.responses = [[]];
    expect(await hasGrant("conn-1", "create_meeting")).toBe(false);
  });

  it("createGrant upserts on (agent_connection_id, tool_name) and clears revoked_at, so re-granting after a revoke re-activates it", async () => {
    state.responses = [[{
      id: "grant-1", organization_id: "org-1", agent_connection_id: "conn-1", tool_name: "create_meeting",
      granted_by_user_id: "user-1", granted_at: "2026-07-30T00:00:00.000Z", revoked_at: null,
    }]];

    const grant = await createGrant({ organizationId: "org-1", agentConnectionId: "conn-1", toolName: "create_meeting", grantedByUserId: "user-1" });

    expect(grant.toolName).toBe("create_meeting");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("on_conflict")).toBe("agent_connection_id,tool_name");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.revoked_at).toBeNull();
  });

  it("listGrants filters to the organization and, optionally, one connection", async () => {
    state.responses = [[]];
    await listGrants("org-1", "conn-1");

    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-1");
    expect(query.get("agent_connection_id")).toBe("eq.conn-1");
    expect(query.get("revoked_at")).toBe("is.null");
  });

  it("revokeGrant is scoped to the organization, so one tenant cannot revoke another's grant", async () => {
    state.responses = [undefined];
    await revokeGrant("org-1", "grant-1");

    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.grant-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
    expect((state.calls[0].options.body as Record<string, unknown>).revoked_at).toBeTruthy();
  });
});
