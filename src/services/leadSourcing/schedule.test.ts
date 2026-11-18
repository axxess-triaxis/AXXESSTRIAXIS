// Lead sourcing schedule helpers: next slot, input validation, monthly caps.
import { afterEach, describe, expect, it } from "vitest";
import { sumUsage } from "../../repositories/leadSourcingScheduleRepository";
import { capLimits, discoveryBudget, nextRunAt, parseScheduleInput, zonedToUtc, type ScheduleTiming } from "./schedule";

const timing = (t: Partial<ScheduleTiming>): ScheduleTiming => ({ cadence: "daily", dayOfWeek: null, dayOfMonth: null, hourLocal: 9, timezone: "Asia/Kolkata", ...t });

describe("nextRunAt", () => {
  it("fires daily at the local hour (India is UTC+5:30, Dubai UTC+4)", () => {
    // 2026-11-18 02:00Z = 07:30 in India, before 09:00 -> today 03:30Z.
    expect(nextRunAt(timing({}), new Date("2026-11-18T02:00:00Z")).toISOString()).toBe("2026-11-18T03:30:00.000Z");
    // Exactly at the slot: strictly after, so tomorrow.
    expect(nextRunAt(timing({}), new Date("2026-11-18T03:30:00Z")).toISOString()).toBe("2026-11-19T03:30:00.000Z");
    expect(nextRunAt(timing({ timezone: "Asia/Dubai", hourLocal: 8 }), new Date("2026-11-18T05:00:00Z")).toISOString()).toBe("2026-11-19T04:00:00.000Z");
  });

  it("uses the local date, not the UTC date, near midnight", () => {
    // 2026-11-18 20:00Z is already 19 Nov 01:30 in India.
    expect(nextRunAt(timing({ hourLocal: 1 }), new Date("2026-11-18T20:00:00Z")).toISOString()).toBe("2026-11-19T19:30:00.000Z");
  });

  it("fires weekly on the chosen day (default Monday)", () => {
    // 2026-11-18 is a Wednesday.
    expect(nextRunAt(timing({ cadence: "weekly" }), new Date("2026-11-18T00:00:00Z")).toISOString()).toBe("2026-11-23T03:30:00.000Z");
    expect(nextRunAt(timing({ cadence: "weekly", dayOfWeek: 3 }), new Date("2026-11-18T00:00:00Z")).toISOString()).toBe("2026-11-18T03:30:00.000Z");
    expect(nextRunAt(timing({ cadence: "weekly", dayOfWeek: 3 }), new Date("2026-11-18T04:00:00Z")).toISOString()).toBe("2026-11-25T03:30:00.000Z");
  });

  it("fires monthly on the chosen day and rolls over the year end", () => {
    expect(nextRunAt(timing({ cadence: "monthly", dayOfMonth: 28 }), new Date("2026-11-18T00:00:00Z")).toISOString()).toBe("2026-11-28T03:30:00.000Z");
    expect(nextRunAt(timing({ cadence: "monthly" }), new Date("2026-12-05T00:00:00Z")).toISOString()).toBe("2027-01-01T03:30:00.000Z");
    expect(nextRunAt(timing({ cadence: "monthly", dayOfMonth: 28 }), new Date("2027-02-28T10:00:00Z")).toISOString()).toBe("2027-03-28T03:30:00.000Z");
  });

  it("handles daylight saving time zones", () => {
    // London: GMT in winter, BST (UTC+1) in summer.
    expect(zonedToUtc(2026, 1, 15, 9, "Europe/London").toISOString()).toBe("2026-01-15T09:00:00.000Z");
    expect(zonedToUtc(2026, 7, 15, 9, "Europe/London").toISOString()).toBe("2026-07-15T08:00:00.000Z");
    // 01:30 on 2026-03-29 does not exist in London; it resolves forward, never earlier than asked.
    expect(zonedToUtc(2026, 3, 29, 1, "Europe/London").getTime()).toBeGreaterThanOrEqual(Date.parse("2026-03-29T00:00:00Z"));
  });

  it("falls back to UTC for an unknown time zone", () => {
    expect(nextRunAt(timing({ timezone: "Not/AZone" }), new Date("2026-11-18T00:00:00Z")).toISOString()).toBe("2026-11-18T09:00:00.000Z");
  });
});

