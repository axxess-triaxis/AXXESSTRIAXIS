import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { insertImportedLeads, loadImportContext } from "../../../../../repositories/outboundRepository";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { canReadAllLeads, canUseCapability } from "../../../../../security/rbac";
import { recordDeniedAttempt } from "../../../../../services/audit/auditEvents";
import { parseLeadImport } from "../../../../../services/outbound/leadImport";

// GTM plan 2026-11-11, Day 1 item 5. Bulk lead import is limited to senior roles, because it
// brings personal contact data into the organization. The organization and owner come from the
// session, never the request. Rows without a lawful basis, source or configured country, and
// suppressed or duplicate contacts, are rejected and reported by line.
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!canUseCapability(session.user.role, "crm.create") || !canReadAllLeads(session.user.role)) {
    await recordDeniedAttempt(session, { route: "/api/crm/leads/import", method: "POST" });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { csv?: unknown };
  if (typeof body.csv !== "string" || !body.csv.trim()) {
    return NextResponse.json({ error: "A csv string is required." }, { status: 400 });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const result = parseLeadImport(body.csv, await loadImportContext(scope));
  if (result.fileError) return NextResponse.json({ error: result.fileError }, { status: 400 });

  const imported = await insertImportedLeads(scope, result.accepted);
  await auditLogsRepository.record(scope, {
    action: "crm.leads.imported",
    resourceType: "crm_lead",
    category: "crm",
    metadata: { imported, rejected: result.rejected.length },
  }).catch(() => undefined);

  return NextResponse.json({ imported, rejected: result.rejected });
}
