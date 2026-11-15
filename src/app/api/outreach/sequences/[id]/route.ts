import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { approveSequence, enrollLeads } from "../../../../../repositories/outboundRepository";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { canReadAllLeads } from "../../../../../security/rbac";
import { recordDeniedAttempt } from "../../../../../services/audit/auditEvents";

const MAX_ENROLL = 500;

// Act on one outreach sequence (GTM plan 2026-11-11). Senior roles only.
//   { "action": "approve" }                    draft -> approved, so it can send
//   { "action": "enroll", "leadIds": [...] }   add leads to an approved sequence
// Leads without an email, a lawful basis, or that are closed are skipped and reported.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canReadAllLeads(session.user.role)) {
    await recordDeniedAttempt(session, { route: "/api/outreach/sequences/[id]", method: "POST" });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { action?: unknown; leadIds?: unknown };
  const scope = tenantScopeFromUser(session.user, session.accessToken);

  if (body.action === "approve") {
    if (!(await approveSequence(scope, id))) return NextResponse.json({ error: "No draft sequence with that id." }, { status: 404 });
    await auditLogsRepository.record(scope, {
      action: "outreach.sequence.approved", resourceType: "outreach_sequence", resourceId: id, category: "crm",
    }).catch(() => undefined);
    return NextResponse.json({ id, status: "approved" });
  }

  if (body.action === "enroll") {
    const leadIds = body.leadIds;
    if (!Array.isArray(leadIds) || leadIds.length === 0 || leadIds.length > MAX_ENROLL || !leadIds.every((l) => typeof l === "string" && l.length > 0)) {
      return NextResponse.json({ error: `leadIds must be 1 to ${MAX_ENROLL} lead ids.` }, { status: 400 });
    }
    const result = await enrollLeads(scope, id, leadIds as string[]);
    if (!result.sequenceFound) return NextResponse.json({ error: "No approved sequence with that id." }, { status: 404 });
    await auditLogsRepository.record(scope, {
      action: "outreach.leads.enrolled", resourceType: "outreach_sequence", resourceId: id, category: "crm",
      metadata: { enrolled: result.enrolled, skipped: result.skipped.length },
    }).catch(() => undefined);
    return NextResponse.json({ enrolled: result.enrolled, skipped: result.skipped });
  }

  return NextResponse.json({ error: "action must be \"approve\" or \"enroll\"." }, { status: 400 });
}
