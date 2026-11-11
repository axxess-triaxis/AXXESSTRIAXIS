import { describe, expect, it } from "vitest";
import { advanceEnrollment, planDueSends, type PlannerInput } from "./sequencePlanner";

const NOW = new Date("2026-11-12T06:00:00Z");
const DAY = 86_400_000;
const sequence = { id: "seq-1", steps: [{ dayOffset: 0 }, { dayOffset: 3 }, { dayOffset: 7 }] };

function lead(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, country: "IN", consentBasis: "b2b_legitimate_interest" as const, contactEmail: `${id}@acme.in`,
    status: "open" as const, registryStatus: "unchecked" as const, registryCheckedAt: null, ...overrides,
  };
}

function enrollment(id: string, leadId: string, overrides: Record<string, unknown> = {}) {
  return { id, leadId, sequenceId: "seq-1", stepIndex: 0, nextSendAt: new Date(NOW.getTime() - 1000), status: "active" as const, ...overrides };
}

function input(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    enrollments: [enrollment("e1", "l1")],
    leads: new Map([["l1", lead("l1")]]),
    sequences: new Map([["seq-1", sequence]]),
    suppressed: new Set(),
    attemptsByLead: new Map(),
    registrations: { dltIndia: false, tdraUae: false, counselSignedOff: false },
    dailySendBudget: 50,
    sentToday: 0,
    now: NOW,
    ...overrides,
  };
}

describe("planDueSends", () => {
  it("sends a due step to a lead the gate allows", () => {
    expect(planDueSends(input())).toEqual([{ kind: "send", enrollmentId: "e1", leadId: "l1", stepIndex: 0, to: "l1@acme.in" }]);
  });

  it("ignores enrollments that are not due or not active", () => {
    const enrollments = [
      enrollment("e1", "l1", { nextSendAt: new Date(NOW.getTime() + 1000) }),
      enrollment("e2", "l1", { status: "stopped" }),
    ];
    expect(planDueSends(input({ enrollments }))).toEqual([]);
  });

  it("stops the enrollment for permanent refusals: suppressed, no lawful basis, no email, lead closed", () => {
    const leads = new Map([
      ["l1", lead("l1")],
      ["l2", lead("l2", { consentBasis: null })],
      ["l3", lead("l3", { contactEmail: undefined })],
      ["l4", lead("l4", { status: "won" })],
    ]);
    const enrollments = ["l1", "l2", "l3", "l4"].map((l, i) => enrollment(`e${i + 1}`, l));
    expect(planDueSends(input({ enrollments, leads, suppressed: new Set(["l1@acme.in"]) }))).toEqual([
      { kind: "stop", enrollmentId: "e1", reasons: ["suppressed"] },
      { kind: "stop", enrollmentId: "e2", reasons: ["no_lawful_basis"] },
      { kind: "stop", enrollmentId: "e3", reasons: ["no_email_address"] },
      { kind: "stop", enrollmentId: "e4", reasons: ["lead_closed"] },
    ]);
  });

  it("defers to tomorrow when the frequency cap refuses", () => {
    const attemptsByLead = new Map([["l1", [{ channel: "email" as const, at: new Date(NOW.getTime() - 3600_000) }]]]);
    expect(planDueSends(input({ attemptsByLead }))).toEqual([
      { kind: "defer", enrollmentId: "e1", until: new Date(NOW.getTime() + DAY), reasons: ["frequency_cap_daily"] },
    ]);
  });

  it("stops at the daily send budget so a new domain warms up", () => {
    const leads = new Map(["l1", "l2", "l3"].map((id) => [id, lead(id)]));
    const enrollments = ["l1", "l2", "l3"].map((l, i) => enrollment(`e${i + 1}`, l));
    const plan = planDueSends(input({ enrollments, leads, dailySendBudget: 5, sentToday: 3 }));
    expect(plan.filter((a) => a.kind === "send").map((a) => a.enrollmentId)).toEqual(["e1", "e2"]);
  });

  it("never sends two steps to the same lead in one run", () => {
    const enrollments = [enrollment("e1", "l1"), enrollment("e2", "l1", { sequenceId: "seq-1" })];
    expect(planDueSends(input({ enrollments })).filter((a) => a.kind === "send")).toHaveLength(1);
  });
});

describe("advanceEnrollment", () => {
  it("schedules the next step by the difference in day offsets, then completes", () => {
    expect(advanceEnrollment({ stepIndex: 0 }, sequence, NOW)).toEqual({ stepIndex: 1, nextSendAt: new Date(NOW.getTime() + 3 * DAY), status: "active" });
    expect(advanceEnrollment({ stepIndex: 1 }, sequence, NOW)).toEqual({ stepIndex: 2, nextSendAt: new Date(NOW.getTime() + 4 * DAY), status: "active" });
    expect(advanceEnrollment({ stepIndex: 2 }, sequence, NOW)).toEqual({ stepIndex: 3, nextSendAt: null, status: "completed" });
  });
});
