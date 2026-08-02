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

import { createFinancialWatchItem, listFinancialWatchItems, markFinancialWatchItemResolved, updateFinancialWatchItem } from "./financialWatchRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function watchItemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-1", organization_id: "org-1", title: "Q3 marketing budget", category: "budget",
    threshold_type: "above", threshold_amount: 50000, current_amount: 42000, currency: "USD",
    status: "open", owner_user_id: "user-1", due_at: null, notes: null,
    created_at: "2026-08-01T00:00:00.000Z", updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("financialWatchRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("returns a genuinely empty watchlist for a tenant with none, not fabricated balances", async () => {
    state.responses = [[]];
    const items = await listFinancialWatchItems(scope);
    expect(items).toEqual([]);
  });

  it("returns an empty list (not a throw) when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const items = await listFinancialWatchItems(scope);
    expect(items).toEqual([]);
    expect(state.calls.length).toBe(0);
  });

  it("scopes list queries to the requesting organization only (tenant isolation)", async () => {
    state.responses = [[]];
    await listFinancialWatchItems({ ...scope, organizationId: "org-42" });
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
  });

  it("creates a watch item scoped to the caller's organization, defaulting currency to USD", async () => {
    state.responses = [[watchItemRow()]];
    const item = await createFinancialWatchItem(scope, {
      title: "Q3 marketing budget", category: "budget", thresholdType: "above", thresholdAmount: 50000,
    });
    expect(item.title).toBe("Q3 marketing budget");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.organization_id).toBe("org-1");
    expect(body.currency).toBe("USD");
    expect(body.created_by).toBe("user-1");
  });

  it("updates an item scoped by id AND organization_id, so cross-tenant updates are impossible", async () => {
    state.responses = [[watchItemRow({ current_amount: 55000 })]];
    const item = await updateFinancialWatchItem(scope, "item-1", { currentAmount: 55000 });
    expect(item.currentAmount).toBe(55000);
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.item-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
  });

  it("throws rather than silently succeeding when an update matches no row (wrong tenant or missing id)", async () => {
    state.responses = [[]];
    await expect(updateFinancialWatchItem(scope, "item-999", { currentAmount: 1 })).rejects.toThrow();
  });

  it("marking an item resolved sends status='resolved'", async () => {
    state.responses = [[watchItemRow({ status: "resolved" })]];
    const item = await markFinancialWatchItemResolved(scope, "item-1");
    expect(item.status).toBe("resolved");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.status).toBe("resolved");
  });
});
