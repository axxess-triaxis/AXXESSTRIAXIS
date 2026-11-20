import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  calls: [] as Array<{ table: string; options: { method?: string; query?: URLSearchParams; body?: Record<string, unknown> } }>,
  responses: [] as unknown[],
};

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: async (table: string, options: { method?: string; query?: URLSearchParams; body?: Record<string, unknown> }) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

import { completeMessageJob, findStackJobOwner, getOrgAgentSettings } from "./stackJobsRepository";

const JOB = "11111111-1111-4111-8111-111111111111";

describe("stackJobsRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
  });

  it("reads the owner from the product's own job table", async () => {
    state.responses = [[{ organization_id: "org-b", lead_id: "lead-1", requested_by: null, status: "calling" }], []];
    expect(await findStackJobOwner("callismatic", JOB)).toEqual({ organizationId: "org-b", leadId: "lead-1", requestedBy: null, status: "calling" });
    expect(await findStackJobOwner("omnidamus", JOB)).toBeNull();
    expect(state.calls.map((c) => c.table)).toEqual(["agent_call_jobs", "agent_message_jobs"]);
    expect(state.calls[0].options.query?.get("id")).toBe(`eq.${JOB}`);
  });

  it("never queries for a job id that is not a uuid", async () => {
    expect(await findStackJobOwner("callismatic", "1),organization_id.eq.x")).toBeNull();
    expect(await findStackJobOwner("omnidamus", "")).toBeNull();
    expect(state.calls).toEqual([]);
  });

  it("treats an organization without a settings row as everything off", async () => {
    state.responses = [[], [{ callismatic_enabled: true, omnidamus_enabled: false }]];
    expect(await getOrgAgentSettings("org-a")).toEqual({ callismaticEnabled: false, omnidamusEnabled: false });
    expect(await getOrgAgentSettings("org-b")).toEqual({ callismaticEnabled: true, omnidamusEnabled: false });
  });

  it("closes a message job only within its organization and only while it is open", async () => {
    state.responses = [[{ id: JOB }], []];
    expect(await completeMessageJob("org-b", JOB, { status: "completed", summary: "s".repeat(1200), taskId: null })).toBe(true);
    expect(await completeMessageJob("org-b", JOB, { status: "completed", summary: "again", taskId: null })).toBe(false);
    const query = state.calls[0].options.query;
    expect(query?.get("organization_id")).toBe("eq.org-b");
    expect(query?.get("status")).toBe("in.(queued,running)");
    expect(String(state.calls[0].options.body?.summary)).toHaveLength(1000);
  });
});
