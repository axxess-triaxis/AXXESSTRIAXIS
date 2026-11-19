import { NextResponse } from "next/server";
import { MAX_SCHEDULES_PER_ORG, createSchedule, listSchedules } from "../../../../repositories/leadSourcingScheduleRepository";
import { auditLogsRepository } from "../../../../repositories/supabaseEnterpriseRepositories";
import { nextRunAt, parseScheduleInput, type ScheduleInput } from "../../../../services/leadSourcing/schedule";
import { leadSourcingAccess } from "../../../../services/leadSourcing/sessionAccess";

const ROUTE = "/api/lead-sourcing/schedules";

// Lead sourcing schedules (2026-11-18): senior users list and create recurring automatic sourcing.
export async function GET() {
  const access = await leadSourcingAccess(false, ROUTE, "GET");
  if (!access.ok) return access.response;
  return NextResponse.json({ schedules: await listSchedules(access.scope) });
}

export async function POST(request: Request) {
  const access = await leadSourcingAccess(true, ROUTE, "POST");
  if (!access.ok) return access.response;
  const parsed = parseScheduleInput(await request.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: "Invalid schedule.", details: parsed.errors }, { status: 400 });
  if ((await listSchedules(access.scope)).length >= MAX_SCHEDULES_PER_ORG) {
    return NextResponse.json({ error: `At most ${MAX_SCHEDULES_PER_ORG} schedules per organization.` }, { status: 400 });
  }
  const input = parsed.value as ScheduleInput;
  const schedule = await createSchedule(access.scope, input, input.enabled ? nextRunAt(input, new Date()) : null);
  await auditLogsRepository.record(access.scope, {
    action: "lead_sourcing.schedule_created",
    resourceType: "lead_sourcing_schedule",
    resourceId: schedule.id,
    category: "crm",
    metadata: { segment: schedule.segment, countries: schedule.countries, perRun: schedule.perRun, cadence: schedule.cadence },
  }).catch(() => undefined);
  return NextResponse.json({ schedule }, { status: 201 });
}
