import { describe, expect, it } from "vitest";
import { isMilestoneKind, leadChangesForMilestone, parseMilestoneInput } from "./leadMilestones";

const NOW = new Date("2026-11-15T06:00:00Z");

describe("lead milestones", () => {
  it("knows exactly three kinds; paid is not one", () => {
    expect(["meeting_booked", "meeting_held", "trial_started"].every(isMilestoneKind)).toBe(true);
    expect(isMilestoneKind("paid")).toBe(false);
    expect(isMilestoneKind(undefined)).toBe(false);
  });

  it("moves new leads forward and leaves later, won or lost leads alone", () => {
    const open = (stage: string) => ({ stage, status: "open" });
    expect(leadChangesForMilestone("meeting_booked", open("new"))).toEqual({ stage: "qualifying" });
    expect(leadChangesForMilestone("meeting_held", open("qualifying"))).toEqual({});
    expect(leadChangesForMilestone("trial_started", open("new"))).toEqual({ stage: "proposal" });
    expect(leadChangesForMilestone("trial_started", open("qualifying"))).toEqual({ stage: "proposal" });
    expect(leadChangesForMilestone("trial_started", open("negotiation"))).toEqual({});
    expect(leadChangesForMilestone("meeting_booked", { stage: "new", status: "lost" })).toEqual({});
    expect(leadChangesForMilestone("trial_started", { stage: "won", status: "won" })).toEqual({});
  });

  it("defaults the time to now, trims the note, and allows up to one day ahead", () => {
    expect(parseMilestoneInput({ kind: "meeting_held", note: "  " }, NOW)).toEqual({ ok: true, value: { kind: "meeting_held", occurredAt: NOW.toISOString(), note: null } });
    const tomorrow = new Date(NOW.getTime() + 23 * 3_600_000).toISOString();
    expect(parseMilestoneInput({ kind: "meeting_booked", occurredAt: tomorrow, note: " Tue 3pm " }, NOW))
      .toEqual({ ok: true, value: { kind: "meeting_booked", occurredAt: tomorrow, note: "Tue 3pm" } });
  });

  it("rejects bad input with a reason", () => {
    expect(parseMilestoneInput(null, NOW).ok).toBe(false);
    expect(parseMilestoneInput({ kind: "paid" }, NOW).ok).toBe(false);
    expect(parseMilestoneInput({ kind: "meeting_held", occurredAt: "tomorrow" }, NOW).ok).toBe(false);
    expect(parseMilestoneInput({ kind: "meeting_held", occurredAt: 5 }, NOW).ok).toBe(false);
    expect(parseMilestoneInput({ kind: "meeting_booked", occurredAt: new Date(NOW.getTime() + 2 * 86_400_000).toISOString() }, NOW))
      .toEqual({ ok: false, error: "occurredAt may be at most one day in the future." });
    expect(parseMilestoneInput({ kind: "meeting_held", note: "x".repeat(501) }, NOW).ok).toBe(false);
    expect(parseMilestoneInput({ kind: "meeting_held", note: 7 }, NOW).ok).toBe(false);
  });
});
