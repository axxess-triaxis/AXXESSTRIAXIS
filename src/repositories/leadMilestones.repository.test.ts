import { afterEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; options: { method?: string; query?: URLSearchParams; body?: unknown; prefer?: string } };
const calls: Call[] = [];
let rowsFor: (table: string) => unknown[] = () => [];

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: async (table: string, options: Call["options"] = {}) => { calls.push({ table, options }); return rowsFor(table); },
}));

import { loadFunnel } from "./funnelRepository";
import { loadLeadHistory, recordMilestone } from "./leadWorkRepository";

const scope = { userId: "u1", organizationId: "org-1", role: "Manager" } as const;

describe("lead milestones in the repositories", () => {
  afterEach(() => { calls.length = 0; rowsFor = () => []; });

  it("records a milestone for the caller's organization and user", async () => {
    await recordMilestone(scope as never, "l1", { kind: "meeting_booked", occurredAt: "2026-11-15T10:00:00.000Z", note: "Demo" });
    expect(calls).toEqual([{ table: "lead_milestones", options: { method: "POST", prefer: "return=minimal", body: {
      organization_id: "org-1", lead_id: "l1", kind: "meeting_booked", occurred_at: "2026-11-15T10:00:00.000Z", note: "Demo", recorded_by: "u1",
    } } }]);
  });

  it("adds milestones to the lead history and leaves their audit rows out", async () => {
    rowsFor = (table) => table === "lead_milestones"
      ? [{ occurred_at: "2026-11-15T10:00:00Z", kind: "trial_started", note: null }]
      : table === "lead_replies" ? [{ created_at: "2026-11-14T10:00:00Z", category: "interested", subject: "Re", from_email: "a@b.in" }] : [];
    const history = await loadLeadHistory(scope as never, "l1");
    expect(history).toEqual([
      { kind: "milestone", at: "2026-11-15T10:00:00Z", milestone: "trial_started", note: null },
      { kind: "reply", at: "2026-11-14T10:00:00Z", category: "interested", subject: "Re", fromEmail: "a@b.in" },
    ]);
    const milestoneQuery = calls.find((c) => c.table === "lead_milestones")?.options.query;
    expect(milestoneQuery?.get("organization_id")).toBe("eq.org-1");
    expect(milestoneQuery?.get("lead_id")).toBe("eq.l1");
    expect(calls.find((c) => c.table === "audit_logs")?.options.query?.get("action")).toBe("not.in.(outreach.reply.received,crm.lead.milestone_recorded)");
  });

  it("the funnel counts meetings and trials from lead_milestones in the window; only paid stays untracked", async () => {
    rowsFor = (table) => table === "lead_milestones"
      ? [{ kind: "meeting_booked" }, { kind: "meeting_booked" }, { kind: "meeting_held" }, { kind: "trial_started" }]
      : [];
    const funnel = await loadFunnel(scope as never, 30, new Date("2026-11-15T00:00:00Z"));
    expect(funnel.activity).toMatchObject({ meetingsBooked: 2, meetingsHeld: 1, trialsStarted: 1 });
    expect(funnel.notTracked).toEqual(["paid"]);
    const query = calls.find((c) => c.table === "lead_milestones")?.options.query;
    expect(query?.get("organization_id")).toBe("eq.org-1");
    expect(query?.get("occurred_at")).toBe("gte.2026-10-16T00:00:00.000Z");
  });
});
