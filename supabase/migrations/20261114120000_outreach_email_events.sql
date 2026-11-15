-- Outreach email delivery events (GTM plan 2026-11-11, Day 4: funnel and safe volume ramp).
-- One row per Resend delivered, bounced or complained event for an outreach send, so the funnel
-- counts deliveries from real rows and the ramp rule computes exact 7-day bounce and complaint
-- rates. Append-only: no update or delete policy, and only the server (service role) writes.
-- contact_attempts stays untouched, so it remains append-only too.

create table if not exists public.outreach_email_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_message_id text not null check (length(provider_message_id) between 1 and 200),
  type text not null check (type in ('delivered', 'bounced', 'complained')),
  recipient text check (recipient is null or (recipient = lower(recipient) and length(recipient) <= 320)),
  created_at timestamptz not null default now()
);

create unique index if not exists outreach_email_events_message_type_idx
  on public.outreach_email_events(provider_message_id, type);
create index if not exists outreach_email_events_org_time_idx
  on public.outreach_email_events(organization_id, type, created_at desc);

alter table public.outreach_email_events enable row level security;

drop policy if exists outreach_email_events_senior_select on public.outreach_email_events;
create policy outreach_email_events_senior_select on public.outreach_email_events for select to authenticated
  using (public.is_senior_member(organization_id));

comment on table public.outreach_email_events is 'Resend delivery events for outreach sends (delivered, bounced, complained). Append-only; written by the server only.';
