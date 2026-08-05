// A-96 (2026-08-04): tenant-scoped repository for real, user-settable keyword -> topic/urgency
// alert rules (supabase/migrations/202607100001_sprint14_rag_integrations_alerts.sql's
// social_alert_rules table -- real schema and RLS, but no application code read or wrote it before
// this change). Same service-role supabaseAdminRest pattern as financialWatchRepository.ts.
import type { EntityId, SocialAlertRule, SocialAlertRuleProvider, SocialAlertRuleUrgency } from "../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";

type SocialAlertRuleRow = {
  id: string;
  organization_id: string;
  provider: SocialAlertRuleProvider;
  keyword: string;
  topic: string;
  urgency: SocialAlertRuleUrgency;
  created_by: string | null;
  created_at: string;
};

function fromRow(row: SocialAlertRuleRow): SocialAlertRule {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    keyword: row.keyword,
    topic: row.topic,
    urgency: row.urgency,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

export type CreateSocialAlertRuleInput = {
  provider: SocialAlertRuleProvider;
  keyword: string;
  topic: string;
  urgency?: SocialAlertRuleUrgency;
};

// A real tenant with no rules configured yet must see a genuinely empty list -- never fabricated
// rules.
export async function listSocialAlertRules(scope: TenantScope): Promise<SocialAlertRule[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    select: "id,organization_id,provider,keyword,topic,urgency,created_by,created_at",
    order: "created_at.desc",
    limit: "200",
  });
  const rows = await supabaseAdminRest<SocialAlertRuleRow[]>("social_alert_rules", { query }).catch(() => []);
  return rows.map(fromRow);
}

export async function createSocialAlertRule(scope: TenantScope, input: CreateSocialAlertRuleInput): Promise<SocialAlertRule> {
  if (!isSupabaseAdminConfigured()) throw new Error("Social alert rules repository is not configured (Supabase admin credentials missing).");
  const rows = await supabaseAdminRest<SocialAlertRuleRow[]>("social_alert_rules", {
    method: "POST",
    body: {
      organization_id: scope.organizationId,
      provider: input.provider,
      keyword: input.keyword,
      topic: input.topic,
      urgency: input.urgency ?? "medium",
      created_by: scope.userId,
    },
  });
  if (!rows[0]) throw new Error("Social alert rule creation did not return a row.");
  return fromRow(rows[0]);
}

export async function deleteSocialAlertRule(scope: TenantScope, ruleId: EntityId): Promise<void> {
  if (!isSupabaseAdminConfigured()) throw new Error("Social alert rules repository is not configured (Supabase admin credentials missing).");
  const query = new URLSearchParams({
    id: `eq.${ruleId}`,
    organization_id: `eq.${scope.organizationId}`,
  });
  await supabaseAdminRest("social_alert_rules", { method: "DELETE", query });
}
