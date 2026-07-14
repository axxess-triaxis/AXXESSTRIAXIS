import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import {
  buildPluginRuntimeSnapshot,
  createPluginActionAuditEvent,
  evaluatePluginAction,
  type PluginActionKind,
  type PluginRuntimeProviderId,
} from "../../../../services/plugins/pluginRuntime";

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const snapshot = buildPluginRuntimeSnapshot({ organizationId: session.user.organizationId });
  return NextResponse.json(snapshot);
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    pluginId?: PluginRuntimeProviderId;
    action?: PluginActionKind;
    scopeRequest?: string[];
    payloadSummary?: string;
  };

  if (!body.pluginId || !body.action) {
    return NextResponse.json({ error: "pluginId and action are required." }, { status: 400 });
  }

  const snapshot = buildPluginRuntimeSnapshot({ organizationId: session.user.organizationId });
  const runtimeRequest = {
    organizationId: session.user.organizationId,
    userId: session.user.id,
    userRole: session.user.role,
    pluginId: body.pluginId,
    action: body.action,
    scopeRequest: body.scopeRequest,
    payloadSummary: body.payloadSummary,
  };
  const decision = evaluatePluginAction(snapshot, runtimeRequest);
  const scope = tenantScopeFromUser(session.user, session.accessToken);

  await auditLogsRepository.record(scope, createPluginActionAuditEvent(runtimeRequest, decision)).catch(() => undefined);

  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("plugin_action_requests", {
      method: "POST",
      body: {
        organization_id: session.user.organizationId,
        requested_by_user_id: session.user.id,
        plugin_id: body.pluginId,
        action: body.action,
        status: decision.allowed ? ("approvalRequired" in decision && decision.approvalRequired ? "requires_approval" : "allowed") : "blocked",
        decision_reason: decision.reason,
        payload_summary: body.payloadSummary ?? null,
        scope_request: body.scopeRequest ?? [],
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ decision, totals: snapshot.totals });
}
