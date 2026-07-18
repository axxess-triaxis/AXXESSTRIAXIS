-- Sprint 29: pilot tenant acceptance and live-operations handoff evidence.

create extension if not exists pgcrypto;

create table if not exists public.pilot_tenant_acceptance_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recorded_by_user_id uuid references public.users(id) on delete set null,
  status text not null check (status in ('accepted', 'ready_for_acceptance', 'needs_evidence', 'blocked')),
  stage text not null check (stage in ('trial_setup', 'pilot_execution', 'acceptance_review', 'live_operations')),
  acceptance_score integer not null check (acceptance_score between 0 and 100),
  completion_percent integer not null check (completion_percent between 0 and 100),
  readiness_score integer not null check (readiness_score between 0 and 100),
  command_center_score integer not null check (command_center_score between 0 and 100),
  checklist jsonb not null default '[]'::jsonb,
  handoffs jsonb not null default '[]'::jsonb,
  recommendations text[] not null default array[]::text[],
  accepted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pilot_acceptance_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  acceptance_run_id uuid not null references public.pilot_tenant_acceptance_runs(id) on delete cascade,
  criterion_id text not null,
  label text not null,
  status text not null check (status in ('accepted', 'ready', 'needs_evidence', 'blocked')),
  owner text not null check (owner in ('tenant-admin', 'customer-success', 'platform', 'ai-governance')),
  route text not null,
  detail text not null,
  evidence text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pilot_live_ops_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  acceptance_run_id uuid references public.pilot_tenant_acceptance_runs(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null check (event_type in ('snapshot', 'accepted', 'handoff_recorded', 'support_note', 'blocker_cleared')),
  status text not null check (status in ('ready', 'monitoring', 'blocked')),
  title text not null,
  description text,
  route text not null,
  evidence text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pilot_tenant_acceptance_runs_org_created_idx
  on public.pilot_tenant_acceptance_runs (organization_id, created_at desc);
create index if not exists pilot_tenant_acceptance_runs_org_status_idx
  on public.pilot_tenant_acceptance_runs (organization_id, status, created_at desc);
create index if not exists pilot_acceptance_checklist_items_run_idx
  on public.pilot_acceptance_checklist_items (organization_id, acceptance_run_id);
create index if not exists pilot_acceptance_checklist_items_status_idx
  on public.pilot_acceptance_checklist_items (organization_id, status, created_at desc);
create index if not exists pilot_live_ops_events_org_created_idx
  on public.pilot_live_ops_events (organization_id, created_at desc);
create index if not exists pilot_live_ops_events_run_idx
  on public.pilot_live_ops_events (organization_id, acceptance_run_id);

alter table public.pilot_tenant_acceptance_runs enable row level security;
alter table public.pilot_acceptance_checklist_items enable row level security;
alter table public.pilot_live_ops_events enable row level security;

drop policy if exists pilot_tenant_acceptance_runs_member_select on public.pilot_tenant_acceptance_runs;
create policy pilot_tenant_acceptance_runs_member_select on public.pilot_tenant_acceptance_runs for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists pilot_tenant_acceptance_runs_admin_insert on public.pilot_tenant_acceptance_runs;
create policy pilot_tenant_acceptance_runs_admin_insert on public.pilot_tenant_acceptance_runs for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists pilot_tenant_acceptance_runs_admin_update on public.pilot_tenant_acceptance_runs;
create policy pilot_tenant_acceptance_runs_admin_update on public.pilot_tenant_acceptance_runs for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists pilot_acceptance_checklist_items_member_select on public.pilot_acceptance_checklist_items;
create policy pilot_acceptance_checklist_items_member_select on public.pilot_acceptance_checklist_items for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists pilot_acceptance_checklist_items_admin_insert on public.pilot_acceptance_checklist_items;
create policy pilot_acceptance_checklist_items_admin_insert on public.pilot_acceptance_checklist_items for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists pilot_acceptance_checklist_items_admin_update on public.pilot_acceptance_checklist_items;
create policy pilot_acceptance_checklist_items_admin_update on public.pilot_acceptance_checklist_items for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists pilot_live_ops_events_member_select on public.pilot_live_ops_events;
create policy pilot_live_ops_events_member_select on public.pilot_live_ops_events for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists pilot_live_ops_events_admin_insert on public.pilot_live_ops_events;
create policy pilot_live_ops_events_admin_insert on public.pilot_live_ops_events for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists pilot_live_ops_events_admin_update on public.pilot_live_ops_events;
create policy pilot_live_ops_events_admin_update on public.pilot_live_ops_events for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant select, insert, update on public.pilot_tenant_acceptance_runs to authenticated;
grant select, insert, update on public.pilot_acceptance_checklist_items to authenticated;
grant select, insert, update on public.pilot_live_ops_events to authenticated;

grant all on public.pilot_tenant_acceptance_runs to service_role;
grant all on public.pilot_acceptance_checklist_items to service_role;
grant all on public.pilot_live_ops_events to service_role;

comment on table public.pilot_tenant_acceptance_runs is 'Sprint 29 tenant acceptance snapshots for pilot conversion and live operations.';
comment on table public.pilot_acceptance_checklist_items is 'Criterion-level acceptance evidence for each pilot tenant acceptance run.';
comment on table public.pilot_live_ops_events is 'Operator handoff and live-ops events tied to pilot acceptance evidence.';
