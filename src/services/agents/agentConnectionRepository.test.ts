import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: [] as unknown[],
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

const env = { AXXESS_TOKEN_VAULT_KEY: "test-token-vault-key-with-at-least-32-characters" } as unknown as NodeJS.ProcessEnv;

import { createAgentConnection, listAgentConnections, resolveAgentScopeFromApiKey, revokeAgentConnection } from "./agentConnectionRepository";
import { hashAgentApiKey } from "./agentConnectionVault";

function connectionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "conn-1",
    organization_id: "org-1",
    provider: "openai",
    label: "Prod agent",
    api_key_hash: "irrelevant-unless-overridden",
    api_key_prefix: "axa_live_ab",
    capabilities: ["create_task", "query_knowledge_hub", "list_projects"],
    status: "active",
    issued_by_user_id: "user-1",
    issued_by_role: "Organization Admin",
    last_used_at: null,
    created_at: "2026-07-30T00:00:00.000Z",
    revoked_at: null,
    ...overrides,
  };
}

describe("agentConnectionRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("creates a connection, storing only the key's hash and returning the raw key exactly once", async () => {
    state.responses = [[connectionRow()]];
    const { connection, rawApiKey } = await createAgentConnection({
      organizationId: "org-1",
      provider: "openai",
      label: "Prod agent",
      issuedByUserId: "user-1",
      issuedByRole: "Organization Admin",
    }, env);

    expect(rawApiKey.startsWith("axa_live_")).toBe(true);
    expect(connection.id).toBe("conn-1");
    expect(connection.apiKeyPrefix).toBe("axa_live_ab");
    const insertedBody = state.calls[0].options.body as Record<string, unknown>;
    expect(insertedBody.api_key_hash).not.toBe(rawApiKey);
    expect(JSON.stringify(insertedBody)).not.toContain(rawApiKey);
  });

  it("lists connections scoped to the caller's organization only, via an organization_id filter", async () => {
    state.responses = [[connectionRow(), connectionRow({ id: "conn-2" })]];
    const connections = await listAgentConnections("org-1");

    expect(connections).toHaveLength(2);
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-1");
  });

  it("revokes by organization-scoped id, so one tenant cannot revoke another tenant's connection", async () => {
    state.responses = [undefined];
    await revokeAgentConnection("org-1", "conn-1");

    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.conn-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
    expect((state.calls[0].options.body as Record<string, unknown>).status).toBe("revoked");
  });

  it("resolves a valid raw key to an AgentScope and records last_used_at", async () => {
    const rawKey = "axa_live_test-key";
    const hash = hashAgentApiKey(rawKey, env);
    state.responses = [[connectionRow({ api_key_hash: hash })], undefined];

    const scope = await resolveAgentScopeFromApiKey(rawKey, env);

    expect(scope).toBeDefined();
    expect(scope?.organizationId).toBe("org-1");
    expect(scope?.agentConnectionId).toBe("conn-1");
    expect(scope?.provider).toBe("openai");
    expect(scope?.issuedByUserId).toBe("user-1");
    expect(state.calls[1].table).toBe("agent_connections");
    expect((state.calls[1].options.body as Record<string, unknown>).last_used_at).toBeTruthy();
  });

  it("returns undefined (not a zero-capability scope) for a key with no matching active connection -- avoids a confused-deputy path", async () => {
    state.responses = [[]];
    const scope = await resolveAgentScopeFromApiKey("axa_live_unknown", env);
    expect(scope).toBeUndefined();
  });

  it("returns undefined when the admin client isn't configured, rather than throwing", async () => {
    state.isConfigured = false;
    const scope = await resolveAgentScopeFromApiKey("axa_live_anything", env);
    expect(scope).toBeUndefined();
    expect(state.calls).toHaveLength(0);
  });
});
