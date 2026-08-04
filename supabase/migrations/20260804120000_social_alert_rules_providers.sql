-- A-96 (2026-08-04): social_alert_rules/social_alert_events have real schema and RLS
-- (supabase/migrations/202607100001_sprint14_rag_integrations_alerts.sql) but no application code
-- has ever read or written them -- confirmed by repo-wide search. This migration only widens the
-- provider check constraint to match the platforms added to SocialAlertProvider this session
-- (src/services/alerts/socialAlerts.ts): instagram, linkedin, threads. The real CRUD feature
-- (socialAlertRulesRepository.ts, API routes, Settings UI) is built in this same change.

alter table public.social_alert_rules
  drop constraint if exists social_alert_rules_provider_check;

alter table public.social_alert_rules
  add constraint social_alert_rules_provider_check
  check (provider in ('x', 'facebook', 'instagram', 'linkedin', 'threads', 'rss', 'manual', 'demo'));

alter table public.social_alert_events
  drop constraint if exists social_alert_events_provider_check;

alter table public.social_alert_events
  add constraint social_alert_events_provider_check
  check (provider in ('x', 'facebook', 'instagram', 'linkedin', 'threads', 'rss', 'manual', 'demo'));

create index if not exists social_alert_rules_org_idx on public.social_alert_rules(organization_id);
