-- A-102 (2026-08-09): AI Review Inbox "Mark edited" and "Escalate" previously recorded a decision
-- with no real substance -- no edited answer text, no escalation target. Adds dedicated columns
-- (not the existing metadata jsonb, which stays scoped to AI-generation content) so escalations are
-- filterable without an unindexed jsonb scan.

alter table public.ai_operation_reviews
  add column if not exists edited_answer text,
  add column if not exists escalation_type text check (escalation_type in ('mapped_stakeholder', 'external_email', 'internal_unmapped')),
  add column if not exists escalation_target jsonb not null default '{}'::jsonb;

create index if not exists ai_operation_reviews_escalation_idx
  on public.ai_operation_reviews (organization_id, escalation_type, status)
  where escalation_type is not null;
