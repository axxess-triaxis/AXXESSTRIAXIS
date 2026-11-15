import { afterEach, describe, expect, it, vi } from "vitest";

// Regression test for audit finding L18: every lead in a tenant was returned to everyone.

const state = { queries: [] as URLSearchParams[] };

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: async (_table: string, options: { query: URLSearchParams }) => {
    state.queries.push(options.query);
    return [];
  },
}));

import { listCrmLeads } from "./crmRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Employee" } as Parameters<typeof listCrmLeads>[0];

describe("listCrmLeads", () => {
  afterEach(() => {
    state.queries = [];
  });

  it("matches owner or creator when limited to one person", async () => {
    await listCrmLeads(scope, { ownerUserId: "user-1" });
    expect(state.queries[0].get("or")).toBe("(owner_user_id.eq.user-1,created_by.eq.user-1)");
    expect(state.queries[0].get("organization_id")).toBe("eq.org-1");
  });

  it("returns the whole tenant when not limited", async () => {
    await listCrmLeads(scope);
    expect(state.queries[0].get("or")).toBeNull();
  });
});
