import { NextResponse } from "next/server";
import { updateCrmLead } from "../../../../../../repositories/crmRepository";
import { recordMilestone } from "../../../../../../repositories/leadWorkRepository";
import { stopActiveEnrollments } from "../../../../../../repositories/replyRepository";
import { auditLogsRepository } from "../../../../../../repositories/supabaseEnterpriseRepositories";
import { leadChangesForMilestone, parseMilestoneInput } from "../../../../../../services/outbound/leadMilestones";
import { loadVisibleLead, requireCrmAccess } from "../../../leadAccess";

// Log a meeting or trial on a lead (GTM funnel follow-up, 2026-11-15). { kind, occurredAt?, note? }
// Staff may log only on leads they can see, the same rule as logging a call. Logging stops the
// lead's active outreach enrollments, so no more cold emails go to someone who has engaged, and
// moves the stage forward (leadChangesForMilestone). The funnel counts these rows.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCrmAccess("/api/crm/leads/[id]/milestones", "POST");
  if (access instanceof NextResponse) return access;

  const parsed = parseMilestoneInput(await request.json().catch(() => null), new Date());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const lead = await loadVisibleLead(access, id);
  if (lead instanceof NextResponse) return lead;

  const milestone = parsed.value;
  await recordMilestone(access.scope, id, milestone);
  const stoppedEnrollments = await stopActiveEnrollments(access.scope.organizationId, id, `milestone_${milestone.kind}`);
  const changes = leadChangesForMilestone(milestone.kind, lead);
  if (changes.stage) await updateCrmLead(access.scope, id, changes);

  await auditLogsRepository.record(access.scope, {
    action: "crm.lead.milestone_recorded", resourceType: "crm_lead", resourceId: id, category: "crm",
    metadata: { kind: milestone.kind, occurredAt: milestone.occurredAt, stoppedEnrollments, ...changes },
  }).catch(() => undefined);

  return NextResponse.json({ kind: milestone.kind, occurredAt: milestone.occurredAt, changes, stoppedEnrollments }, { status: 201 });
}
