-- Lead sourcing schedules and automatic discovery (founder 2026-11-18: "fully automated and on
-- Bedrock. Users should be able to use it end to end and set it on schedule").
-- A schedule says what to look for and how often. When it is due, the server creates a run in
-- status 'discovering'; the worker finds companies (Claude on Bedrock + AgentCore web search),
-- the server filters them and moves the run to 'queued', and the existing crawl path takes over.
-- Additive only. Written only by the server with the service role, like the other lead-sourcing
-- tables; senior members can read.

create table if not exists public.lead_sourcing_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  segment text not null check (length(segment) between 1 and 40),
  countries text[] not null check (cardinality(countries) between 1 and 2 and countries <@ array['IN', 'AE']::text[]),
  cities text[] not null default '{}'::text[] check (cardinality(cities) <= 10),
  per_run integer not null default 25 check (per_run between 5 and 50),
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly', 'monthly')),
  day_of_week integer check (day_of_week is null or day_of_week between 0 and 6),
  day_of_month integer check (day_of_month is null or day_of_month between 1 and 28),
  hour_local integer not null default 9 check (hour_local between 0 and 23),
  timezone text not null default 'Asia/Kolkata' check (length(timezone) between 1 and 64),
  enabled boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_skip_reason text check (last_skip_reason is null or length(last_skip_reason) <= 200),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_sourcing_schedules_org_idx on public.lead_sourcing_schedules(organization_id, created_at desc);
create index if not exists lead_sourcing_schedules_due_idx on public.lead_sourcing_schedules(next_run_at) where enabled;

-- Per-organization monthly limits. A missing row (or null column) falls back to the env defaults.
create table if not exists public.lead_sourcing_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  monthly_search_cap integer check (monthly_search_cap is null or monthly_search_cap between 0 and 5000),
  monthly_company_cap integer check (monthly_company_cap is null or monthly_company_cap between 0 and 5000),
  updated_at timestamptz not null default now()
);

alter table public.lead_sourcing_runs drop constraint if exists lead_sourcing_runs_status_check;
alter table public.lead_sourcing_runs add constraint lead_sourcing_runs_status_check
  check (status in ('discovering', 'queued', 'running', 'done', 'failed'));

alter table public.lead_sourcing_runs add column if not exists schedule_id uuid references public.lead_sourcing_schedules(id) on delete set null;
alter table public.lead_sourcing_runs add column if not exists seed_source text not null default 'agent' check (seed_source in ('agent', 'discovery'));
alter table public.lead_sourcing_runs add column if not exists discovery jsonb check (discovery is null or jsonb_typeof(discovery) = 'object');
alter table public.lead_sourcing_runs add column if not exists search_count integer not null default 0 check (search_count >= 0);
alter table public.lead_sourcing_runs add column if not exists llm_input_tokens integer not null default 0 check (llm_input_tokens >= 0);
alter table public.lead_sourcing_runs add column if not exists llm_output_tokens integer not null default 0 check (llm_output_tokens >= 0);

create index if not exists lead_sourcing_runs_status_idx on public.lead_sourcing_runs(status, created_at);

alter table public.lead_sourcing_candidates add column if not exists imported_automatically boolean not null default false;
alter table public.lead_sourcing_candidates add column if not exists removed_at timestamptz;

alter table public.lead_sourcing_schedules enable row level security;
alter table public.lead_sourcing_settings enable row level security;

drop policy if exists lead_sourcing_schedules_senior_select on public.lead_sourcing_schedules;
create policy lead_sourcing_schedules_senior_select on public.lead_sourcing_schedules for select to authenticated
  using (public.is_senior_member(organization_id));

drop policy if exists lead_sourcing_settings_senior_select on public.lead_sourcing_settings;
create policy lead_sourcing_settings_senior_select on public.lead_sourcing_settings for select to authenticated
  using (public.is_senior_member(organization_id));

comment on table public.lead_sourcing_schedules is 'Recurring automatic lead sourcing (discovery, crawl, import). Service-role writes only.';
comment on table public.lead_sourcing_settings is 'Per-organization monthly lead sourcing limits; null = env default. Service-role writes only.';
