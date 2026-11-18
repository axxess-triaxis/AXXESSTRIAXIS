// Lead sourcing schedules (2026-11-18, founder: "Users should be able to use it end to end and set it
// on schedule"). Pure helpers: when a schedule next fires, validating user input, and the monthly caps
// a due schedule is checked against before it becomes a discovery run.
import { SOURCING_COUNTRIES } from "./sourcingService";

export const CADENCES = ["daily", "weekly", "monthly"] as const;
export type Cadence = (typeof CADENCES)[number];

export type ScheduleTiming = {
  cadence: Cadence;
  /** 0 = Sunday ... 6 = Saturday; weekly only (default Monday). */
  dayOfWeek: number | null;
  /** 1 to 28; monthly only (default 1). */
  dayOfMonth: number | null;
  /** Local hour 0 to 23 in `timezone`. */
  hourLocal: number;
  timezone: string;
};

export type ScheduleInput = ScheduleTiming & {
  name: string;
  segment: string;
  countries: string[];
  cities: string[];
  perRun: number;
  enabled: boolean;
};

export const PER_RUN_MIN = 5;
export const PER_RUN_MAX = 50;
/** Searches a discovery run may use per company it is asked to find. */
export const SEARCHES_PER_COMPANY = 1.5;

export function isValidTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function localParts(instant: number, timezone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of fmt.formatToParts(new Date(instant))) if (part.type !== "literal") p[part.type] = Number(part.value);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute, second: p.second };
}

/** Offset of `timezone` from UTC at `instant`, in milliseconds. */
function offsetAt(instant: number, timezone: string): number {
  const p = localParts(instant, timezone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
}

/** The UTC instant of a local wall-clock time. A time skipped by a DST change resolves forward. */
export function zonedToUtc(year: number, month: number, day: number, hour: number, timezone: string): Date {
  const wall = Date.UTC(year, month - 1, day, hour);
  let guess = wall - offsetAt(wall, timezone);
  guess = wall - offsetAt(guess, timezone);
  return new Date(guess);
}

/** The first slot strictly after `now` at which the schedule fires. */
export function nextRunAt(timing: ScheduleTiming, now: Date): Date {
  const tz = isValidTimezone(timing.timezone) ? timing.timezone : "UTC";
  const today = localParts(now.getTime(), tz);
  const dow = timing.dayOfWeek ?? 1;
  const dom = timing.dayOfMonth ?? 1;
  for (let i = 0; i < 70; i += 1) {
    // Calendar arithmetic on a UTC date carrying the local Y-M-D, so month ends roll over correctly.
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i));
    const matches =
      timing.cadence === "daily" ||
      (timing.cadence === "weekly" && d.getUTCDay() === dow) ||
      (timing.cadence === "monthly" && d.getUTCDate() === dom);
    if (!matches) continue;
    const at = zonedToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), timing.hourLocal, tz);
    if (at.getTime() > now.getTime()) return at;
  }
  throw new Error("No schedule slot found in 70 days.");
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const intIn = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);

