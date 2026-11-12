import { describe, expect, it } from "vitest";
import { buildCallQueue, CURRENT_REGISTRATIONS, leadChangesForOutcome, type QueueLead } from "./callQueue";

// 10:00 and 22:00 in India (UTC+5:30).
const TEN_IST = new Date("2026-11-13T04:30:00Z");
const TEN_PM_IST = new Date("2026-11-13T16:30:00Z");

const lead = (over: Partial<QueueLead> = {}): QueueLead => ({
  id: "l1", title: "Acme - Asha", phoneE164: "+919876543210", country: "IN", consentBasis: "opt_in", stage: "new",
  registryStatus: "unchecked", registryCheckedAt: null, ...over,
});
const build = (leads: QueueLead[], now = TEN_IST, extra: Partial<Parameters<typeof buildCallQueue>[0]> = {}) =>
  buildCallQueue({ leads, suppressed: new Set(), attemptsByLead: new Map(), registrations: CURRENT_REGISTRATIONS, now, ...extra });

describe("call queue", () => {
  it("lets staff call an opted-in Indian contact at 10:00 IST", () => {
    const queue = build([lead()]);
    expect(queue.callable.map((l) => l.id)).toEqual(["l1"]);
    expect(queue.refused).toEqual([]);
  });

  it("refuses a cold B2B call until DLT and counsel sign-off are recorded", () => {
    const queue = build([lead({ consentBasis: "b2b_legitimate_interest" })]);
    expect(queue.callable).toEqual([]);
    expect(queue.refused[0].reasons).toEqual(expect.arrayContaining(["dlt_registration_missing", "counsel_sign_off_missing"]));
  });

  it("refuses the same opted-in contact at 22:00 IST", () => {
    expect(build([lead()], TEN_PM_IST).refused[0].reasons).toEqual(["outside_calling_hours"]);
  });

  it("refuses a second call on the same day", () => {
    const attemptsByLead = new Map([["l1", [{ channel: "voice_human" as const, at: new Date(TEN_IST.getTime() - 3_600_000) }]]]);
    expect(build([lead()], TEN_IST, { attemptsByLead }).refused[0].reasons).toEqual(["frequency_cap_daily"]);
  });

  it("refuses suppressed numbers and leads with no number", () => {
    const queue = build([lead(), lead({ id: "l2", phoneE164: undefined })], TEN_IST, { suppressed: new Set(["+919876543210"]) });
    expect(queue.refused.map((r) => [r.lead.id, r.reasons])).toEqual([["l1", ["suppressed"]], ["l2", ["no_phone_number"]]]);
  });

  it("puts due follow-ups first, then the least recently contacted", () => {
    const attemptsByLead = new Map([["b", [{ channel: "email" as const, at: new Date("2026-11-10T00:00:00Z") }]]]);
    const queue = build([
      lead({ id: "b" }), lead({ id: "c" }), lead({ id: "a", nextFollowUpAt: "2026-11-12T00:00:00Z" }),
    ], TEN_IST, { attemptsByLead });
    expect(queue.callable.map((l) => l.id)).toEqual(["a", "c", "b"]);
    expect(queue.callable.find((l) => l.id === "b")?.lastContactAt).toBe("2026-11-10T00:00:00.000Z");
  });
});

describe("call outcomes", () => {
  it("move a new lead to qualifying when interested, and close it when not interested", () => {
    expect(leadChangesForOutcome("interested", { stage: "new" })).toEqual({ stage: "qualifying" });
    expect(leadChangesForOutcome("interested", { stage: "proposal" })).toEqual({});
    expect(leadChangesForOutcome("not_interested", { stage: "new" })).toEqual({ status: "lost" });
    expect(leadChangesForOutcome("no_answer", { stage: "new" })).toEqual({});
  });
});
