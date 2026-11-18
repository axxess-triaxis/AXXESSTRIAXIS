import { NextResponse } from "next/server";
import { getSourcingRun } from "../../../../../repositories/leadSourcingRepository";
import { UUID_PATTERN, leadSourcingAccess } from "../../../../../services/leadSourcing/sessionAccess";

// One lead sourcing run with its candidates and the evidence for each (2026-11-18). Senior roles only.
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await leadSourcingAccess(false, "/api/lead-sourcing/runs/[id]", "GET");
  if (!access.ok) return access.response;
  const { id } = await ctx.params;
  const found = UUID_PATTERN.test(id) ? await getSourcingRun(access.scope, id) : null;
  if (!found) return NextResponse.json({ error: "Run not found." }, { status: 404 });
  const { run, candidates } = found;
  return NextResponse.json({
    run: {
      id: run.id, status: run.status, seedSource: run.seedSource, segment: run.segment, seedCount: run.seedCount, stats: run.stats,
      error: run.error, createdAt: run.createdAt, finishedAt: run.finishedAt,
    },
    candidates: candidates.map((c) => ({
      id: c.id, company: c.company, domain: c.domain, country: c.country, contactName: c.contactName, role: c.role, email: c.email,
      emailKind: c.emailKind, status: c.status, leadId: c.leadId, importedAutomatically: c.importedAutomatically, removedAt: c.removedAt,
      evidence: c.evidence,
    })),
  });
}
