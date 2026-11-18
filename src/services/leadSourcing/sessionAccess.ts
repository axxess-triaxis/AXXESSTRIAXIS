// Session access for the lead sourcing user routes (2026-11-18). Senior roles (canReadAllLeads) can
// read; changing schedules or starting runs also needs crm.create, the same rule as the exclusions
// route. Denied attempts are recorded.
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../auth/serverSession";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { canReadAllLeads, canUseCapability } from "../../security/rbac";
import { recordDeniedAttempt } from "../audit/auditEvents";

type Session = NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>>;
export type LeadSourcingAccess =
  | { ok: true; session: Session; scope: ReturnType<typeof tenantScopeFromUser> }
  | { ok: false; response: NextResponse };

export async function leadSourcingAccess(write: boolean, route: string, method: string): Promise<LeadSourcingAccess> {
  const session = await getServerAuthSession(true);
  if (!session) return { ok: false, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  const allowed = canReadAllLeads(session.user.role) && (!write || canUseCapability(session.user.role, "crm.create"));
  if (!allowed) {
    await recordDeniedAttempt(session, { route, method });
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { ok: true, session, scope: tenantScopeFromUser(session.user, session.accessToken) };
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
