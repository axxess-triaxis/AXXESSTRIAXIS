import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: [] as unknown[],
};

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

import { createSocialAlertRule, deleteSocialAlertRule, listSocialAlertRules } from "./socialAlertRulesRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function ruleRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "rule-1", organization_id: "org-1", provider: "facebook", keyword: "oxygen resilience",
    topic: "healthcare funding", urgency: "high", created_by: "user-1",
    created_at: "2026-08-04T00:00:00.000Z",
    ...overrides,
  };
}

describe("socialAlertRulesRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("returns a genuinely empty rule list for a tenant with none, not fabricated rules", async () => {
    state.responses = [[]];
    const rules = await listSocialAlertRules(scope);
    expect(rules).toEqual([]);
  });

  it("returns an empty list (not a throw) when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const rules = await listSocialAlertRules(scope);
    expect(rules).toEqual([]);
    expect(state.calls.length).toBe(0);
  });

  it("scopes list queries to the requesting organization only (tenant isolation)", async () => {
    state.responses = [[]];
    await listSocialAlertRules({ ...scope, organizationId: "org-42" });
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
  });

  it("creates a rule scoped to the caller's organization, defaulting urgency to medium", async () => {
    state.responses = [[ruleRow({ urgency: "medium" })]];
    const rule = await createSocialAlertRule(scope, { provider: "facebook", keyword: "oxygen resilience", topic: "healthcare funding" });
    expect(rule.keyword).toBe("oxygen resilience");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.organization_id).toBe("org-1");
    expect(body.urgency).toBe("medium");
    expect(body.created_by).toBe("user-1");
  });

  it("creates a rule with an explicit urgency when provided", async () => {
    state.responses = [[ruleRow()]];
    await createSocialAlertRule(scope, { provider: "facebook", keyword: "oxygen resilience", topic: "healthcare funding", urgency: "high" });
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.urgency).toBe("high");
  });

  it("throws instead of silently no-oping when creation isn't configured", async () => {
    state.isConfigured = false;
    await expect(createSocialAlertRule(scope, { provider: "facebook", keyword: "x", topic: "y" })).rejects.toThrow();
  });

  it("deletes a rule scoped by id AND organization_id, so cross-tenant deletes are impossible", async () => {
    state.responses = [[]];
    await deleteSocialAlertRule(scope, "rule-1");
    const call = state.calls[0];
    expect(call.options.method).toBe("DELETE");
    const query = call.options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.rule-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
  });
});
