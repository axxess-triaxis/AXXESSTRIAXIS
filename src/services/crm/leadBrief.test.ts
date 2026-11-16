import { describe, expect, it } from "vitest";
import { leadBrief, MAX_BRIEF } from "./leadBrief";

describe("leadBrief", () => {
  it("lists what the contact said and did, newest first, and leaves out refusals and field changes", () => {
    const brief = leadBrief([
      { kind: "attempt", at: "2026-11-10T09:00:00Z", channel: "voice_human", decision: "refused", outcome: null, note: null },
      { kind: "attempt", at: "2026-11-11T09:00:00Z", channel: "voice_human", decision: "allowed", outcome: "call_back", note: "after 5pm" },
      { kind: "change", at: "2026-11-11T09:01:00Z", action: "crm.lead.updated" },
      { kind: "reply", at: "2026-11-12T09:00:00Z", category: "interested", subject: "Pricing for 10 seats" },
      { kind: "conversation", at: "2026-11-13T09:00:00Z", channel: "voice", direction: "inbound", summary: "Left a voicemail\nasking for a demo." },
      { kind: "milestone", at: "2026-11-14T09:00:00Z", milestone: "meeting_booked", note: "Demo Tue" },
    ]);
    expect(brief).toBe([
      "2026-11-14 meeting booked: Demo Tue",
      "2026-11-13 inbound voice: Left a voicemail asking for a demo.",
      "2026-11-12 email reply (interested): Pricing for 10 seats",
      "2026-11-11 voice human call: call back (after 5pm)",
    ].join("\n"));
  });

  it("is undefined when there is nothing worth telling", () => {
    expect(leadBrief([])).toBeUndefined();
    expect(leadBrief([{ kind: "change", at: "2026-11-11T09:01:00Z", action: "crm.lead.updated" }])).toBeUndefined();
  });

  it("stays within Callismatic's limit", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      kind: "conversation" as const, at: `2026-11-${String(10 + (i % 5)).padStart(2, "0")}T09:00:00Z`, channel: "sms", direction: "inbound", summary: "x".repeat(400),
    }));
    expect(leadBrief(many)!.length).toBeLessThanOrEqual(MAX_BRIEF);
  });
});
