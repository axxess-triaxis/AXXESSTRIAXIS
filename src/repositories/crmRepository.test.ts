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

import { countStalledLeads, createCrmLead, listCrmLeads, listFollowUpsDue, updateCrmLead } from "./crmRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function leadRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "lead-1", organization_id: "org-1", stakeholder_id: null, title: "New enterprise pilot",
    organization_name: "Acme Health", contact_name: "J. Doe", stage: "new", estimated_value: null,
    currency: null, priority: "medium", owner_user_id: "user-1", next_follow_up_at: null,
    status: "open", source: null, created_at: "2026-08-01T00:00:00.000Z", updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("crmRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("returns a genuinely empty list for a tenant with no leads, not fabricated data", async () => {
    state.responses = [[]];
    const leads = await listCrmLeads(scope);
    expect(leads).toEqual([]);
  });

  it("returns an empty list (not a throw) when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const leads = await listCrmLeads(scope);
    expect(leads).toEqual([]);
    expect(state.calls.length).toBe(0);
  });

  it("scopes list queries to the requesting organization only (tenant isolation)", async () => {
    state.responses = [[]];
    await listCrmLeads({ ...scope, organizationId: "org-42" });
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
  });

  it("creates a lead scoped to the caller's organization, defaulting stage/status/priority", async () => {
    state.responses = [[leadRow()]];
    const lead = await createCrmLead(scope, { title: "New enterprise pilot" });

    expect(lead.title).toBe("New enterprise pilot");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.organization_id).toBe("org-1");
    expect(body.created_by).toBe("user-1");
    expect(body.stage).toBe("new");
    expect(body.status).toBe("open");
  });

  it("updates a lead, scoped by id AND organization_id so cross-tenant updates are impossible", async () => {
    state.responses = [[leadRow({ stage: "proposal" })]];
    const lead = await updateCrmLead(scope, "lead-1", { stage: "proposal" });

    expect(lead.stage).toBe("proposal");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.lead-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
  });

  it("throws rather than silently returning a fabricated lead when the update matches no row", async () => {
    state.responses = [[]];
    await expect(updateCrmLead(scope, "lead-999", { stage: "won" })).rejects.toThrow();
  });

  it("identifies follow-ups due as open leads whose next_follow_up_at has passed", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const leads = [
      leadRow({ id: "due", status: "open", next_follow_up_at: "2026-08-01T00:00:00.000Z" }),
      leadRow({ id: "future", status: "open", next_follow_up_at: "2026-08-05T00:00:00.000Z" }),
      leadRow({ id: "stalled-no-date", status: "stalled", next_follow_up_at: null }),
    ].map((row) => ({
      id: row.id as string, organizationId: "org-1", title: "x", stage: "new" as const,
      priority: "medium" as const, status: row.status as "open" | "stalled",
      nextFollowUpAt: row.next_follow_up_at ?? undefined, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    }));

    const due = listFollowUpsDue(leads, now);
    expect(due.map((lead) => lead.id)).toEqual(["due"]);
  });

  it("counts only status='stalled' leads as stalled opportunities", () => {
    const leads = [
      { id: "a", organizationId: "org-1", title: "x", stage: "new" as const, priority: "medium" as const, status: "stalled" as const, createdAt: "", updatedAt: "" },
      { id: "b", organizationId: "org-1", title: "x", stage: "new" as const, priority: "medium" as const, status: "open" as const, createdAt: "", updatedAt: "" },
      { id: "c", organizationId: "org-1", title: "x", stage: "new" as const, priority: "medium" as const, status: "stalled" as const, createdAt: "", updatedAt: "" },
    ];
    expect(countStalledLeads(leads)).toBe(2);
  });
});
