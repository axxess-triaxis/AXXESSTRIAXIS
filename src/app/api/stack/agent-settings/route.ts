import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { loadAgentSettings } from "../../../../repositories/orgAgentSettingsRepository";
import { canManageOrganization, canManageStackAgentsForAnyOrganization } from "../../../../security/rbac";
import { recordDeniedAttempt } from "../../../../services/audit/auditEvents";
import { applyPatch, settingsResponse } from "./shared";

// The Agents card (customer-fireable stack, PR 5, 2026-11-20): an organization's own admins see
// their agent settings and what each agent still needs, turn agents on or off, and write their call
// purpose and opening SMS. Numbers, senders and registrations are Triaxis's to set
// (./[organizationId]/route.ts), so a customer can never call or message as someone else.
const ROUTE = "/api/stack/agent-settings";

async function access(method: string) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageOrganization(session.user, session.user.organizationId)) {
    if (method !== "GET") await recordDeniedAttempt(session, { route: ROUTE, method });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return session;
}

export async function GET() {
  const session = await access("GET");
  if (session instanceof NextResponse) return session;
  const organizationId = session.user.organizationId;
  return settingsResponse(organizationId, await loadAgentSettings(organizationId), {
    operator: canManageStackAgentsForAnyOrganization(session.user),
  });
}

export async function PATCH(request: Request) {
  const session = await access("PATCH");
  if (session instanceof NextResponse) return session;
  // The platform operator editing its own organization may set every field.
  return applyPatch(session, session.user.organizationId, request, canManageStackAgentsForAnyOrganization(session.user), ROUTE);
}
