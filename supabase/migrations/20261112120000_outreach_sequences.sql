-- Outreach email sequences (GTM plan 2026-11-11, Day 2). Builds on
-- 20261111120000_outbound_contactability.sql. A sequence sends only once a senior member has
-- approved it; enrollments track each lead's position; contact_attempts gains the provider
-- message id so bounce and complaint webhooks can find the organization and address.

create table if not exists public.outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  -- [{"dayOffset": 0, "subject": "...", "body": "..."}, ...], dayOffset ascending from 0.
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 10),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null))
);

create index if not exists outreach_sequences_org_idx on public.outreach_sequences(organization_id);
alter table public.outreach_sequences enable row level security;

drop policy if exists outreach_sequences_senior_select on public.outreach_sequences;
create policy outreach_sequences_senior_select on public.outreach_sequences for select to authenticated
  using (public.is_senior_member(organization_id));

drop policy if exists outreach_sequences_senior_insert on public.outreach_sequences;
create policy outreach_sequences_senior_insert on public.outreach_sequences for insert to authenticated
  with check (public.is_senior_member(organization_id) and created_by = (select auth.uid()) and status = 'draft');

drop policy if exists outreach_sequences_senior_update on public.outreach_sequences;
create policy outreach_sequences_senior_update on public.outreach_sequences for update to authenticated
  using (public.is_senior_member(organization_id))
  with check (public.is_senior_member(organization_id));

create table if not exists public.outreach_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sequence_id uuid not null references public.outreach_sequences(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  step_index integer not null default 0 check (step_index >= 0),
  next_send_at timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'stopped')),
  stop_reasons text[] not null default '{}',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, lead_id)
);

create index if not exists outreach_enrollments_due_idx
  on public.outreach_enrollments(organization_id, next_send_at) where status = 'active';
alter table public.outreach_enrollments enable row level security;

drop policy if exists outreach_enrollments_senior_select on public.outreach_enrollments;
create policy outreach_enrollments_senior_select on public.outreach_enrollments for select to authenticated
  using (public.is_senior_member(organization_id));

drop policy if exists outreach_enrollments_senior_insert on public.outreach_enrollments;
create policy outreach_enrollments_senior_insert on public.outreach_enrollments for insert to authenticated
  with check (public.is_senior_member(organization_id) and created_by = (select auth.uid()));

drop policy if exists outreach_enrollments_senior_update on public.outreach_enrollments;
create policy outreach_enrollments_senior_update on public.outreach_enrollments for update to authenticated
  using (public.is_senior_member(organization_id))
  with check (public.is_senior_member(organization_id));

alter table public.contact_attempts
  add column if not exists enrollment_id uuid references public.outreach_enrollments(id) on delete set null,
  add column if not exists provider_message_id text;

create unique index if not exists contact_attempts_provider_message_idx
  on public.contact_attempts(provider_message_id) where provider_message_id is not null;
