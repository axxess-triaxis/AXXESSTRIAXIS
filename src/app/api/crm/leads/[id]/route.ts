import { NextResponse } from "next/server";
import type { CrmLeadStage, CrmLeadStatus } from "../../../../../domain";
import { updateCrmLead, type UpdateCrmLeadInput } from "../../../../../repositories/crmRepository";
import { isActiveStaffMember } from "../../../../../repositories/leadWorkRepository";
import { auditLogsRepository } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { recordDeniedAttempt } from "../../../../../services/audit/auditEvents";
import { loadVisibleLead, requireCrmAccess } from "../../leadAccess";

const STAGES: CrmLeadStage[] = ["new", "qualifying", "proposal", "negotiation", "won", "lost"];
const STATUSES: CrmLeadStatus[] = ["open", "stalled", "won", "lost"];

// Update one lead from the leads page (GTM plan 2026-11-11, Day 3).
//   { stage?, status?, nextFollowUpAt? (ISO or null), ownerUserId? }
// Staff may change their own leads; senior roles may change any lead and reassign it, but only to
// an active staff member of the same organization. Every change is audited with its fields.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCrmAccess("/api/crm/leads/[id]", "PATCH");
  if (access instanceof NextResponse) return access;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "A JSON body is required." }, { status: 400 });

  const input: UpdateCrmLeadInput = {};
  if (body.stage !== undefined) {
    if (!STAGES.includes(body.stage as CrmLeadStage)) return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
    input.stage = body.stage as CrmLeadStage;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as CrmLeadStatus)) return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    input.status = body.status as CrmLeadStatus;
  }
  if (body.nextFollowUpAt !== undefined) {
    const value = body.nextFollowUpAt;
    if (value !== null && (typeof value !== "string" || Number.isNaN(Date.parse(value)))) {
      return NextResponse.json({ error: "nextFollowUpAt must be an ISO date or null." }, { status: 400 });
    }
    input.nextFollowUpAt = value === null ? null : new Date(value as string).toISOString();
  }
  if (body.ownerUserId !== undefined) {
    if (!access.senior) {
      await recordDeniedAttempt(access.session, { route: "/api/crm/leads/[id]", method: "PATCH" });
      return NextResponse.json({ error: "Only senior roles may reassign leads." }, { status: 403 });
    }
    if (typeof body.ownerUserId !== "string" || !(await isActiveStaffMember(access.scope, body.ownerUserId))) {
      return NextResponse.json({ error: "The new owner must be an active staff member of this organization." }, { status: 400 });
    }
    input.ownerUserId = body.ownerUserId;
  }
  if (Object.keys(input).length === 0) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const lead = await loadVisibleLead(access, id);
  if (lead instanceof NextResponse) return lead;

  const updated = await updateCrmLead(access.scope, id, input);
  await auditLogsRepository.record(access.scope, {
    action: "crm.lead.updated", resourceType: "crm_lead", resourceId: id, category: "crm",
    metadata: { changed: Object.keys(input), ...input },
  }).catch(() => undefined);
  return NextResponse.json({ lead: updated });
}
