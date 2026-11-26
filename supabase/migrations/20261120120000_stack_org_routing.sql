-- Customer-fireable stack, PR 1: org routing (2026-11-20, founder: "ensure Callismatic and Omnidamus
-- are fireable from AXXESS TRIaxis for customers"). Plan:
-- docs/readiness/CUSTOMER_FIREABLE_STACK_PLAN_2026_11_20.md.
--
-- Results from Callismatic and Omnidamus come back through STILL. Until now STILL used one agent key,
-- so every result landed in the Triaxis organization. From here, a result that names a job is filed
-- into the organization that created the job, read from these tables, never from the event.
-- All three tables are written only by the server with the service role; members get read access.

-- One row per "Message with agent" request (Omnidamus), the messaging twin of agent_call_jobs.
-- No message text, transcript or phone number is stored here.
create table if not exists public.agent_message_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  summary text check (summary is null or length(summary) <= 1000),
  failure_reason text check (failure_reason is null or length(failure_reason) <= 200),
  task_id uuid references public.tasks(id) on delete set null,
  requested_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists agent_message_jobs_lead_idx on public.agent_message_jobs(organization_id, lead_id, created_at desc);

alter table public.agent_message_jobs enable row level security;

drop policy if exists agent_message_jobs_role_select on public.agent_message_jobs;
create policy agent_message_jobs_role_select on public.agent_message_jobs for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (public.is_staff_member(organization_id) and requested_by = (select auth.uid()))
  );

comment on table public.agent_message_jobs is 'Omnidamus conversation requests from AXXESS and their results. Service-role writes only.';

-- Per-organization switches and sender identities for the stack products. Identifiers only: no
-- secrets. The registration flags replace the global CURRENT_REGISTRATIONS constant in a later PR and
-- are set by a Triaxis admin after seeing proof, never by the customer.
create table if not exists public.org_agent_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  callismatic_enabled boolean not null default false,
  omnidamus_enabled boolean not null default false,
  whatsapp_phone_number_id text check (whatsapp_phone_number_id is null or whatsapp_phone_number_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  sms_origination_identity text check (sms_origination_identity is null or length(sms_origination_identity) <= 200),
  email_sender text check (email_sender is null or email_sender ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  caller_id_e164 text check (caller_id_e164 is null or caller_id_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  dlt_india_registered boolean not null default false,
  tdra_uae_registered boolean not null default false,
  counsel_signed_off boolean not null default false,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.org_agent_settings enable row level security;

drop policy if exists org_agent_settings_senior_select on public.org_agent_settings;
create policy org_agent_settings_senior_select on public.org_agent_settings for select to authenticated
  using (public.is_senior_member(organization_id));

comment on table public.org_agent_settings is 'Per-organization Callismatic and Omnidamus switches, sender identifiers and registration flags. Service-role writes only.';

-- Which organization owns a receiving number, so an inbound call or message that no AXXESS job
-- started is filed into the right organization. Unique per channel across all organizations: one
-- number can never belong to two.
create table if not exists public.org_channel_numbers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null check (channel in ('voice', 'whatsapp', 'sms', 'email')),
  identifier text not null check (length(identifier) between 3 and 200),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (channel, identifier)
);

create index if not exists org_channel_numbers_org_idx on public.org_channel_numbers(organization_id);

alter table public.org_channel_numbers enable row level security;

drop policy if exists org_channel_numbers_senior_select on public.org_channel_numbers;
create policy org_channel_numbers_senior_select on public.org_channel_numbers for select to authenticated
  using (public.is_senior_member(organization_id));

comment on table public.org_channel_numbers is 'Receiving numbers and addresses per organization for inbound stack routing. Service-role writes only.';
