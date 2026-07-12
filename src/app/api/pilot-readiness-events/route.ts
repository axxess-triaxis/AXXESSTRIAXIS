import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import { sanitizeAnalyticsProperties } from "../../../services/analytics/sanitize";

const pilotStepIds = [
  "organization",
  "invite_team_member",
  "role_assignment",
  "first_project",
  "upload_document",
  "first_ai_question",
  "first_task",
  "first_approval",
  "view_audit_trail",
  "send_feedback",
] as const;

const eventTypes = ["step_completed", "step_reopened", "pilot_interest_captured"] as const;

type PilotStepId = typeof pilotStepIds[number];
type PilotEventType = typeof eventTypes[number];

type PilotReadinessEventRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  step_id: PilotStepId;
  event_type: PilotEventType;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return { url, anonKey };
}

async function jsonBody(request: Request) {
  const body = await request.json().catch(() => ({}));
  return typeof body === "object" && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

function isPilotStepId(value: unknown): value is PilotStepId {
  return typeof value === "string" && pilotStepIds.includes(value as PilotStepId);
}

function isPilotEventType(value: unknown): value is PilotEventType {
  return typeof value === "string" && eventTypes.includes(value as PilotEventType);
}

function validatePayload(body: Record<string, unknown>) {
  if (!isPilotStepId(body.stepId)) return "A valid pilot onboarding step is required.";
  if (body.eventType !== undefined && !isPilotEventType(body.eventType)) return "A valid pilot event type is required.";
  return undefined;
}

async function insertPilotReadinessEvent(accessToken: string, row: Record<string, unknown>) {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/pilot_readiness_events`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Pilot readiness event insert failed: ${response.status} ${message}`);
  }

  const rows = await response.json() as PilotReadinessEventRow[];
  if (!rows[0]) throw new Error("Pilot readiness event insert returned no record.");
  return rows[0];
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await jsonBody(request);
  const validationError = validatePayload(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const metadata = sanitizeAnalyticsProperties(typeof body.metadata === "object" && body.metadata !== null && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {}) ?? {};
  const eventType = isPilotEventType(body.eventType) ? body.eventType : "step_completed";
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 40) : "web";

  const event = await insertPilotReadinessEvent(session.accessToken, {
    organization_id: scope.organizationId,
    user_id: scope.userId,
    step_id: body.stepId,
    event_type: eventType,
    source,
    metadata,
  });

  await auditLogsRepository.record(scope, {
    action: "pilot_readiness.event_recorded",
    resourceType: "pilot_readiness_event",
    resourceId: event?.id,
    category: "pilot-readiness",
    metadata: {
      step_id: body.stepId,
      event_type: eventType,
      source,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    id: event.id,
    organizationId: event.organization_id,
    userId: event.user_id ?? undefined,
    stepId: event.step_id,
    eventType: event.event_type,
    source: event.source,
    metadata: event.metadata,
    createdAt: event.created_at,
  }, { status: 201 });
}