/** Validates a create (all fields) or update (`partial`) body. Returns the fields to write or the errors. */
export function parseScheduleInput(raw: unknown, partial = false): { ok: true; value: Partial<ScheduleInput> } | { ok: false; errors: string[] } {
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const errors: string[] = [];
  const value: Partial<ScheduleInput> = {};
  const has = (k: string) => k in body;

  if (!partial || has("name")) {
    const name = clean(body.name, 80);
    if (!name) errors.push("name is required (1 to 80 characters).");
    else value.name = name;
  }
  if (!partial || has("segment")) {
    const segment = clean(body.segment, 40).toLowerCase();
    if (!segment) errors.push("segment is required (for example brokerage or clinic).");
    else value.segment = segment;
  }
  if (!partial || has("countries")) {
    const countries = Array.isArray(body.countries) ? [...new Set(body.countries.map((c) => clean(c, 2).toUpperCase()))] : [];
    if (countries.length === 0 || countries.some((c) => !(SOURCING_COUNTRIES as readonly string[]).includes(c))) {
      errors.push(`countries must be one or more of ${SOURCING_COUNTRIES.join(", ")}.`);
    } else value.countries = countries;
  }
  if (!partial || has("cities")) {
    const cities = Array.isArray(body.cities) ? [...new Set(body.cities.map((c) => clean(c, 60)).filter(Boolean))] : body.cities === undefined ? [] : null;
    if (!cities || cities.length > 10) errors.push("cities must be a list of at most 10 names.");
    else value.cities = cities;
  }
  if (!partial || has("perRun")) {
    const perRun = body.perRun === undefined && !partial ? 25 : intIn(body.perRun, PER_RUN_MIN, PER_RUN_MAX);
    if (perRun === null) errors.push(`perRun must be a whole number from ${PER_RUN_MIN} to ${PER_RUN_MAX}.`);
    else value.perRun = perRun;
  }
  if (!partial || has("cadence")) {
    const cadence = body.cadence === undefined && !partial ? "weekly" : body.cadence;
    if (!CADENCES.includes(cadence as Cadence)) errors.push("cadence must be daily, weekly or monthly.");
    else value.cadence = cadence as Cadence;
  }
  if (has("dayOfWeek")) {
    const v = body.dayOfWeek === null ? null : intIn(body.dayOfWeek, 0, 6);
    if (v === null && body.dayOfWeek !== null) errors.push("dayOfWeek must be 0 (Sunday) to 6 (Saturday).");
    else value.dayOfWeek = v;
  } else if (!partial) value.dayOfWeek = null;
  if (has("dayOfMonth")) {
    const v = body.dayOfMonth === null ? null : intIn(body.dayOfMonth, 1, 28);
    if (v === null && body.dayOfMonth !== null) errors.push("dayOfMonth must be 1 to 28.");
    else value.dayOfMonth = v;
  } else if (!partial) value.dayOfMonth = null;
  if (!partial || has("hourLocal")) {
    const hour = body.hourLocal === undefined && !partial ? 9 : intIn(body.hourLocal, 0, 23);
    if (hour === null) errors.push("hourLocal must be 0 to 23.");
    else value.hourLocal = hour;
  }
  if (!partial || has("timezone")) {
    const tz = body.timezone === undefined && !partial ? "Asia/Kolkata" : clean(body.timezone, 64);
    if (!isValidTimezone(tz)) errors.push("timezone must be an IANA time zone such as Asia/Kolkata or Asia/Dubai.");
    else value.timezone = tz;
  }
  if (!partial || has("enabled")) {
    if (body.enabled !== undefined && typeof body.enabled !== "boolean") errors.push("enabled must be true or false.");
    else value.enabled = body.enabled === undefined ? true : (body.enabled as boolean);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

// ---- Monthly caps ------------------------------------------------------------------------------

export type CapLimits = { orgSearches: number; orgCompanies: number; globalSearches: number };
export type CapUsage = { orgSearches: number; orgCompanies: number; globalSearches: number };

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

/** Env defaults (founder decision 2026-11-18: all orgs, with monthly caps), overridable per org. */
export function capLimits(override?: { monthlySearchCap: number | null; monthlyCompanyCap: number | null } | null): CapLimits {
  return {
    orgSearches: override?.monthlySearchCap ?? envInt("LEAD_SOURCING_MONTHLY_SEARCH_CAP", 300),
    orgCompanies: override?.monthlyCompanyCap ?? envInt("LEAD_SOURCING_MONTHLY_COMPANY_CAP", 200),
    // Kept under AgentCore Web Search's 5,000 free queries a month, which the whole AWS organization shares.
    globalSearches: envInt("LEAD_SOURCING_GLOBAL_SEARCH_CAP", 4500),
  };
}

export type DiscoveryBudget = { ok: true; target: number; maxSearches: number } | { ok: false; reason: string };

/** How many companies and searches a new discovery run may use, or why it may not run. */
export function discoveryBudget(perRun: number, limits: CapLimits, usage: CapUsage): DiscoveryBudget {
  const companiesLeft = limits.orgCompanies - usage.orgCompanies;
  const orgSearchesLeft = limits.orgSearches - usage.orgSearches;
  const globalLeft = limits.globalSearches - usage.globalSearches;
  if (companiesLeft <= 0) return { ok: false, reason: `Monthly company limit reached (${limits.orgCompanies}).` };
  if (orgSearchesLeft <= 0) return { ok: false, reason: `Monthly search limit reached (${limits.orgSearches}).` };
  if (globalLeft <= 0) return { ok: false, reason: "Platform search limit for this month reached." };
  const target = Math.min(perRun, companiesLeft);
  const maxSearches = Math.min(Math.ceil(target * SEARCHES_PER_COMPANY), orgSearchesLeft, globalLeft);
  return { ok: true, target, maxSearches };
}
