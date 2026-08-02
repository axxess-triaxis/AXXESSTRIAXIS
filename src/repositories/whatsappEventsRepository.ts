// MC-2 (2026-08-02): tenant-scoped repository for the WhatsApp Business event log
// (supabase/migrations/20260802120000_meta_threads_whatsapp_events.sql). Same service-role
// supabaseAdminRest pattern as financialWatchRepository.ts. Rows are written by the webhook
// receiver (MC-3), never guessed at here -- this file only lists/inserts/acknowledges.
import type { EntityId, ISODateTime, WhatsAppBusinessEvent, WhatsAppEventDirection, WhatsAppEventType, WhatsAppMessageStatus } from "../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";

type WhatsAppBusinessEventRow = {
  id: string;
  organization_id: string;
  connection_id: string | null;
  event_type: WhatsAppEventType;
  waba_phone_number_id: string | null;
  wa_message_id: string | null;
  direction: WhatsAppEventDirection | null;
  from_number: string | null;
  to_number: string | null;
  message_type: string | null;
  message_status: WhatsAppMessageStatus | null;
  call_status: string | null;
  payload: Record<string, unknown>;
  received_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
};

const SELECT_COLUMNS = "id,organization_id,connection_id,event_type,waba_phone_number_id,wa_message_id,direction,from_number,to_number,message_type,message_status,call_status,payload,received_at,acknowledged_at,acknowledged_by,created_at";

function fromRow(row: WhatsAppBusinessEventRow): WhatsAppBusinessEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    connectionId: row.connection_id ?? undefined,
    eventType: row.event_type,
    wabaPhoneNumberId: row.waba_phone_number_id ?? undefined,
    waMessageId: row.wa_message_id ?? undefined,
    direction: row.direction ?? undefined,
    fromNumber: row.from_number ?? undefined,
    toNumber: row.to_number ?? undefined,
    messageType: row.message_type ?? undefined,
    messageStatus: row.message_status ?? undefined,
    callStatus: row.call_status ?? undefined,
    payload: row.payload,
    receivedAt: row.received_at,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    acknowledgedBy: row.acknowledged_by ?? undefined,
    createdAt: row.created_at,
  };
}

export type CreateWhatsAppBusinessEventInput = {
  organizationId: EntityId;
  connectionId?: EntityId;
  eventType: WhatsAppEventType;
  wabaPhoneNumberId?: string;
  waMessageId?: string;
  direction?: WhatsAppEventDirection;
  fromNumber?: string;
  toNumber?: string;
  messageType?: string;
  messageStatus?: WhatsAppMessageStatus;
  callStatus?: string;
  payload: Record<string, unknown>;
};

// Used by the webhook receiver (MC-3), which already knows the resolved organizationId --
// service-role only, no TenantScope (a webhook call has no authenticated session).
export async function recordWhatsAppBusinessEvent(input: CreateWhatsAppBusinessEventInput): Promise<WhatsAppBusinessEvent | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const rows = await supabaseAdminRest<WhatsAppBusinessEventRow[]>("whatsapp_business_events", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,wa_message_id,event_type", select: SELECT_COLUMNS }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: input.organizationId,
      connection_id: input.connectionId ?? null,
      event_type: input.eventType,
      waba_phone_number_id: input.wabaPhoneNumberId ?? null,
      wa_message_id: input.waMessageId ?? null,
      direction: input.direction ?? null,
      from_number: input.fromNumber ?? null,
      to_number: input.toNumber ?? null,
      message_type: input.messageType ?? null,
      message_status: input.messageStatus ?? null,
      call_status: input.callStatus ?? null,
      payload: input.payload,
    },
  }).catch(() => undefined);
  return rows?.[0] ? fromRow(rows[0]) : undefined;
}

export async function listWhatsAppBusinessEventsSince(scope: TenantScope, since: ISODateTime, limit = 25): Promise<WhatsAppBusinessEvent[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    received_at: `gt.${since}`,
    select: SELECT_COLUMNS,
    order: "received_at.desc",
    limit: String(limit),
  });
  const rows = await supabaseAdminRest<WhatsAppBusinessEventRow[]>("whatsapp_business_events", { query }).catch(() => []);
  return rows.map(fromRow);
}

export async function acknowledgeWhatsAppBusinessEvent(scope: TenantScope, eventId: EntityId): Promise<WhatsAppBusinessEvent | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const query = new URLSearchParams({
    id: `eq.${eventId}`,
    organization_id: `eq.${scope.organizationId}`,
    select: SELECT_COLUMNS,
  });
  const rows = await supabaseAdminRest<WhatsAppBusinessEventRow[]>("whatsapp_business_events", {
    method: "PATCH",
    query,
    body: { acknowledged_at: new Date().toISOString(), acknowledged_by: scope.userId },
  }).catch(() => []);
  return rows?.[0] ? fromRow(rows[0]) : undefined;
}
