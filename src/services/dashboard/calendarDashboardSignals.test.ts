import { describe, expect, it } from "vitest";
import type { Meeting } from "../../domain";
import { computeCalendarDashboardSignals } from "./calendarDashboardSignals";

function meeting(overrides: Partial<Meeting>): Meeting {
  return {
    id: "m", organizationId: "org-1", title: "x", startsAt: "2026-08-01T12:00:00.000Z",
    attendeeIds: [], decisions: [], actionItems: [], status: "scheduled",
    ...overrides,
  };
}

describe("computeCalendarDashboardSignals", () => {
  it("returns all-zero/false for a tenant with no meetings", () => {
    expect(computeCalendarDashboardSignals([])).toEqual({ todayCount: 0, upcomingCount: 0, hasMeetingWithinHour: false });
  });

  it("counts only scheduled meetings starting today as today's calendar", () => {
    const now = new Date("2026-08-01T10:00:00.000Z");
    const meetings = [
      meeting({ id: "1", startsAt: "2026-08-01T14:00:00.000Z", status: "scheduled" }),
      meeting({ id: "2", startsAt: "2026-08-01T09:00:00.000Z", status: "cancelled" }),
      meeting({ id: "3", startsAt: "2026-08-05T09:00:00.000Z", status: "scheduled" }),
    ];
    const signals = computeCalendarDashboardSignals(meetings, now);
    expect(signals.todayCount).toBe(1);
  });

  it("counts scheduled meetings within the next 7 days as upcoming", () => {
    const now = new Date("2026-08-01T10:00:00.000Z");
    const meetings = [
      meeting({ id: "1", startsAt: "2026-08-03T10:00:00.000Z", status: "scheduled" }),
      meeting({ id: "2", startsAt: "2026-08-20T10:00:00.000Z", status: "scheduled" }),
    ];
    const signals = computeCalendarDashboardSignals(meetings, now);
    expect(signals.upcomingCount).toBe(1);
  });

  it("flags a meeting starting within the next hour", () => {
    const now = new Date("2026-08-01T10:00:00.000Z");
    const meetings = [meeting({ id: "1", startsAt: "2026-08-01T10:30:00.000Z", status: "scheduled" })];
    const signals = computeCalendarDashboardSignals(meetings, now);
    expect(signals.hasMeetingWithinHour).toBe(true);
  });

  it("does not flag a meeting more than an hour away", () => {
    const now = new Date("2026-08-01T10:00:00.000Z");
    const meetings = [meeting({ id: "1", startsAt: "2026-08-01T13:00:00.000Z", status: "scheduled" })];
    const signals = computeCalendarDashboardSignals(meetings, now);
    expect(signals.hasMeetingWithinHour).toBe(false);
  });
});
