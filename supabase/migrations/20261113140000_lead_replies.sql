-- Reply sorting (GTM plan 2026-11-11, Day 3 item 1).
-- One row per inbound reply to an outreach email, received through the Resend webhook and sorted
-- by rules or Claude. Append-only: no update or delete policy, and only the server (service role)
-- writes. lead_id is null when the sender matches no lead; the reply is still kept and forwarded.

create table if not exists public.lead_replies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.crm_leads(id) on delete cascade,
  provider_email_id text not null check (length(provider_email_id) between 1 and 200),
  from_email text not null check (from_email = lower(from_email) and length(from_email) between 3 and 320),
  subject text not null default '' check (length(subject) <= 998),
  body_text text not null default '' check (length(body_text) <= 20000),
  body_truncated boolean not null default false,
  category text not null check (category in ('interested', 'not_now', 'unsubscribe', 'out_of_office', 'other')),
  classified_by text not null check (classified_by in ('rules', 'claude', 'fallback')),
  created_at timestamptz not null default now()
);

create unique index if not exists lead_replies_provider_email_idx on public.lead_replies(organization_id, provider_email_id);
create index if not exists lead_replies_lead_idx on public.lead_replies(organization_id, lead_id, created_at desc);

alter table public.lead_replies enable row level security;

-- Senior members read every reply; other staff read replies on leads they own.
drop policy if exists lead_replies_role_select on public.lead_replies;
create policy lead_replies_role_select on public.lead_replies for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_staff_member(organization_id)
      and exists (
        select 1 from public.crm_leads l
        where l.id = lead_replies.lead_id and l.organization_id = lead_replies.organization_id and l.owner_user_id = (select auth.uid())
      )
    )
  );

comment on table public.lead_replies is 'Inbound replies to outreach email, sorted by rules or Claude. Append-only; written by the server only.';
