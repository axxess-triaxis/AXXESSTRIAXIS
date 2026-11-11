import { describe, expect, it } from "vitest";
import { checkContactability, type ContactabilityInput } from "./contactability";

// 2026-11-11 06:00 UTC = 10:00 in Dubai (UTC+4) and 11:30 in India (UTC+5:30).
const MIDMORNING = new Date("2026-11-11T06:00:00Z");

function input(overrides: Partial<ContactabilityInput> = {}): ContactabilityInput {
  return {
    channel: "email",
    country: "IN",
    consentBasis: "b2b_legitimate_interest",
    suppressed: false,
    registry: { status: "clear", checkedAt: new Date("2026-11-10T00:00:00Z") },
    recentAttempts: [],
    registrations: { dltIndia: false, tdraUae: false, counselSignedOff: false },
    now: MIDMORNING,
    ...overrides,
  };
}

describe("checkContactability", () => {
  it("allows a B2B email with a lawful basis and nothing against it", () => {
    expect(checkContactability(input())).toEqual({ allowed: true, reasons: [] });
  });

  it("refuses a suppressed contact on every channel", () => {
    for (const channel of ["email", "whatsapp", "sms", "voice_human", "voice_ai"] as const) {
      const result = checkContactability(input({ channel, suppressed: true, consentBasis: "opt_in" }));
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain("suppressed");
    }
  });

  it("refuses a contact with no consent or lawful basis on record", () => {
    const result = checkContactability(input({ consentBasis: null }));
    expect(result).toEqual({ allowed: false, reasons: ["no_lawful_basis"] });
  });

  it("refuses a country with no rules configured", () => {
    const result = checkContactability(input({ country: "US" }));
    expect(result.reasons).toContain("country_not_configured");
  });

  it("refuses business-initiated WhatsApp without opt-in", () => {
    const result = checkContactability(input({ channel: "whatsapp" }));
    expect(result.reasons).toContain("whatsapp_requires_opt_in");
    expect(checkContactability(input({ channel: "whatsapp", consentBasis: "opt_in" })).allowed).toBe(true);
  });

  it("refuses SMS and AI voice until registration and counsel sign-off", () => {
    const sms = checkContactability(input({ channel: "sms", consentBasis: "opt_in" }));
    expect(sms.reasons).toEqual(expect.arrayContaining(["dlt_registration_missing", "counsel_sign_off_missing"]));

    const uaeVoice = checkContactability(input({ channel: "voice_ai", country: "AE", consentBasis: "opt_in" }));
    expect(uaeVoice.reasons).toEqual(expect.arrayContaining(["tdra_registration_missing", "counsel_sign_off_missing"]));

    const cleared = checkContactability(input({
      channel: "sms",
      registrations: { dltIndia: true, tdraUae: false, counselSignedOff: true },
    }));
    expect(cleared.allowed).toBe(true);
  });

  it("allows a human callback to someone who opted in, without registration", () => {
    expect(checkContactability(input({ channel: "voice_human", consentBasis: "opt_in" })).allowed).toBe(true);
  });

  it("refuses a cold human call until registration and counsel sign-off", () => {
    const result = checkContactability(input({ channel: "voice_human" }));
    expect(result.reasons).toEqual(expect.arrayContaining(["dlt_registration_missing", "counsel_sign_off_missing"]));
  });

  it("refuses a number on the DND or DNCR registry for calls and SMS, unless opted in", () => {
    const registered = { dltIndia: true, tdraUae: true, counselSignedOff: true };
    const listed = checkContactability(input({
      channel: "voice_human", registrations: registered, registry: { status: "listed", checkedAt: MIDMORNING },
    }));
    expect(listed.reasons).toContain("on_do_not_call_registry");

    const unchecked = checkContactability(input({
      channel: "sms", registrations: registered, registry: { status: "unchecked", checkedAt: null },
    }));
    expect(unchecked.reasons).toContain("registry_scrub_missing_or_stale");

    const stale = checkContactability(input({
      channel: "sms", registrations: registered, registry: { status: "clear", checkedAt: new Date("2026-09-01T00:00:00Z") },
    }));
    expect(stale.reasons).toContain("registry_scrub_missing_or_stale");

    const optedIn = checkContactability(input({
      channel: "voice_human", consentBasis: "opt_in", registry: { status: "listed", checkedAt: MIDMORNING },
    }));
    expect(optedIn.allowed).toBe(true);
  });

  it("refuses UAE calls outside 09:00 to 18:00 Dubai time", () => {
    const base = { channel: "voice_human" as const, country: "AE" as const, consentBasis: "opt_in" as const };
    // 14:30 UTC = 18:30 Dubai.
    expect(checkContactability(input({ ...base, now: new Date("2026-11-11T14:30:00Z") })).reasons).toContain("outside_calling_hours");
    // 04:59 UTC = 08:59 Dubai.
    expect(checkContactability(input({ ...base, now: new Date("2026-11-11T04:59:00Z") })).reasons).toContain("outside_calling_hours");
    // 05:00 UTC = 09:00 Dubai.
    expect(checkContactability(input({ ...base, now: new Date("2026-11-11T05:00:00Z") })).allowed).toBe(true);
  });

  it("refuses India calls outside 09:00 to 21:00 India time, but not email", () => {
    // 16:00 UTC = 21:30 India.
    const late = new Date("2026-11-11T16:00:00Z");
    expect(checkContactability(input({ channel: "voice_human", consentBasis: "opt_in", now: late })).reasons).toContain("outside_calling_hours");
    expect(checkContactability(input({ now: late })).allowed).toBe(true);
  });

  it("caps repeat attempts on the same channel", () => {
    const hourAgo = new Date(MIDMORNING.getTime() - 60 * 60 * 1000);
    expect(checkContactability(input({ recentAttempts: [{ channel: "email", at: hourAgo }] })).reasons).toContain("frequency_cap_daily");

    const days = [2, 3, 4].map((d) => ({ channel: "email" as const, at: new Date(MIDMORNING.getTime() - d * 86_400_000) }));
    expect(checkContactability(input({ recentAttempts: days })).reasons).toContain("frequency_cap_weekly");

    const otherChannel = [{ channel: "whatsapp" as const, at: hourAgo }];
    expect(checkContactability(input({ recentAttempts: otherChannel })).allowed).toBe(true);
  });
});
