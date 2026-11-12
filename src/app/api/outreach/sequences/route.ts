import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { createSequence } from "../../../../repositories/outboundRepository";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { canReadAllLeads } from "../../../../security/rbac";
import { recordDeniedAttempt } from "../../../../services/audit/auditEvents";
import { validateSequence } from "../../../../services/outbound/sequenceDefinition";

// Create an outreach email sequence as a draft (GTM plan 2026-11-11). Senior roles only.
// A draft never sends; it must be approved through POST /api/outreach/sequences/[id].
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canReadAllLeads(session.user.role)) {
    await recordDeniedAttempt(session, { route: "/api/outreach/sequences", method: "POST" });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = validateSequence(await request.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const id = await createSequence(scope, result.value);
  await auditLogsRepository.record(scope, {
    action: "outreach.sequence.created",
    resourceType: "outreach_sequence",
    resourceId: id,
    category: "crm",
    metadata: { steps: result.value.steps.length },
  }).catch(() => undefined);
  return NextResponse.json({ id, status: "draft" }, { status: 201 });
}
