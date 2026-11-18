// Lead sourcing scheduler (2026-11-18). The worker calls /api/lead-sourcing/worker/tick every five
// minutes; due schedules become discovery runs here, after the monthly caps. A slot missed while the
// worker was down fires once, then the schedule moves to its next slot (no backlog of runs).
import {
  advanceSchedule,
  capUsageThisMonth,
  createDiscoveryRun,
  dueSchedules,
  expireUnclaimedDiscovery,
  loadCapOverride,
  noteScheduleOutcome,
  type SourcingSchedule,
} from "../../repositories/leadSourcingScheduleRepository";
import { capLimits, discoveryBudget, nextRunAt } from "./schedule";

export type StartResult = { started: true; runId: string; target: number; maxSearches: number } | { started: false; reason: string };

/** Creates a discovery run for a schedule if the caps allow it. Used by the tick and by Run now. */
export async function startDiscovery(
  schedule: SourcingSchedule,
  trigger: "schedule" | "manual",
  requestedByUser: string | null,
  now = new Date(),
): Promise<StartResult> {
  const limits = capLimits(await loadCapOverride(schedule.organizationId));
  const usage = await capUsageThisMonth(schedule.organizationId, now);
  const budget = discoveryBudget(schedule.perRun, limits, usage);
  if (!budget.ok) {
    await noteScheduleOutcome(schedule.id, { skipReason: budget.reason });
    return { started: false, reason: budget.reason };
  }
  const run = await createDiscoveryRun(
    schedule,
    { segment: schedule.segment, countries: schedule.countries, cities: schedule.cities, target: budget.target, maxSearches: budget.maxSearches, trigger },
    requestedByUser,
  );
  await noteScheduleOutcome(schedule.id, { ranAt: now, skipReason: null });
  return { started: true, runId: run.id, target: budget.target, maxSearches: budget.maxSearches };
}

export type TickResult = { due: number; started: number; skipped: number; lost: number };

export async function runSchedulerTick(now = new Date()): Promise<TickResult> {
  const result: TickResult = { due: 0, started: 0, skipped: 0, lost: 0 };
  await expireUnclaimedDiscovery(24, now);
  for (const schedule of await dueSchedules(now)) {
    result.due += 1;
    if (!schedule.nextRunAt) continue;
    // Compare-and-set: if another tick already moved this schedule on, it owns the slot.
    if (!(await advanceSchedule(schedule.id, schedule.nextRunAt, nextRunAt(schedule, now)))) {
      result.lost += 1;
      continue;
    }
    const started = await startDiscovery(schedule, "schedule", schedule.createdBy, now);
    if (started.started) result.started += 1;
    else result.skipped += 1;
  }
  return result;
}
