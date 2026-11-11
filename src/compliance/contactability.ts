// Contactability gate: one server-side check that every outbound email, WhatsApp, SMS or call
// must pass before it is sent or dialled. Pure function; callers load the inputs and write the
// returned decision (allowed or refused, with reasons) to the audit log.
//
// The rules encode this program's reading of the regulations, which counsel has NOT yet
// verified (see docs/readiness, GTM plan 2026-11-11):
// - India: TRAI TCCCPR 2018 (DLT registration, NCPR/DND scrub, calls 09:00-21:00 IST),
//   DPDP Act 2023 (lawful basis for personal data).
// - UAE: TDRA telemarketing rules (licence and registered numbers, DNCR scrub, calls
//   09:00-18:00 Gulf time), PDPL.
// - WhatsApp: business-initiated messages only to people who opted in (Meta policy).
// Anything not configured here is refused rather than allowed.

export type ContactChannel = "email" | "whatsapp" | "sms" | "voice_human" | "voice_ai";
export type ConsentBasis = "opt_in" | "b2b_legitimate_interest";
export type ConfiguredCountry = "IN" | "AE";

export type RefusalReason =
  | "suppressed"
  | "no_lawful_basis"
  | "country_not_configured"
  | "whatsapp_requires_opt_in"
  | "dlt_registration_missing"
  | "tdra_registration_missing"
  | "counsel_sign_off_missing"
  | "on_do_not_call_registry"
  | "registry_scrub_missing_or_stale"
  | "outside_calling_hours"
  | "frequency_cap_daily"
  | "frequency_cap_weekly";

export type ContactabilityInput = {
  channel: ContactChannel;
  /** ISO 3166-1 alpha-2 country of the contact's number or address. */
  country: string;
  consentBasis: ConsentBasis | null;
  /** On the organization's suppression (do-not-contact) list, including unsubscribes and opt-outs. */
  suppressed: boolean;
  /** Last scrub against India's NCPR (DND) or the UAE DNCR. */
  registry: { status: "clear" | "listed" | "unchecked"; checkedAt: Date | null };
  /** Earlier attempts to reach this contact, any outcome. */
  recentAttempts: { channel: ContactChannel; at: Date }[];
  /** Sender-side registrations; all false until the founder confirms them. */
  registrations: { dltIndia: boolean; tdraUae: boolean; counselSignedOff: boolean };
  now: Date;
};

export type ContactabilityDecision = { allowed: boolean; reasons: RefusalReason[] };

const DAY_MS = 86_400_000;

export const CONTACTABILITY_RULES = {
  IN: { timeZone: "Asia/Kolkata", callingHours: { start: 9, end: 21 } },
  AE: { timeZone: "Asia/Dubai", callingHours: { start: 9, end: 18 } },
  registryScrubMaxAgeDays: 30,
  maxAttemptsPerChannel: { perDay: 1, perWeek: 3 },
} as const;

const TELECOM_CHANNELS: ReadonlySet<ContactChannel> = new Set(["sms", "voice_human", "voice_ai"]);

function isConfiguredCountry(country: string): country is ConfiguredCountry {
  return country === "IN" || country === "AE";
}

function localHour(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  return hour + minute / 60;
}

export function checkContactability(input: ContactabilityInput): ContactabilityDecision {
  const reasons: RefusalReason[] = [];
  const { channel, consentBasis, registrations, now } = input;
  const optedIn = consentBasis === "opt_in";

  if (input.suppressed) reasons.push("suppressed");
  if (!consentBasis) reasons.push("no_lawful_basis");

  if (!isConfiguredCountry(input.country)) {
    reasons.push("country_not_configured");
    return { allowed: false, reasons };
  }
  const country = input.country;

  if (channel === "whatsapp" && consentBasis && !optedIn) reasons.push("whatsapp_requires_opt_in");

  if (TELECOM_CHANNELS.has(channel)) {
    // A human returning a call or message the contact asked for is a service call, not telemarketing.
    const serviceCallback = channel === "voice_human" && optedIn;
    if (!serviceCallback) {
      if (country === "IN" && !registrations.dltIndia) reasons.push("dlt_registration_missing");
      if (country === "AE" && !registrations.tdraUae) reasons.push("tdra_registration_missing");
      if (!registrations.counselSignedOff) reasons.push("counsel_sign_off_missing");
    }

    if (!optedIn) {
      const { status, checkedAt } = input.registry;
      const fresh = checkedAt !== null
        && now.getTime() - checkedAt.getTime() <= CONTACTABILITY_RULES.registryScrubMaxAgeDays * DAY_MS;
      if (status === "listed") reasons.push("on_do_not_call_registry");
      else if (status === "unchecked" || !fresh) reasons.push("registry_scrub_missing_or_stale");
    }

    const { timeZone, callingHours } = CONTACTABILITY_RULES[country];
    const hour = localHour(now, timeZone);
    if (hour < callingHours.start || hour >= callingHours.end) reasons.push("outside_calling_hours");
  }

  const sameChannel = input.recentAttempts.filter((a) => a.channel === channel && a.at.getTime() <= now.getTime());
  const age = (a: { at: Date }) => now.getTime() - a.at.getTime();
  const { perDay, perWeek } = CONTACTABILITY_RULES.maxAttemptsPerChannel;
  if (sameChannel.filter((a) => age(a) < DAY_MS).length >= perDay) reasons.push("frequency_cap_daily");
  if (sameChannel.filter((a) => age(a) < 7 * DAY_MS).length >= perWeek) reasons.push("frequency_cap_weekly");

  return { allowed: reasons.length === 0, reasons };
}
