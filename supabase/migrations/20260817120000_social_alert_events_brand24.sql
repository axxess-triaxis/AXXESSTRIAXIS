-- Sprint 1 real Social Alerts (2026-08-17): adds 'brand24' as a valid provider for both
-- social_alert_rules and social_alert_events, and adds the columns needed for a real,
-- idempotent Brand24 mention -> rule-match -> event pipeline (src/services/alerts/
-- brand24Ingestion.ts, socialAlertMatching.ts). Widens the same two check constraints
-- 20260804120000_social_alert_rules_providers.sql already widened once.

alter table public.social_alert_rules
  drop constraint if exists social_alert_rules_provider_check;

alter table public.social_alert_rules
  add constraint social_alert_rules_provider_check
  check (provider in ('x', 'facebook', 'instagram', 'linkedin', 'threads', 'rss', 'manual', 'demo', 'brand24'));

alter table public.social_alert_events
  drop constraint if exists social_alert_events_provider_check;

alter table public.social_alert_events
  add constraint social_alert_events_provider_check
  check (provider in ('x', 'facebook', 'instagram', 'linkedin', 'threads', 'rss', 'manual', 'demo', 'brand24'));

-- The upstream mention's own id (e.g. Brand24's mention id), used to make the daily cron's
-- upsert idempotent -- a rerun must never duplicate the same mention -> rule match as two rows.
alter table public.social_alert_events
  add column if not exists external_id text;

-- rule_id is part of the uniqueness key (not just external_id) because one mention can
-- legitimately match multiple rules and must produce one event row per matched rule.
create unique index if not exists social_alert_events_org_provider_rule_external_idx
  on public.social_alert_events (organization_id, provider, rule_id, external_id)
  where external_id is not null;
