import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  connections: [] as unknown[],
  createResult: null as null | { connection: unknown; rawApiKey: string },
  revokeCalls: [] as Array<{ organizationId: string; connectionId: string }>,
  updateCalls: [] as Array<{ organizationId: string; connectionId: string; capabilities: unknown }>,
  updateResult: null as unknown,
  createCalls: [] as Array<Record<string, unknown>>,
  profile: null as null | { status: "active" | "revoked"; defaultCapabilities: string[] },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../services/agents/agentConnectionRepository", () => ({
  listAgentConnections: async () => state.connections,
  createAgentConnection: async (input: Record<string, unknown>) => {
    state.createCalls.push(input);
    return state.createResult;
  },
  revokeAgentConnection: async (organizationId: string, connectionId: string) => {
    state.revokeCalls.push({ organizationId, connectionId });
  },
  updateAgentConnectionCapabilities: async (input: { organizationId: string; connectionId: string; capabilities: unknown }) => {
    state.updateCalls.push(input);
    return state.updateResult ?? { id: input.connectionId, capabilities: input.capabilities };
  },
}));

// MCP3-2: connection creation can optionally be issued from a named agent profile.
vi.mock("../../../../services/agents/agentProfileRepository", () => ({
  getAgentProfile: async () => state.profile,
}));

import { DELETE, GET, PATCH, POST } from "./route";

function user(id: string, role: string, organizationId = "org-1") {
  return { id, organizationId, role };
}

describe("GET/POST/DELETE /api/agents/connections", () => {
  afterEach(() => {
    state.session = null;
    state.connections = [];
    state.createResult = null;
    state.revokeCalls = [];
    state.updateCalls = [];
    state.updateResult = null;
    state.createCalls = [];
    state.profile = null;
    vi.clearAllMocks();
  });

  it("GET requires an authenticated session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("GET requires an admin role -- a Manager cannot see agent connections", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("GET returns the caller's connections for an Organization Admin", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.connections = [{ id: "conn-1" }];
    const response = await GET();
    const body = await response.json() as { connections: unknown[] };
    expect(response.status).toBe(200);
    expect(body.connections).toHaveLength(1);
  });

  it("POST rejects an unsupported provider", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const request = new Request("https://example.com/api/agents/connections", { method: "POST", body: JSON.stringify({ provider: "gemini" }) });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("POST issues a real key for a supported provider and returns it exactly once", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.createResult = { connection: { id: "conn-1", provider: "openai" }, rawApiKey: "axa_live_abc" };
    const request = new Request("https://example.com/api/agents/connections", { method: "POST", body: JSON.stringify({ provider: "openai", label: "Prod" }) });
    const response = await POST(request);
    const body = await response.json() as { connection: { id: string }; rawApiKey: string };
    expect(response.status).toBe(201);
    expect(body.rawApiKey).toBe("axa_live_abc");
    expect(body.connection.id).toBe("conn-1");
  });

  it("PATCH updates a connection's explicit capability list for the caller's organization", async () => {
    state.session = { user: user("user-1", "Organization Admin", "org-7") };
    const request = new Request("https://example.com/api/agents/connections", {
      method: "PATCH",
      body: JSON.stringify({ id: "conn-1", capabilities: ["create_task", "list_tasks"] }),
    });

    const response = await PATCH(request);
    const body = await response.json() as { connection: { id: string; capabilities: string[] } };

    expect(response.status).toBe(200);
    expect(state.updateCalls).toEqual([{ organizationId: "org-7", connectionId: "conn-1", capabilities: ["create_task", "list_tasks"] }]);
    expect(body.connection.capabilities).toEqual(["create_task", "list_tasks"]);
  });

  it("PATCH rejects unsupported capabilities instead of silently granting unknown tools", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const request = new Request("https://example.com/api/agents/connections", {
      method: "PATCH",
      body: JSON.stringify({ id: "conn-1", capabilities: ["create_task", "drop_tables"] }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    expect(state.updateCalls).toHaveLength(0);
  });

  it("DELETE requires an id and revokes scoped to the caller's own organization", async () => {
    state.session = { user: user("user-1", "Organization Admin", "org-7") };
    const missingId = await DELETE(new Request("https://example.com/api/agents/connections", { method: "DELETE" }));
    expect(missingId.status).toBe(400);

    const withId = await DELETE(new Request("https://example.com/api/agents/connections?id=conn-1", { method: "DELETE" }));
    expect(withId.status).toBe(200);
    expect(state.revokeCalls).toEqual([{ organizationId: "org-7", connectionId: "conn-1" }]);
  });

  // MCP3-2: connection creation can optionally be issued from a named agent profile.
  it("POST with an active agentProfileId issues the connection using that profile's default capabilities", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.profile = { status: "active", defaultCapabilities: ["query_knowledge_hub", "list_projects"] };
    state.createResult = { connection: { id: "conn-1", provider: "openai" }, rawApiKey: "axa_live_abc" };
    const request = new Request("https://example.com/api/agents/connections", {
      method: "POST",
      body: JSON.stringify({ provider: "openai", label: "Analyst", agentProfileId: "profile-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(state.createCalls[0]).toMatchObject({ agentProfileId: "profile-1", capabilities: ["query_knowledge_hub", "list_projects"] });
  });

  it("POST with a revoked or unknown agentProfileId rejects rather than silently ignoring it", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.profile = null;
    const request = new Request("https://example.com/api/agents/connections", {
      method: "POST",
      body: JSON.stringify({ provider: "openai", agentProfileId: "profile-does-not-exist" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(state.createCalls).toHaveLength(0);
  });
});
