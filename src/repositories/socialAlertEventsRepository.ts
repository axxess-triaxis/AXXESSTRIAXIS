// Sprint 1 real Social Alerts (2026-08-17): social_alert_events has real schema and RLS
// (supabase/migrations/202607100001_sprint14_rag_integrations_alerts.sql) but no application code
// wrote to it before this change. Same service-role supabaseAdminRest pattern as
// publishedContentRepository.ts, including its idempotent-upsert convention.
import type { EntityId, ISODateTime, SocialAlertEvent, SocialAlertEventSentiment, SocialAlertRuleProvider, SocialAlertRuleUrgency } from "../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";

type SocialAlertEventRow = {
  id: string;
  organization_id: string;
  rule_id: string | null;
  provider: SocialAlertRuleProvider;
  title: string;
  source_account: string;
  sentiment: SocialAlertEventSentiment;
  urgency: SocialAlertRuleUrgency;
  action_targets: string[];
  received_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
};

const SELECT_COLUMNS = "id,organization_id,rule_id,provider,title,source_account,sentiment,urgency,action_targets,received_at,reviewed_at,reviewed_by,external_id,metadata";

function fromRow(row: SocialAlertEventRow): SocialAlertEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    ruleId: row.rule_id ?? undefined,
    provider: row.provider,
    title: row.title,
    sourceAccount: row.source_account,
    sentiment: row.sentiment,
    urgency: row.urgency,
    actionTargets: row.action_targets,
    receivedAt: row.received_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    externalId: row.external_id ?? undefined,
    metadata: row.metadata,
  };
}

// A real tenant with no matched events yet must see a genuinely empty list -- never fabricated
// events.
export async function listSocialAlertEvents(scope: TenantScope, limit = 200): Promise<SocialAlertEvent[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    select: SELECT_COLUMNS,
    order: "received_at.desc",
    limit: String(limit),
  });
  const rows = await supabaseAdminRest<SocialAlertEventRow[]>("social_alert_events", { query }).catch(() => []);
  return rows.map(fromRow);
}

export type UpsertSocialAlertEventInput = {
  organizationId: EntityId;
  ruleId: EntityId;
  provider: SocialAlertRuleProvider;
  title: string;
  sourceAccount: string;
  sentiment: SocialAlertEventSentiment;
  urgency: SocialAlertRuleUrgency;
  actionTargets?: string[];
  receivedAt: ISODateTime;
  externalId: string;
  metadata?: Record<string, unknown>;
};

// Idempotent upsert keyed on (organization_id, provider, rule_id, external_id) -- safe for the
// daily Brand24 sync to call repeatedly for the same mention without duplicating rows. rule_id is
// part of the key (not just external_id) because one mention can legitimately match multiple
// rules and must produce one event row per matched rule.
export async function upsertSocialAlertEvent(input: UpsertSocialAlertEventInput): Promise<SocialAlertEvent | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const rows = await supabaseAdminRest<SocialAlertEventRow[]>("social_alert_events", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,provider,rule_id,external_id", select: SELECT_COLUMNS }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: input.organizationId,
      rule_id: input.ruleId,
      provider: input.provider,
      title: input.title,
      source_account: input.sourceAccount,
      sentiment: input.sentiment,
      urgency: input.urgency,
      action_targets: input.actionTargets ?? [],
      received_at: input.receivedAt,
      external_id: input.externalId,
      metadata: input.metadata ?? {},
    },
  }).catch(() => undefined);
  return rows?.[0] ? fromRow(rows[0]) : undefined;
}
