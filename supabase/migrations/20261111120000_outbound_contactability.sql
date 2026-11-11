-- Outbound contactability (GTM plan 2026-11-11, items C10 and C11).
-- Adds what the contactability gate (src/compliance/contactability.ts) needs to decide whether a
-- lead may be emailed, messaged or called: contact details and consent on the lead, a
-- per-organization suppression list, and an append-only log of every allowed or refused attempt.
-- No backfill: existing leads get consent_basis null and registry_status 'unchecked', so the gate
-- refuses them until someone records a lawful basis.

alter table public.crm_leads
  add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$'),
  add column if not exists contact_email text,
  add column if not exists contact_phone_e164 text check (contact_phone_e164 is null or contact_phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  add column if not exists consent_basis text check (consent_basis is null or consent_basis in ('opt_in', 'b2b_legitimate_interest')),
  add column if not exists consent_source text,
  add column if not exists consent_recorded_at timestamptz,
  add column if not exists registry_status text not null default 'unchecked' check (registry_status in ('clear', 'listed', 'unchecked')),
  add column if not exists registry_checked_at timestamptz;

-- Suppression (do-not-contact) list. channel null means every channel.
create table if not exists public.contact_suppressions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  identifier text not null check (identifier = lower(identifier) and length(identifier) between 3 and 320),
  channel text check (channel is null or channel in ('email', 'whatsapp', 'sms', 'voice_human', 'voice_ai')),
  reason text not null check (reason in ('unsubscribe', 'opt_out', 'complaint', 'bounce', 'manual')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists contact_suppressions_unique_idx
  on public.contact_suppressions(organization_id, identifier, coalesce(channel, '*'));

alter table public.contact_suppressions enable row level security;

drop policy if exists contact_suppressions_staff_select on public.contact_suppressions;
create policy contact_suppressions_staff_select on public.contact_suppressions for select to authenticated
  using (public.is_staff_member(organization_id));

-- Any staff member may add a suppression; only senior members may lift one.
drop policy if exists contact_suppressions_staff_insert on public.contact_suppressions;
create policy contact_suppressions_staff_insert on public.contact_suppressions for insert to authenticated
  with check (public.is_staff_member(organization_id) and created_by = (select auth.uid()));

drop policy if exists contact_suppressions_senior_delete on public.contact_suppressions;
create policy contact_suppressions_senior_delete on public.contact_suppressions for delete to authenticated
  using (public.is_senior_member(organization_id));

-- Append-only log of gate decisions. No update or delete policy, so rows cannot be changed by users.
create table if not exists public.contact_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'sms', 'voice_human', 'voice_ai')),
  decision text not null check (decision in ('allowed', 'refused')),
  reasons text[] not null default '{}',
  actor_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists contact_attempts_lead_idx on public.contact_attempts(organization_id, lead_id, created_at desc);

alter table public.contact_attempts enable row level security;

drop policy if exists contact_attempts_role_select on public.contact_attempts;
create policy contact_attempts_role_select on public.contact_attempts for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (public.is_staff_member(organization_id) and actor_user_id = (select auth.uid()))
  );

drop policy if exists contact_attempts_staff_insert on public.contact_attempts;
create policy contact_attempts_staff_insert on public.contact_attempts for insert to authenticated
  with check (public.is_staff_member(organization_id) and actor_user_id = (select auth.uid()));
