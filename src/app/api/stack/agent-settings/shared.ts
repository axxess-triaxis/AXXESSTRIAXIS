// Shared handling for the agent settings routes (customer-fireable stack, PR 5, 2026-11-20).
import { NextResponse } from "next/server";
import { NumberClaimedError, saveAgentSettings } from "../../../../repositories/orgAgentSettingsRepository";
import { recordAuditBestEffort } from "../../../../services/audit/auditEvents";
import {
  callReadiness, isPlatformOperatorOrganization, messageReadiness, parseAgentSettingsPatch, type AgentSettings,
} from "../../../../services/stack/agentSettings";
import type { getServerAuthSession } from "../../../../auth/serverSession";

type Session = NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>>;

export function settingsResponse(organizationId: string, settings: AgentSettings, extra: Record<string, unknown> = {}) {
  return NextResponse.json({
    organizationId,
    settings,
    readiness: {
      call: callReadiness(settings, isPlatformOperatorOrganization(organizationId)),
      whatsapp: messageReadiness(settings, "whatsapp"),
      sms: messageReadiness(settings, "sms"),
    },
    ...extra,
  });
}

export async function applyPatch(session: Session, organizationId: string, request: Request, operator: boolean, route: string) {
  const body = await request.json().catch(() => null);
  const parsed = parseAgentSettingsPatch(body, { operator });
  if (!parsed.ok) {
    if (parsed.error === "operator_only_field") await recordDeniedAttempt(session, route, parsed.field);
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.error === "operator_only_field" ? 403 : 400 });
  }
  try {
    const settings = await saveAgentSettings(organizationId, parsed.patch, session.user.id);
    await recordAuditBestEffort(session, {
      action: "stack.agent_settings_updated",
      resourceType: "org_agent_settings",
      category: "configuration",
      metadata: { organizationId, fields: Object.keys(parsed.patch), byPlatformOperator: operator && organizationId !== session.user.organizationId },
    });
    return settingsResponse(organizationId, settings, { operator });
  } catch (error) {
    if (error instanceof NumberClaimedError) {
      return NextResponse.json({ error: "number_claimed", field: error.field }, { status: 409 });
    }
    throw error;
  }
}

async function recordDeniedAttempt(session: Session, route: string, field?: string) {
  await recordAuditBestEffort(session, {
    action: "access.denied",
    resourceType: "route",
    category: "access-control",
    metadata: { route, method: "PATCH", role: session.user.role, ...(field ? { field } : {}) },
  });
}
