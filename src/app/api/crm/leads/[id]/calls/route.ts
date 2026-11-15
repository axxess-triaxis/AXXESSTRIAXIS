import { NextResponse } from "next/server";
import { updateCrmLead } from "../../../../../../repositories/crmRepository";
import { loadCallContext, recordCall } from "../../../../../../repositories/leadWorkRepository";
import { auditLogsRepository } from "../../../../../../repositories/supabaseEnterpriseRepositories";
import { CURRENT_REGISTRATIONS, decideCall, isCallOutcome, leadChangesForOutcome } from "../../../../../../services/outbound/callQueue";
import { loadVisibleLead, requireCrmAccess } from "../../../leadAccess";

const MAX_NOTE = 500;

// Log a human call (GTM plan 2026-11-11, Day 3). { outcome, note?, nextFollowUpAt? }
// The gate is checked again at this moment. A refused call is still written to contact_attempts,
// as refused and without an outcome, and the caller gets 409 with the reasons.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCrmAccess("/api/crm/leads/[id]/calls", "POST");
  if (access instanceof NextResponse) return access;

  const body = await request.json().catch(() => ({})) as { outcome?: unknown; note?: unknown; nextFollowUpAt?: unknown };
  if (!isCallOutcome(body.outcome)) return NextResponse.json({ error: "Unknown call outcome." }, { status: 400 });
  if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > MAX_NOTE)) {
    return NextResponse.json({ error: `note must be text of at most ${MAX_NOTE} characters.` }, { status: 400 });
  }
  if (body.nextFollowUpAt !== undefined && (typeof body.nextFollowUpAt !== "string" || Number.isNaN(Date.parse(body.nextFollowUpAt)))) {
    return NextResponse.json({ error: "nextFollowUpAt must be an ISO date." }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const lead = await loadVisibleLead(access, id);
  if (lead instanceof NextResponse) return lead;

  const now = new Date();
  const context = await loadCallContext(access.scope, [lead], now);
  const decision = decideCall({
    lead,
    suppressed: Boolean(lead.phoneE164 && context.suppressed.has(lead.phoneE164)),
    attempts: context.attemptsByLead.get(lead.id) ?? [],
    registrations: CURRENT_REGISTRATIONS,
    now,
  });

  if (!decision.allowed) {
    await recordCall(access.scope, { leadId: id, decision: "refused", reasons: decision.reasons, outcome: null, note: null });
    return NextResponse.json({ error: "The contactability gate refuses this call.", reasons: decision.reasons }, { status: 409 });
  }

  await recordCall(access.scope, { leadId: id, decision: "allowed", reasons: [], outcome: body.outcome, note });
  const changes = {
    ...leadChangesForOutcome(body.outcome, lead),
    ...(typeof body.nextFollowUpAt === "string" ? { nextFollowUpAt: new Date(body.nextFollowUpAt).toISOString() } : {}),
  };
  if (Object.keys(changes).length) {
    await updateCrmLead(access.scope, id, changes);
    await auditLogsRepository.record(access.scope, {
      action: "crm.lead.updated", resourceType: "crm_lead", resourceId: id, category: "crm",
      metadata: { changed: Object.keys(changes), ...changes, via: "call", outcome: body.outcome },
    }).catch(() => undefined);
  }
  return NextResponse.json({ logged: true, outcome: body.outcome, changes }, { status: 201 });
}
