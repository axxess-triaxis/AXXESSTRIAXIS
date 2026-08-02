// Executive Dashboard Redesign Sprint ED-R3: calendar dashboard signal, built on the existing
// real Meeting domain entity via the generic /api/repositories/meetings endpoint -- no new
// migration or integration needed. Per the sprint's "preferred order": no live Google/Microsoft
// Calendar event-fetching service exists in this codebase (only OAuth connector registration --
// see connectorContract.ts), so internal AXXESS Meetings is the first real tenant calendar source,
// exactly as the sprint instructs when an external provider can't be live-tested.
import type { Meeting } from "../../domain";

export type CalendarDashboardSignals = {
  todayCount: number;
  upcomingCount: number;
  hasMeetingWithinHour: boolean;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Pure aggregation over an already-fetched meetings list -- no network calls here.
export function computeCalendarDashboardSignals(meetings: Meeting[], now = new Date()): CalendarDashboardSignals {
  const scheduled = meetings.filter((meeting) => meeting.status === "scheduled");

  const todayCount = scheduled.filter((meeting) => isSameCalendarDay(new Date(meeting.startsAt), now)).length;

  const upcomingCount = scheduled.filter((meeting) => {
    const startsAt = new Date(meeting.startsAt).getTime();
    return startsAt > now.getTime() && startsAt <= now.getTime() + SEVEN_DAYS_MS;
  }).length;

  const hasMeetingWithinHour = scheduled.some((meeting) => {
    const startsAt = new Date(meeting.startsAt).getTime();
    return startsAt >= now.getTime() && startsAt <= now.getTime() + ONE_HOUR_MS;
  });

  return { todayCount, upcomingCount, hasMeetingWithinHour };
}
