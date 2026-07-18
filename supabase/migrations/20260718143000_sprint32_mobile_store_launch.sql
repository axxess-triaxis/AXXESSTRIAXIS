-- Sprint 32: mobile store launch console, listing packs, reviewer accounts,
-- release health evidence, and staged rollout controls.

create extension if not exists pgcrypto;

create table if not exists public.mobile_release_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generated_by_user_id uuid references public.users(id) on delete set null,
  status text not null check (status in ('ready', 'needs_metadata', 'provider_gated', 'blocked')),
  readiness_score integer not null check (readiness_score between 0 and 100),
  app_version text not null,
  build_readiness jsonb not null default '[]'::jsonb,
  store_listings jsonb not null default '[]'::jsonb,
  reviewer_account jsonb not null default '{}'::jsonb,
  screenshot_manifest jsonb not null default '[]'::jsonb,
  release_health jsonb not null default '{}'::jsonb,
  rollout_plan jsonb not null default '[]'::jsonb,
  release_gates jsonb not null default '[]'::jsonb,
  next_actions text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mobile_store_listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  release_run_id uuid references public.mobile_release_runs(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  title text not null,
  subtitle text not null,
  description text not null,
  support_url text not null,
  privacy_url text not null,
  status text not null check (status in ('ready', 'needs_metadata', 'provider_gated', 'blocked')),
  screenshot_status text not null check (screenshot_status in ('ready', 'needs_metadata', 'provider_gated', 'blocked')),
  privacy_status text not null check (privacy_status in ('ready', 'needs_metadata', 'provider_gated', 'blocked')),
  reviewer_notes_status text not null check (reviewer_notes_status in ('ready', 'needs_metadata', 'provider_gated', 'blocked')),
  evidence text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_reviewer_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  release_run_id uuid references public.mobile_release_runs(id) on delete set null,
  email text not null,
  role_name text not null,
  status text not null check (status in ('ready', 'missing', 'needs_rotation', 'provider_gated')),
  last_verified_at timestamptz,
  password_rotation_due_at timestamptz,
  checklist jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_crash_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  release_run_id uuid references public.mobile_release_runs(id) on delete set null,
  platform text not null check (platform in ('android', 'ios', 'webview')),
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  event_key text not null,
  status text not null check (status in ('open', 'monitoring', 'resolved')),
  event_count integer not null default 0 check (event_count >= 0),
  crash_free_sessions numeric(5,2) check (crash_free_sessions between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.mobile_rollout_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  release_run_id uuid references public.mobile_release_runs(id) on delete set null,
  platform text not null check (platform in ('android', 'ios')),
  track text not null,
  status text not null check (status in ('not_started', 'internal_testing', 'testflight', 'staged', 'halted', 'completed')),
  rollout_percent numeric(5,2) not null default 0 check (rollout_percent between 0 and 100),
  countries text[] not null default array[]::text[],
  action text not null,
  actor_user_id uuid references public.users(id) on delete set null,
  evidence text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mobile_release_runs_org_created_idx
  on public.mobile_release_runs (organization_id, created_at desc);
create index if not exists mobile_release_runs_org_status_idx
  on public.mobile_release_runs (organization_id, status, created_at desc);
create index if not exists mobile_store_listings_org_platform_idx
  on public.mobile_store_listings (organization_id, platform, status);
create index if not exists mobile_reviewer_accounts_org_status_idx
  on public.mobile_reviewer_accounts (organization_id, status, updated_at desc);
create index if not exists mobile_crash_events_org_status_idx
  on public.mobile_crash_events (organization_id, status, severity, occurred_at desc);
create index if not exists mobile_rollout_events_org_platform_idx
  on public.mobile_rollout_events (organization_id, platform, status, created_at desc);

drop trigger if exists set_mobile_store_listings_updated_at on public.mobile_store_listings;
create trigger set_mobile_store_listings_updated_at before update on public.mobile_store_listings
  for each row execute function public.set_updated_at();

drop trigger if exists set_mobile_reviewer_accounts_updated_at on public.mobile_reviewer_accounts;
create trigger set_mobile_reviewer_accounts_updated_at before update on public.mobile_reviewer_accounts
  for each row execute function public.set_updated_at();

alter table public.mobile_release_runs enable row level security;
alter table public.mobile_store_listings enable row level security;
alter table public.mobile_reviewer_accounts enable row level security;
alter table public.mobile_crash_events enable row level security;
alter table public.mobile_rollout_events enable row level security;

drop policy if exists mobile_release_runs_member_select on public.mobile_release_runs;
create policy mobile_release_runs_member_select on public.mobile_release_runs for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists mobile_release_runs_admin_insert on public.mobile_release_runs;
create policy mobile_release_runs_admin_insert on public.mobile_release_runs for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_release_runs_admin_update on public.mobile_release_runs;
create policy mobile_release_runs_admin_update on public.mobile_release_runs for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_store_listings_member_select on public.mobile_store_listings;
create policy mobile_store_listings_member_select on public.mobile_store_listings for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists mobile_store_listings_admin_insert on public.mobile_store_listings;
create policy mobile_store_listings_admin_insert on public.mobile_store_listings for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_store_listings_admin_update on public.mobile_store_listings;
create policy mobile_store_listings_admin_update on public.mobile_store_listings for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_reviewer_accounts_member_select on public.mobile_reviewer_accounts;
create policy mobile_reviewer_accounts_member_select on public.mobile_reviewer_accounts for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists mobile_reviewer_accounts_admin_insert on public.mobile_reviewer_accounts;
create policy mobile_reviewer_accounts_admin_insert on public.mobile_reviewer_accounts for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_reviewer_accounts_admin_update on public.mobile_reviewer_accounts;
create policy mobile_reviewer_accounts_admin_update on public.mobile_reviewer_accounts for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_crash_events_member_select on public.mobile_crash_events;
create policy mobile_crash_events_member_select on public.mobile_crash_events for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists mobile_crash_events_admin_insert on public.mobile_crash_events;
create policy mobile_crash_events_admin_insert on public.mobile_crash_events for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_crash_events_admin_update on public.mobile_crash_events;
create policy mobile_crash_events_admin_update on public.mobile_crash_events for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_rollout_events_member_select on public.mobile_rollout_events;
create policy mobile_rollout_events_member_select on public.mobile_rollout_events for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists mobile_rollout_events_admin_insert on public.mobile_rollout_events;
create policy mobile_rollout_events_admin_insert on public.mobile_rollout_events for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists mobile_rollout_events_admin_update on public.mobile_rollout_events;
create policy mobile_rollout_events_admin_update on public.mobile_rollout_events for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant select, insert, update on public.mobile_release_runs to authenticated;
grant select, insert, update on public.mobile_store_listings to authenticated;
grant select, insert, update on public.mobile_reviewer_accounts to authenticated;
grant select, insert, update on public.mobile_crash_events to authenticated;
grant select, insert, update on public.mobile_rollout_events to authenticated;

grant all on public.mobile_release_runs to service_role;
grant all on public.mobile_store_listings to service_role;
grant all on public.mobile_reviewer_accounts to service_role;
grant all on public.mobile_crash_events to service_role;
grant all on public.mobile_rollout_events to service_role;

comment on table public.mobile_release_runs is 'Sprint 32 tenant-scoped mobile store launch readiness snapshots.';
comment on table public.mobile_store_listings is 'Apple and Google store listing pack evidence for mobile release review.';
comment on table public.mobile_reviewer_accounts is 'Reviewer account readiness and rotation evidence for App Review and Play review.';
comment on table public.mobile_crash_events is 'Mobile crash, webview, auth and release-health event evidence.';
comment on table public.mobile_rollout_events is 'Staged rollout and store-track events for Android and iOS releases.';
