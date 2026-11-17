-- Lead sourcing (founder 2026-11-17: "build this scraping and lead-feeding into AXXESS as agent+MCP").
-- An agent starts a run with seed companies (MCP tool source_leads); a worker outside Vercel crawls
-- the sites and writes candidates back; a person approves candidates (approve_sourced_leads, always
-- through approval_requests) before they are imported as crm_leads by the normal import rules.
-- Written only by the server with the service role: users get read access and nothing else.

create table if not exists public.lead_sourcing_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_user uuid references public.users(id) on delete set null,
  requested_by_connection uuid,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  segment text check (segment is null or length(segment) <= 40),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  seeds jsonb not null default '[]'::jsonb check (jsonb_typeof(seeds) = 'array' and jsonb_array_length(seeds) <= 150),
  seed_count integer not null default 0 check (seed_count between 0 and 150),
  verify_cap integer not null default 0 check (verify_cap between 0 and 100),
  credits_spent integer not null default 0 check (credits_spent >= 0),
  stats jsonb not null default '{}'::jsonb,
  error text check (error is null or length(error) <= 300),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists lead_sourcing_runs_org_idx on public.lead_sourcing_runs(organization_id, created_at desc);

create table if not exists public.lead_sourcing_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.lead_sourcing_runs(id) on delete cascade,
  company text not null check (length(company) between 1 and 200),
  domain text check (domain is null or length(domain) <= 253),
  country text not null check (country ~ '^[A-Z]{2}$'),
  segment text check (segment is null or length(segment) <= 40),
  contact_name text not null check (length(contact_name) between 1 and 120),
  role text not null check (length(role) between 1 and 60),
  email text not null check (email = lower(email) and length(email) between 3 and 320),
  email_kind text not null check (email_kind in ('published-personal', 'published-role', 'guessed')),
  verified text check (verified is null or verified in ('keep', 'review', 'drop')),
  score integer not null default 0,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'imported')),
  lead_id uuid references public.crm_leads(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index if not exists lead_sourcing_candidates_run_company_idx on public.lead_sourcing_candidates(run_id, lower(company));
create index if not exists lead_sourcing_candidates_org_idx on public.lead_sourcing_candidates(organization_id, status, created_at desc);

-- Do-not-contact list by company (contact_suppressions covers single emails and phones only).
-- A matching seed is dropped before any site is fetched.
create table if not exists public.lead_source_exclusions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_norm text not null default '' check (length(company_norm) <= 200),
  domain_label text not null default '' check (length(domain_label) <= 100),
  reason text not null default 'manual' check (reason in ('founder_network', 'customer', 'competitor', 'manual')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (company_norm <> '' or domain_label <> '')
);

create unique index if not exists lead_source_exclusions_unique_idx
  on public.lead_source_exclusions(organization_id, company_norm, domain_label);

alter table public.lead_sourcing_runs enable row level security;
alter table public.lead_sourcing_candidates enable row level security;
alter table public.lead_source_exclusions enable row level security;

-- Sourced contacts are personal data before import, so only senior members can read them.
drop policy if exists lead_sourcing_runs_senior_select on public.lead_sourcing_runs;
create policy lead_sourcing_runs_senior_select on public.lead_sourcing_runs for select to authenticated
  using (public.is_senior_member(organization_id));

drop policy if exists lead_sourcing_candidates_senior_select on public.lead_sourcing_candidates;
create policy lead_sourcing_candidates_senior_select on public.lead_sourcing_candidates for select to authenticated
  using (public.is_senior_member(organization_id));

drop policy if exists lead_source_exclusions_senior_select on public.lead_source_exclusions;
create policy lead_source_exclusions_senior_select on public.lead_source_exclusions for select to authenticated
  using (public.is_senior_member(organization_id));

comment on table public.lead_sourcing_runs is 'Agent-started lead sourcing runs and their seed companies. Service-role writes only.';
comment on table public.lead_sourcing_candidates is 'Crawled lead candidates awaiting human approval before import. Service-role writes only.';
comment on table public.lead_source_exclusions is 'Companies never to research or contact (by normalised name or domain label). Service-role writes only.';
