import { afterEach, describe, expect, it, vi } from "vitest";

// Regression test for audit finding M21: creating an agent profile left no audit row.

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

vi.mock("../../../../services/agents/agentProfileRepository", () => ({
  listAgentProfiles: async () => [],
  createAgentProfile: async () => ({ id: "profile-1", provider: "anthropic", displayName: "P" }),
}));

import { POST } from "./route";

const post = () => new Request("http://localhost/api/agents/profiles", { method: "POST", body: JSON.stringify({ provider: "anthropic", displayName: "P" }) });

describe("agent profile audit", () => {
  afterEach(() => {
    state.session = null;
    state.records = [];
  });

  it("logs creating a profile", async () => {
    state.session = { accessToken: "t", user: { id: "u1", organizationId: "org-1", role: "Organization Admin" } };
    const response = await POST(post());
    expect(response.status).toBe(201);
    expect(state.records).toHaveLength(1);
    expect(state.records[0]).toMatchObject({ action: "agent_profile.created", resourceType: "agent_profile", resourceId: "profile-1" });
  });

  it("logs a refused create as access.denied", async () => {
    state.session = { accessToken: "t", user: { id: "u2", organizationId: "org-1", role: "Guest" } };
    const response = await POST(post());
    expect(response.status).toBe(403);
    expect(state.records[0]).toMatchObject({ action: "access.denied" });
  });
});
