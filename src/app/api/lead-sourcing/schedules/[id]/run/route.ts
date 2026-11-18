import { NextResponse } from "next/server";
import { getSchedule } from "../../../../../../repositories/leadSourcingScheduleRepository";
import { auditLogsRepository } from "../../../../../../repositories/supabaseEnterpriseRepositories";
import { startDiscovery } from "../../../../../../services/leadSourcing/scheduler";
import { UUID_PATTERN, leadSourcingAccess } from "../../../../../../services/leadSourcing/sessionAccess";

const ROUTE = "/api/lead-sourcing/schedules/[id]/run";

// Run now (2026-11-18): starts a discovery run for a schedule straight away, against the same
// monthly caps. The schedule's next slot does not move.
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await leadSourcingAccess(true, ROUTE, "POST");
  if (!access.ok) return access.response;
  const { id } = await ctx.params;
  const schedule = UUID_PATTERN.test(id) ? await getSchedule(access.scope, id) : null;
  if (!schedule) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  const result = await startDiscovery(schedule, "manual", access.scope.userId || null);
  await auditLogsRepository.record(access.scope, {
    action: result.started ? "lead_sourcing.run_started" : "lead_sourcing.run_skipped",
    resourceType: "lead_sourcing_schedule",
    resourceId: id,
    category: "crm",
    metadata: result.started ? { runId: result.runId, target: result.target, maxSearches: result.maxSearches } : { reason: result.reason },
  }).catch(() => undefined);
  return NextResponse.json(result, { status: result.started ? 202 : 409 });
}
