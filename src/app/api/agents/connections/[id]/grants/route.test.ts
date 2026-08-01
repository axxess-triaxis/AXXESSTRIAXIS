import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  grants: [] as unknown[],
  revokeCalls: [] as Array<{ organizationId: string; grantId: string }>,
};

vi.mock("../../../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../../../services/agents/agentGrantsRepository", () => ({
  listGrants: async () => state.grants,
  revokeGrant: async (organizationId: string, grantId: string) => {
    state.revokeCalls.push({ organizationId, grantId });
  },
}));

import { DELETE, GET } from "./route";

function user(id: string, role: string, organizationId = "org-1") {
  return { id, organizationId, role };
}

describe("GET/DELETE /api/agents/connections/[id]/grants", () => {
  afterEach(() => {
    state.session = null;
    state.grants = [];
    state.revokeCalls = [];
    vi.clearAllMocks();
  });

  it("GET requires an admin role", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await GET(new Request("https://example.com"), { params: Promise.resolve({ id: "conn-1" }) });
    expect(response.status).toBe(403);
  });

  it("GET returns grants for the connection", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.grants = [{ id: "grant-1", toolName: "create_meeting" }];
    const response = await GET(new Request("https://example.com"), { params: Promise.resolve({ id: "conn-1" }) });
    const body = await response.json() as { grants: unknown[] };
    expect(response.status).toBe(200);
    expect(body.grants).toHaveLength(1);
  });

  it("DELETE requires grantId and revokes scoped to the caller's organization", async () => {
    state.session = { user: user("user-1", "Organization Admin", "org-7") };
    const missing = await DELETE(new Request("https://example.com/api/agents/connections/conn-1/grants"));
    expect(missing.status).toBe(400);

    const withId = await DELETE(new Request("https://example.com/api/agents/connections/conn-1/grants?grantId=grant-1"));
    expect(withId.status).toBe(200);
    expect(state.revokeCalls).toEqual([{ organizationId: "org-7", grantId: "grant-1" }]);
  });
});
