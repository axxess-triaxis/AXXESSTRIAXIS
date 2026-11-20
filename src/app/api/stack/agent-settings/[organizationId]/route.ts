import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { loadAgentSettings } from "../../../../../repositories/orgAgentSettingsRepository";
import { canManageStackAgentsForAnyOrganization } from "../../../../../security/rbac";
import { recordDeniedAttempt } from "../../../../../services/audit/auditEvents";
import { applyPatch, settingsResponse } from "../shared";

// Triaxis only (customer-fireable stack, PR 5, 2026-11-20): the platform operator's own Super Admin
// links an organization's numbers and senders and records its DLT, TDRA and counsel sign-off after
// seeing proof. Every other caller gets 403, and a refused write is audited.
const ROUTE = "/api/stack/agent-settings/[organizationId]";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ organizationId: string }> };

async function access(method: string, params: Params["params"]) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageStackAgentsForAnyOrganization(session.user)) {
    if (method !== "GET") await recordDeniedAttempt(session, { route: ROUTE, method });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const { organizationId } = await params;
  if (!UUID.test(organizationId)) return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  return { session, organizationId };
}

export async function GET(_request: Request, { params }: Params) {
  const result = await access("GET", params);
  if (result instanceof NextResponse) return result;
  return settingsResponse(result.organizationId, await loadAgentSettings(result.organizationId), { operator: true });
}

export async function PATCH(request: Request, { params }: Params) {
  const result = await access("PATCH", params);
  if (result instanceof NextResponse) return result;
  return applyPatch(result.session, result.organizationId, request, true, ROUTE);
}
