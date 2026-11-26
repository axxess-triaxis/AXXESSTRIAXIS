import { NextResponse } from "next/server";
import { deleteSchedule, getSchedule, updateSchedule } from "../../../../../repositories/leadSourcingScheduleRepository";
import { auditLogsRepository } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { nextRunAt, parseScheduleInput } from "../../../../../services/leadSourcing/schedule";
import { UUID_PATTERN, leadSourcingAccess } from "../../../../../services/leadSourcing/sessionAccess";

const ROUTE = "/api/lead-sourcing/schedules/[id]";
type Ctx = { params: Promise<{ id: string }> };

// Lead sourcing schedule edit and delete (2026-11-18). Every change recomputes the next slot from
// now; turning a schedule off clears it.
export async function PATCH(request: Request, ctx: Ctx) {
  const access = await leadSourcingAccess(true, ROUTE, "PATCH");
  if (!access.ok) return access.response;
  const { id } = await ctx.params;
  const current = UUID_PATTERN.test(id) ? await getSchedule(access.scope, id) : null;
  if (!current) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  const parsed = parseScheduleInput(await request.json().catch(() => ({})), true);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid schedule.", details: parsed.errors }, { status: 400 });
  const merged = { ...current, ...parsed.value };
  const schedule = await updateSchedule(access.scope, id, parsed.value, merged.enabled ? nextRunAt(merged, new Date()) : null);
  if (!schedule) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  await auditLogsRepository.record(access.scope, {
    action: "lead_sourcing.schedule_updated",
    resourceType: "lead_sourcing_schedule",
    resourceId: id,
    category: "crm",
    metadata: { fields: Object.keys(parsed.value), enabled: schedule.enabled },
  }).catch(() => undefined);
  return NextResponse.json({ schedule });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const access = await leadSourcingAccess(true, ROUTE, "DELETE");
  if (!access.ok) return access.response;
  const { id } = await ctx.params;
  if (!UUID_PATTERN.test(id) || !(await deleteSchedule(access.scope, id))) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  await auditLogsRepository.record(access.scope, {
    action: "lead_sourcing.schedule_deleted",
    resourceType: "lead_sourcing_schedule",
    resourceId: id,
    category: "crm",
    metadata: {},
  }).catch(() => undefined);
  return NextResponse.json({ deleted: true });
}
