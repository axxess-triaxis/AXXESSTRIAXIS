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

import { createAgentProfile, getAgentProfile, listAgentProfiles, revokeAgentProfile, updateAgentProfile } from "./agentProfileRepository";

function profileRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "profile-1",
    organization_id: "org-1",
    provider: "openai",
    display_name: "Read-only analyst bot",
    purpose: "Summarize dashboards",
    instructions: null,
    owner_user_id: "user-1",
    risk_tier: "low",
    default_capabilities: ["query_knowledge_hub", "list_projects"],
    policy_template: "read_only_analyst",
    status: "active",
    created_at: "2026-08-14T00:00:00.000Z",
    revoked_at: null,
    ...overrides,
  };
}

describe("agentProfileRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    vi.clearAllMocks();
  });

  // MCP3-2 required test: "profile creates scoped default capabilities"
  it("resolves default_capabilities from a named policy template when no explicit capabilities are given", async () => {
    state.responses = [[profileRow()]];

    const profile = await createAgentProfile({
      organizationId: "org-1",
      provider: "openai",
      displayName: "Read-only analyst bot",
      policyTemplateId: "read_only_analyst",
    });

    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.organization_id).toBe("org-1");
    expect(body.policy_template).toBe("read_only_analyst");
    expect(body.default_capabilities).toEqual(
      expect.arrayContaining(["query_knowledge_hub", "list_projects", "list_tasks", "list_meetings", "list_documents", "get_dashboard_snapshot", "list_stakeholders", "search_audit_logs"]),
    );
    expect(profile.id).toBe("profile-1");
    expect(profile.organizationId).toBe("org-1");
  });

  it("honors explicit capabilities over a policy template when both are given", async () => {
    state.responses = [[profileRow({ default_capabilities: ["create_task"], policy_template: null })]];

    await createAgentProfile({
      organizationId: "org-1",
      provider: "openai",
      displayName: "Custom bot",
      capabilities: ["create_task", "drop_tables"],
      policyTemplateId: "read_only_analyst",
    });

    const body = state.calls[0].options.body as Record<string, unknown>;
    // drop_tables is not a real capability -- normalizeAgentCapabilities filters it out, proving
    // this never silently grants an unknown tool even via an explicit capabilities array.
    expect(body.default_capabilities).toEqual(["create_task"]);
  });

  it("an unrecognized policy template and no explicit capabilities resolves to an empty capability set, not a fallback grant", async () => {
    state.responses = [[profileRow({ default_capabilities: [], policy_template: "not_a_real_template" })]];

    await createAgentProfile({
      organizationId: "org-1",
      provider: "openai",
      displayName: "Empty bot",
      policyTemplateId: "not_a_real_template",
    });

    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.default_capabilities).toEqual([]);
  });

  it("lists profiles scoped to the caller's organization only", async () => {
    state.responses = [[profileRow(), profileRow({ id: "profile-2" })]];
    const profiles = await listAgentProfiles("org-1");

    expect(profiles).toHaveLength(2);
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-1");
  });

  it("getAgentProfile is organization-scoped and returns undefined for a cross-tenant id", async () => {
    state.responses = [[]];
    const profile = await getAgentProfile("org-1", "profile-owned-by-another-org");
    expect(profile).toBeUndefined();
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-1");
  });

  it("updateAgentProfile only sends the fields that were actually provided", async () => {
    state.responses = [[profileRow({ display_name: "Renamed bot" })]];
    await updateAgentProfile({ organizationId: "org-1", profileId: "profile-1", displayName: "Renamed bot" });

    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body).toEqual({ display_name: "Renamed bot" });
  });

  it("revokes by organization-scoped id, so one tenant cannot revoke another tenant's profile", async () => {
    state.responses = [undefined];
    await revokeAgentProfile("org-1", "profile-1");

    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.profile-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
    expect((state.calls[0].options.body as Record<string, unknown>).status).toBe("revoked");
  });
});
