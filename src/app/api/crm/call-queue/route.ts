import { NextResponse } from "next/server";
import { latestAgentCallJobs } from "../../../../repositories/agentCallRepository";
import { listOpenLeads, loadCallContext } from "../../../../repositories/leadWorkRepository";
import { buildCallQueue, CURRENT_REGISTRATIONS } from "../../../../services/outbound/callQueue";
import { requireCrmAccess } from "../leadAccess";

// Today's human call queue (GTM plan 2026-11-11, Day 3). Every open lead in scope goes through the
// contactability gate for a human call right now: callable leads first, refused leads with reasons.
// Senior roles see the whole organization; an Employee sees their own leads.
// Each callable lead also carries the voice-agent gate decision and its latest agent call job.
export async function GET() {
  const access = await requireCrmAccess("/api/crm/call-queue", "GET");
  if (access instanceof NextResponse) return access;
  const now = new Date();
  const leads = await listOpenLeads(access.scope, access.senior ? undefined : access.session.user.id);
  const context = await loadCallContext(access.scope, leads, now);
  const queue = buildCallQueue({ leads, ...context, registrations: CURRENT_REGISTRATIONS, now });
  const jobs = await latestAgentCallJobs(access.scope, queue.callable.map((l) => l.id));
  const callable = queue.callable.map((l) => ({ ...l, agentJob: jobs.get(l.id) ?? null }));
  return NextResponse.json({ ...queue, callable, checkedAt: now.toISOString() });
}