describe("parseScheduleInput", () => {
  it("applies defaults on create and normalises values", () => {
    const parsed = parseScheduleInput({ name: "  Dubai   brokers ", segment: "Brokerage", countries: ["ae", "AE"], cities: ["Dubai", " "] });
    expect(parsed).toEqual({
      ok: true,
      value: {
        name: "Dubai brokers", segment: "brokerage", countries: ["AE"], cities: ["Dubai"], perRun: 25, cadence: "weekly",
        dayOfWeek: null, dayOfMonth: null, hourLocal: 9, timezone: "Asia/Kolkata", enabled: true,
      },
    });
  });

  it("rejects bad values with one message each", () => {
    const parsed = parseScheduleInput({ name: "", segment: "x", countries: ["US"], perRun: 51, cadence: "hourly", hourLocal: 24, timezone: "Mars/Base", dayOfWeek: 7, enabled: "yes" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors).toHaveLength(8);
  });

  it("on update writes only the fields given", () => {
    expect(parseScheduleInput({ enabled: false }, true)).toEqual({ ok: true, value: { enabled: false } });
    expect(parseScheduleInput({ perRun: 4 }, true).ok).toBe(false);
  });
});

describe("monthly caps", () => {
  afterEach(() => {
    delete process.env.LEAD_SOURCING_MONTHLY_SEARCH_CAP;
    delete process.env.LEAD_SOURCING_GLOBAL_SEARCH_CAP;
  });

  it("uses env defaults, then per-organization overrides", () => {
    expect(capLimits()).toEqual({ orgSearches: 300, orgCompanies: 200, globalSearches: 4500 });
    process.env.LEAD_SOURCING_MONTHLY_SEARCH_CAP = "50";
    process.env.LEAD_SOURCING_GLOBAL_SEARCH_CAP = "-1";
    expect(capLimits({ monthlySearchCap: null, monthlyCompanyCap: 10 })).toEqual({ orgSearches: 50, orgCompanies: 10, globalSearches: 4500 });
  });

  it("sizes a run to what is left and refuses when any cap is used up", () => {
    const limits = { orgSearches: 300, orgCompanies: 200, globalSearches: 4500 };
    expect(discoveryBudget(25, limits, { orgSearches: 0, orgCompanies: 0, globalSearches: 0 })).toEqual({ ok: true, target: 25, maxSearches: 38 });
    expect(discoveryBudget(25, limits, { orgSearches: 290, orgCompanies: 190, globalSearches: 0 })).toEqual({ ok: true, target: 10, maxSearches: 10 });
    expect(discoveryBudget(25, limits, { orgSearches: 0, orgCompanies: 200, globalSearches: 0 })).toMatchObject({ ok: false, reason: expect.stringContaining("company") });
    expect(discoveryBudget(25, limits, { orgSearches: 300, orgCompanies: 0, globalSearches: 0 })).toMatchObject({ ok: false, reason: expect.stringContaining("search") });
    expect(discoveryBudget(25, limits, { orgSearches: 0, orgCompanies: 0, globalSearches: 4500 })).toMatchObject({ ok: false, reason: expect.stringContaining("Platform") });
  });

  it("counts discovering runs at what they reserved, finished runs at what they used, and other orgs only globally", () => {
    const rows = [
      { organization_id: "a", status: "discovering", seed_source: "discovery", seed_count: 0, search_count: 0, discovery: { target: 10, maxSearches: 15 } },
      { organization_id: "a", status: "done", seed_source: "discovery", seed_count: 8, search_count: 12, discovery: { target: 10, maxSearches: 15 } },
      { organization_id: "b", status: "running", seed_source: "discovery", seed_count: 20, search_count: 30, discovery: {} },
      { organization_id: "a", status: "done", seed_source: "agent", seed_count: 30, search_count: 0, discovery: null },
    ];
    expect(sumUsage(rows, "a")).toEqual({ orgSearches: 27, orgCompanies: 18, globalSearches: 57 });
  });
});
