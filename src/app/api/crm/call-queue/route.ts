import { NextResponse } from "next/server";
import { listOpenLeads, loadCallContext } from "../../../../repositories/leadWorkRepository";
import { buildCallQueue, CURRENT_REGISTRATIONS } from "../../../../services/outbound/callQueue";
import { requireCrmAccess } from "../leadAccess";

// Today's human call queue (GTM plan 2026-11-11, Day 3). Every open lead in scope goes through the
// contactability gate for a human call right now: callable leads first, refused leads with reasons.
// Senior roles see the whole organization; an Employee sees their own leads.
export async function GET() {
  const access = await requireCrmAccess("/api/crm/call-queue", "GET");
  if (access instanceof NextResponse) return access;
  const now = new Date();
  const leads = await listOpenLeads(access.scope, access.senior ? undefined : access.session.user.id);
  const context = await loadCallContext(access.scope, leads, now);
  const queue = buildCallQueue({ leads, ...context, registrations: CURRENT_REGISTRATIONS, now });
  return NextResponse.json({ ...queue, checkedAt: now.toISOString() });
}
