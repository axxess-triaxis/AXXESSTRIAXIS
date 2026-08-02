import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isSupabaseConfigured: true,
  isVaultConfigured: true,
  connectionRows: [] as unknown[],
  vaultRows: [] as unknown[],
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isSupabaseConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    if (table === "integration_connections") return state.connectionRows;
    if (table === "oauth_token_vault") return state.vaultRows;
    return [];
  },
}));

vi.mock("../integrations/tokenVault", () => ({
  isTokenVaultConfigured: () => state.isVaultConfigured,
  openTokenBundle: () => ({ accessToken: "real-access-token", providerId: "threads", organizationId: "org-1", userId: "user-1" }),
}));

import { listConnectedSocialConnections, resolveSocialConnectionToken } from "./socialConnectionToken";

function connectionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "conn-1", organization_id: "org-1", provider_id: "threads", status: "connected", token_reference: "vault:threads:abc", ...overrides };
}

function vaultRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    organization_id: "org-1", user_id: "user-1", provider_id: "threads", token_reference: "vault:threads:abc",
    encrypted_payload: {}, algorithm: "aes-256-gcm", key_id: "k1", access_token_hash: "h1", refresh_token_hash: null,
    scopes: [], expires_at: null, oauth_subject: null,
    ...overrides,
  };
}

describe("resolveSocialConnectionToken", () => {
  afterEach(() => {
    state.isSupabaseConfigured = true;
    state.isVaultConfigured = true;
    state.connectionRows = [];
    state.vaultRows = [];
    state.calls = [];
    vi.clearAllMocks();
  });

  it("returns undefined (not a throw) when Supabase admin or the token vault isn't configured", async () => {
    state.isVaultConfigured = false;
    const result = await resolveSocialConnectionToken("org-1", "threads");
    expect(result).toBeUndefined();
    expect(state.calls.length).toBe(0);
  });

  it("returns undefined when the tenant has no connected connection for this provider, never guessing", async () => {
    state.connectionRows = [];
    const result = await resolveSocialConnectionToken("org-1", "threads");
    expect(result).toBeUndefined();
  });

  it("returns undefined when the connection exists but the vault record is missing", async () => {
    state.connectionRows = [connectionRow()];
    state.vaultRows = [];
    const result = await resolveSocialConnectionToken("org-1", "threads");
    expect(result).toBeUndefined();
  });

  it("resolves a real opened access token for a connected tenant, scoped to that organization only", async () => {
    state.connectionRows = [connectionRow()];
    state.vaultRows = [vaultRow()];
    const result = await resolveSocialConnectionToken("org-1", "threads");
    expect(result).toEqual({ connectionId: "conn-1", organizationId: "org-1", accessToken: "real-access-token" });

    const connectionQuery = state.calls.find((call) => call.table === "integration_connections")?.options.query as URLSearchParams;
    expect(connectionQuery.get("organization_id")).toBe("eq.org-1");
    expect(connectionQuery.get("provider_id")).toBe("eq.threads");
  });
});

describe("listConnectedSocialConnections", () => {
  afterEach(() => {
    state.isSupabaseConfigured = true;
    state.connectionRows = [];
    state.calls = [];
    vi.clearAllMocks();
  });

  it("returns a genuinely empty list when nothing is connected, not fabricated tenants", async () => {
    state.connectionRows = [];
    const result = await listConnectedSocialConnections("meta_business");
    expect(result).toEqual([]);
  });

  it("maps real rows across every tenant with a connected status", async () => {
    state.connectionRows = [{ id: "conn-1", organization_id: "org-1" }, { id: "conn-2", organization_id: "org-2" }];
    const result = await listConnectedSocialConnections("meta_business");
    expect(result).toEqual([{ id: "conn-1", organizationId: "org-1" }, { id: "conn-2", organizationId: "org-2" }]);
  });
});
