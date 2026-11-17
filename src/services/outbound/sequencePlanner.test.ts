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

describe("business-hours send window", () => {
  // 2026-11-12 is a Thursday. India is UTC+05:30, the UAE is UTC+04:00, neither has daylight saving.
  const at = (iso: string) => new Date(iso);
  const plan = (country: string, now: Date) => planDueSends(input({
    leads: new Map([["l1", lead("l1", { country })]]),
    enrollments: [enrollment("e1", "l1", { nextSendAt: new Date(now.getTime() - 1000) })],
    now,
  }));
  const wait = [{ kind: "wait", enrollmentId: "e1", reason: "outside_send_window" }];

  it("India: waits before 09:00 and from 18:00 IST, sends from 09:00", () => {
    expect(plan("IN", at("2026-11-12T03:29:00Z"))).toEqual(wait); // 08:59
    expect(plan("IN", at("2026-11-12T03:30:00Z"))[0].kind).toBe("send"); // 09:00
    expect(plan("IN", at("2026-11-12T12:29:00Z"))[0].kind).toBe("send"); // 17:59
    expect(plan("IN", at("2026-11-12T13:00:00Z"))).toEqual(wait); // 18:30
  });

  it("UAE: sends at 17:59 and waits from 18:00 Gulf time", () => {
    expect(plan("AE", at("2026-11-12T13:59:00Z"))[0].kind).toBe("send");
    expect(plan("AE", at("2026-11-12T14:00:00Z"))).toEqual(wait);
  });

  it("India sends on Saturday and waits on Sunday", () => {
    expect(plan("IN", at("2026-11-14T05:30:00Z"))[0].kind).toBe("send"); // Sat 11:00
    expect(plan("IN", at("2026-11-15T05:30:00Z"))).toEqual(wait); // Sun 11:00
  });

  it("UAE waits on Saturday and Sunday and sends on Friday", () => {
    expect(plan("AE", at("2026-11-13T06:00:00Z"))[0].kind).toBe("send"); // Fri 10:00
    expect(plan("AE", at("2026-11-14T06:00:00Z"))).toEqual(wait); // Sat 10:00
    expect(plan("AE", at("2026-11-15T06:00:00Z"))).toEqual(wait); // Sun 10:00
  });

  it("a waiting lead does not use the budget", () => {
    const now = at("2026-11-12T13:00:00Z"); // 18:30 India, 17:00 UAE
    const leads = new Map([["l1", lead("l1", { country: "IN" })], ["l2", lead("l2", { country: "AE" })]]);
    const enrollments = [enrollment("e1", "l1", { nextSendAt: new Date(now.getTime() - 2000) }), enrollment("e2", "l2", { nextSendAt: new Date(now.getTime() - 1000) })];
    expect(planDueSends(input({ leads, enrollments, now, dailySendBudget: 1 }))).toEqual([
      { kind: "wait", enrollmentId: "e1", reason: "outside_send_window" },
      { kind: "send", enrollmentId: "e2", leadId: "l2", stepIndex: 0, to: "l2@acme.in" },
    ]);
  });

  it("permanent refusals still stop outside business hours", () => {
    const now = at("2026-11-12T16:00:00Z");
    const leads = new Map([["l1", lead("l1", { consentBasis: null })]]);
    const enrollments = [enrollment("e1", "l1", { nextSendAt: new Date(now.getTime() - 1000) })];
    expect(planDueSends(input({ leads, enrollments, now }))[0].kind).toBe("stop");
  });
});

describe("advanceEnrollment", () => {
  it("schedules the next step by the difference in day offsets, then completes", () => {
    expect(advanceEnrollment({ stepIndex: 0 }, sequence, NOW)).toEqual({ stepIndex: 1, nextSendAt: new Date(NOW.getTime() + 3 * DAY), status: "active" });
    expect(advanceEnrollment({ stepIndex: 1 }, sequence, NOW)).toEqual({ stepIndex: 2, nextSendAt: new Date(NOW.getTime() + 4 * DAY), status: "active" });
    expect(advanceEnrollment({ stepIndex: 2 }, sequence, NOW)).toEqual({ stepIndex: 3, nextSendAt: null, status: "completed" });
  });
});
