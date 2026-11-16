import { describe, expect, it } from "vitest";
import { agentLeadPatch, leadTitleFor, parseConversationInput, parseUpsertLeadInput, searchTerm } from "./leadContext";

const LEAD = "11111111-2222-3333-4444-555555555555";
const NOW = new Date("2026-11-16T10:00:00Z");

describe("parseUpsertLeadInput", () => {
  it("needs an email or a phone, and a source", () => {
    expect(parseUpsertLeadInput({ source: "callismatic_inbound_call" })).toEqual({ ok: false, message: expect.stringContaining("email or phoneE164") });
    expect(parseUpsertLeadInput({ email: "a@b.co" })).toEqual({ ok: false, message: expect.stringContaining("source is required") });
    expect(parseUpsertLeadInput({ email: "a@b.co", source: "Bad Source!" }).ok).toBe(false);
  });

  it("normalises email and phone and upper-cases the country", () => {
    const parsed = parseUpsertLeadInput({ email: " Asha@Acme.IN ", phoneE164: "+91 98765 43210", source: "Omnidamus_SMS", country: "in" });
    expect(parsed).toEqual({ ok: true, value: expect.objectContaining({ email: "asha@acme.in", phoneE164: "+919876543210", source: "omnidamus_sms", country: "IN" }) });
  });

  it("rejects malformed contacts and filter-breaking characters", () => {
    expect(parseUpsertLeadInput({ email: "not-an-email", source: "x" }).ok).toBe(false);
    expect(parseUpsertLeadInput({ email: "a,b@c.co", source: "x" }).ok).toBe(false);
    expect(parseUpsertLeadInput({ phoneE164: "98765", source: "x" }).ok).toBe(false);
    expect(parseUpsertLeadInput({ email: "a@b.co", source: "x", country: "IND" }).ok).toBe(false);
  });

  it("lets an agent set a stage only up to proposal", () => {
    expect(parseUpsertLeadInput({ email: "a@b.co", source: "x", stage: "proposal" }).ok).toBe(true);
    for (const stage of ["negotiation", "won", "lost"]) {
      expect(parseUpsertLeadInput({ email: "a@b.co", source: "x", stage })).toEqual({ ok: false, message: expect.stringContaining("at most to proposal") });
    }
    expect(parseUpsertLeadInput({ email: "a@b.co", source: "x", stage: "closed" }).ok).toBe(false);
  });
});

describe("agentLeadPatch", () => {
  const existing = { stage: "qualifying" as const, status: "open", contactName: "Asha" };

  it("fills only blank fields and never overwrites a person's data", () => {
    expect(agentLeadPatch(existing, { source: "x", contactName: "Someone Else", organizationName: "Acme", email: "asha@acme.in" }))
      .toEqual({ organization_name: "Acme", contact_email: "asha@acme.in" });
  });

  it("moves forward but never back, and never touches a closed lead", () => {
    expect(agentLeadPatch(existing, { source: "x", stage: "proposal" })).toEqual({ stage: "proposal" });
    expect(agentLeadPatch(existing, { source: "x", stage: "new" })).toEqual({});
    expect(agentLeadPatch({ stage: "won", status: "open" }, { source: "x", stage: "proposal" })).toEqual({});
    expect(agentLeadPatch({ stage: "qualifying", status: "closed" }, { source: "x", stage: "proposal" })).toEqual({});
  });
});

describe("leadTitleFor", () => {
  it("uses the given title, else company and contact", () => {
    expect(leadTitleFor({ source: "x", title: "Inbound: pricing" })).toBe("Inbound: pricing");
    expect(leadTitleFor({ source: "x", organizationName: "Acme", contactName: "Asha" })).toBe("Acme - Asha");
    expect(leadTitleFor({ source: "x", phoneE164: "+919876543210" })).toBe("+919876543210");
  });
});

describe("parseConversationInput", () => {
  const base = { leadId: LEAD, channel: "sms", direction: "inbound", source: "omnidamus", summary: " Asked for a demo on Tuesday. " };

  it("accepts a valid conversation and defaults occurredAt to now", () => {
    expect(parseConversationInput(base, NOW)).toEqual({ ok: true, value: {
      leadId: LEAD, channel: "sms", direction: "inbound", source: "omnidamus", externalId: undefined,
      summary: "Asked for a demo on Tuesday.", occurredAt: NOW.toISOString(),
    } });
  });

  it("rejects bad ids, channels, directions, empty or long summaries, and future dates", () => {
    expect(parseConversationInput({ ...base, leadId: "l1" }, NOW).ok).toBe(false);
    expect(parseConversationInput({ ...base, channel: "fax" }, NOW).ok).toBe(false);
    expect(parseConversationInput({ ...base, direction: "sideways" }, NOW).ok).toBe(false);
    expect(parseConversationInput({ ...base, summary: "   " }, NOW).ok).toBe(false);
    expect(parseConversationInput({ ...base, summary: "x".repeat(2001) }, NOW).ok).toBe(false);
    expect(parseConversationInput({ ...base, occurredAt: "2026-11-17T10:00:00Z" }, NOW).ok).toBe(false);
    expect(parseConversationInput({ ...base, occurredAt: "yesterday" }, NOW).ok).toBe(false);
  });
});

describe("searchTerm", () => {
  it("strips characters that would break a PostgREST filter and needs 2 characters", () => {
    expect(searchTerm('acme,(x)"*%')).toBe("acme  x");
    expect(searchTerm("a")).toBeUndefined();
    expect(searchTerm(42)).toBeUndefined();
  });
});
