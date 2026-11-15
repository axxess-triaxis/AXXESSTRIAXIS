// Shared access rules for the leads page and call queue routes (GTM plan 2026-11-11, Day 3).
// Staff roles may use the CRM; an Employee sees and changes only leads they own or created, and a
// lead outside that scope answers 404 so its existence is not revealed.
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { getLead, isOwnLead, type WorkLead } from "../../../repositories/leadWorkRepository";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import type { TenantScope } from "../../../repositories/interfaces";
import { canReadAllLeads, canUseCapability } from "../../../security/rbac";
import { recordDeniedAttempt } from "../../../services/audit/auditEvents";
import type { RoleName } from "../../../domain";

type Session = NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>>;
export type CrmAccess = { session: Session; scope: TenantScope; senior: boolean };

export async function requireCrmAccess(route: string, method: string): Promise<CrmAccess | NextResponse> {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const role = session.user.role as RoleName;
  if (!canUseCapability(role, "crm.read")) {
    await recordDeniedAttempt(session, { route, method });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return { session, scope: tenantScopeFromUser(session.user, session.accessToken), senior: canReadAllLeads(role) };
}

/** The lead if this caller may work on it, otherwise a 404 response. */
export async function loadVisibleLead(access: CrmAccess, leadId: string): Promise<WorkLead | NextResponse> {
  const lead = await getLead(access.scope, leadId);
  if (!lead || (!access.senior && !isOwnLead(lead, access.session.user.id))) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  return lead;
}
