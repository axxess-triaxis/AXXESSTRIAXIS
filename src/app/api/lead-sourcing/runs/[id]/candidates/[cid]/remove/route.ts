import { NextResponse } from "next/server";
import { addExclusions, getCandidates } from "../../../../../../../../repositories/leadSourcingRepository";
import { removeSourcedLead } from "../../../../../../../../repositories/leadSourcingScheduleRepository";
import { auditLogsRepository } from "../../../../../../../../repositories/supabaseEnterpriseRepositories";
import { domainLabel } from "../../../../../../../../services/leadSourcing/extract";
import { normCompany } from "../../../../../../../../services/leadSourcing/seeds";
import { UUID_PATTERN, leadSourcingAccess } from "../../../../../../../../services/leadSourcing/sessionAccess";

const ROUTE = "/api/lead-sourcing/runs/[id]/candidates/[cid]/remove";

// Review after auto-import (2026-11-18): remove a wrong lead. The lead is closed as lost, never
// deleted, and only while nobody has worked on it. With {exclude: true} the company is also added
// to the do-not-contact list so no future run proposes it again.
export async function POST(request: Request, ctx: { params: Promise<{ id: string; cid: string }> }) {
  const access = await leadSourcingAccess(true, ROUTE, "POST");
  if (!access.ok) return access.response;
  const { id, cid } = await ctx.params;
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(cid)) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  const [candidate] = await getCandidates(access.scope, id, [cid]);
  if (!candidate || candidate.status !== "imported" || !candidate.leadId) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  if (candidate.removedAt) return NextResponse.json({ removed: true, excluded: 0 });

  const body = (await request.json().catch(() => ({}))) as { exclude?: unknown };
  if (!(await removeSourcedLead(access.scope, { id: candidate.id, leadId: candidate.leadId }))) {
    return NextResponse.json({ error: "This lead has already been worked on. Change it in Leads & Calls." }, { status: 409 });
  }
  let excluded = 0;
  if (body.exclude === true) {
    const rows = [
      { companyNorm: normCompany(candidate.company), domainLabel: candidate.domain ? domainLabel(candidate.domain) : undefined, reason: "manual" as const },
    ].filter((r) => r.companyNorm || r.domainLabel);
    excluded = await addExclusions(access.scope, rows);
  }
  await auditLogsRepository.record(access.scope, {
    action: "lead_sourcing.lead_removed",
    resourceType: "crm_lead",
    resourceId: candidate.leadId,
    category: "crm",
    metadata: { runId: id, candidateId: cid, excluded },
  }).catch(() => undefined);
  return NextResponse.json({ removed: true, excluded });
}
