-- Human call outcomes (GTM plan 2026-11-11, Day 3: daily call queue).
-- A logged call is one contact_attempts row with channel 'voice_human'. These columns record what
-- happened on the call. Email rows leave both null. The table stays append-only: still no update
-- or delete policy.

alter table public.contact_attempts
  add column if not exists outcome text check (
    outcome is null or outcome in ('connected', 'no_answer', 'voicemail', 'wrong_number', 'call_back', 'not_interested', 'interested')
  ),
  add column if not exists note text check (note is null or length(note) <= 500);

comment on column public.contact_attempts.outcome is 'Human call result; null for emails and refused attempts that were never dialled.';
comment on column public.contact_attempts.note is 'Short free-text call note written by the caller, at most 500 characters.';
