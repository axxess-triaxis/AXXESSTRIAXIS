import { afterEach, describe, expect, it, vi } from "vitest";

// Regression test for audit findings M21 and M22: issuing or revoking an agent key left no audit row,
// and neither did a refused attempt to do so.

const RAW_KEY = "synthetic-raw-key-value";
const state = {
  session: null as null | { accessToken: string; user: { id: string; organizationId: string; role: string } },
  records: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string }, accessToken: string) => ({ userId: user.id, accessToken }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: Record<string, unknown>) => {
      state.records.push(input);
      return undefined;
    },
  },
}));

vi.mock("../../../../services/agents/agentConnectionRepository", () => ({
  listAgentConnections: async () => [],
  createAgentConnection: async () => ({ connection: { id: "conn-1", provider: "anthropic", label: "L", capabilities: [] }, rawApiKey: RAW_KEY }),
  revokeAgentConnection: async () => undefined,
  updateAgentConnectionCapabilities: async (input: { connectionId: string }) => ({ id: input.connectionId, capabilities: [] }),
}));

vi.mock("../../../../services/agents/agentProfileRepository", () => ({
  getAgentProfile: async () => null,
}));

import { DELETE, GET, PATCH, POST } from "./route";

const admin = { accessToken: "t", user: { id: "u1", organizationId: "org-1", role: "Organization Admin" } };
const guest = { accessToken: "t", user: { id: "u2", organizationId: "org-1", role: "Guest" } };

function post() {
  return new Request("http://localhost/api/agents/connections", { method: "POST", body: JSON.stringify({ provider: "anthropic", label: "L" }) });
}

describe("agent connection audit", () => {
  afterEach(() => {
    state.session = null;
    state.records = [];
  });

  it("logs creating a key, without the key", async () => {
    state.session = admin;
    const response = await POST(post());
    expect(response.status).toBe(201);
    expect(state.records).toHaveLength(1);
    expect(state.records[0]).toMatchObject({ action: "agent_connection.created", resourceId: "conn-1" });
    expect(JSON.stringify(state.records)).not.toContain(RAW_KEY);
  });

  it("logs a capability change", async () => {
    state.session = admin;
    const response = await PATCH(new Request("http://localhost/api/agents/connections", { method: "PATCH", body: JSON.stringify({ id: "conn-1", capabilities: [] }) }));
    expect(response.status).toBe(200);
    expect(state.records[0]).toMatchObject({ action: "agent_connection.capabilities_updated", resourceId: "conn-1" });
  });

  it("logs revoking a key", async () => {
    state.session = admin;
    const response = await DELETE(new Request("http://localhost/api/agents/connections?id=conn-1", { method: "DELETE" }));
    expect(response.status).toBe(200);
    expect(state.records[0]).toMatchObject({ action: "agent_connection.revoked", resourceId: "conn-1" });
  });

  it("logs a refused write as access.denied", async () => {
    state.session = guest;
    const response = await POST(post());
    expect(response.status).toBe(403);
    expect(state.records).toHaveLength(1);
    expect(state.records[0]).toMatchObject({ action: "access.denied" });
    expect(state.records[0].metadata).toMatchObject({ route: "/api/agents/connections", method: "POST", role: "Guest" });
  });

  it("does not log a refused read, because pages make those routinely", async () => {
    state.session = guest;
    const response = await GET();
    expect(response.status).toBe(403);
    expect(state.records).toHaveLength(0);
  });
});
