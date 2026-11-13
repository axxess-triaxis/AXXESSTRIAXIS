import { NextResponse } from "next/server";
import { createAgentCallJob, latestAgentCallJobs, setAgentCallJobStatus } from "../../../../../../repositories/agentCallRepository";
import { loadCallContext, recordCall } from "../../../../../../repositories/leadWorkRepository";
import { CURRENT_REGISTRATIONS, decideCall } from "../../../../../../services/outbound/callQueue";
import { isCallismaticConfigured, startAgentCall } from "../../../../../../services/outbound/callismaticClient";
import { loadVisibleLead, requireCrmAccess } from "../../../leadAccess";

// Call with agent (agent call pipeline, 2026-11-13): one click asks Callismatic's voice agent to call
// the lead. The contactability gate decides first, as channel voice_ai. Until India DLT, UAE TDRA and
// counsel sign-off are recorded it refuses every lead, and the refusal is logged like a human call's.
// An allowed attempt is logged only once Callismatic accepts the job, so a call that was never
// placed does not count toward the frequency caps.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCrmAccess("/api/crm/leads/[id]/agent-calls", "POST");
  if (access instanceof NextResponse) return access;

  const lead = await loadVisibleLead(access, id);
  if (lead instanceof NextResponse) return lead;

  const now = new Date();
  const context = await loadCallContext(access.scope, [lead], now);
  const decision = decideCall({
    lead,
    suppressed: Boolean(lead.phoneE164 && context.suppressedAi.has(lead.phoneE164)),
    attempts: context.attemptsByLead.get(lead.id) ?? [],
    registrations: CURRENT_REGISTRATIONS,
    now,
    channel: "voice_ai",
  });

  if (!decision.allowed) {
    await recordCall(access.scope, { leadId: id, decision: "refused", reasons: decision.reasons, outcome: null, note: null, channel: "voice_ai" });
    return NextResponse.json({ error: "The contactability gate refuses this agent call.", reasons: decision.reasons }, { status: 409 });
  }
  if (!isCallismaticConfigured()) {
    return NextResponse.json({ error: "Agent calls are not configured." }, { status: 503 });
  }

  const job = await createAgentCallJob(access.scope, id);
  const started = await startAgentCall({
    jobId: job.id, leadId: id, organizationId: access.scope.organizationId, phoneE164: lead.phoneE164 ?? "",
    country: lead.country ?? "", title: lead.title, contactName: lead.contactName, company: lead.organizationName,
  });
  if (!started.ok) {
    await setAgentCallJobStatus(access.scope, job.id, { status: "failed", failureReason: started.reason });
    return NextResponse.json({ error: "The voice agent could not start this call.", jobId: job.id, status: "failed", failureReason: started.reason }, { status: 502 });
  }

  await recordCall(access.scope, { leadId: id, decision: "allowed", reasons: [], outcome: null, note: null, channel: "voice_ai" });
  await setAgentCallJobStatus(access.scope, job.id, { status: "calling" });
  return NextResponse.json({ jobId: job.id, status: "calling" }, { status: 202 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCrmAccess("/api/crm/leads/[id]/agent-calls", "GET");
  if (access instanceof NextResponse) return access;

  const lead = await loadVisibleLead(access, id);
  if (lead instanceof NextResponse) return lead;

  const jobs = await latestAgentCallJobs(access.scope, [id]);
  return NextResponse.json({ job: jobs.get(id) ?? null });
}
