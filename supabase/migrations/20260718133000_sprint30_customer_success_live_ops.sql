-- Sprint 30: customer-success live operations, stuck-step recovery, SLA timers,
-- and regional key policy posture.

create extension if not exists pgcrypto;

create table if not exists public.customer_success_live_ops_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generated_by_user_id uuid references public.users(id) on delete set null,
  organization_name text not null,
  status text not null check (status in ('live_ops_ready', 'monitoring', 'needs_attention', 'blocked')),
  score integer not null check (score between 0 and 100),
  generated_at timestamptz not null,
  recovery_items jsonb not null default '[]'::jsonb,
  sla_timers jsonb not null default '[]'::jsonb,
  regional_key_policies jsonb not null default '[]'::jsonb,
  recommendations text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_success_recovery_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_id uuid references public.customer_success_live_ops_snapshots(id) on delete cascade,
  workflow_step_id text not null,
  title text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null check (status in ('ready', 'monitoring', 'blocked', 'recovered')),
  owner_role text not null,
  route text not null,
  due_at timestamptz,
  evidence text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_success_sla_timers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_id uuid references public.customer_success_live_ops_snapshots(id) on delete cascade,
  timer_key text not null,
  label text not null,
  status text not null check (status in ('healthy', 'due_soon', 'breached', 'blocked')),
  owner_role text not null,
  route text not null,
  starts_at timestamptz not null,
  due_at timestamptz not null,
  breached_at timestamptz,
  evidence text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regional_key_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_id uuid references public.customer_success_live_ops_snapshots(id) on delete set null,
  region_code text not null,
  policy_name text not null,
  key_scope text not null,
  status text not null check (status in ('ready', 'needs_key_owner', 'provider_gated', 'rotation_due')),
  key_owner_role text not null,
  rotation_days integer not null default 90 check (rotation_days between 1 and 730),
  residency_note text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_success_live_ops_snapshots_org_created_idx
  on public.customer_success_live_ops_snapshots (organization_id, created_at desc);
create index if not exists customer_success_live_ops_snapshots_org_status_idx
  on public.customer_success_live_ops_snapshots (organization_id, status, created_at desc);
create index if not exists customer_success_recovery_items_org_status_idx
  on public.customer_success_recovery_items (organization_id, status, severity, created_at desc);
create index if not exists customer_success_recovery_items_snapshot_idx
  on public.customer_success_recovery_items (organization_id, snapshot_id);
create index if not exists customer_success_sla_timers_org_status_idx
  on public.customer_success_sla_timers (organization_id, status, due_at);
create index if not exists customer_success_sla_timers_snapshot_idx
  on public.customer_success_sla_timers (organization_id, snapshot_id);
create index if not exists regional_key_policies_org_region_idx
  on public.regional_key_policies (organization_id, region_code, status);

drop trigger if exists set_customer_success_recovery_items_updated_at on public.customer_success_recovery_items;
create trigger set_customer_success_recovery_items_updated_at before update on public.customer_success_recovery_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_customer_success_sla_timers_updated_at on public.customer_success_sla_timers;
create trigger set_customer_success_sla_timers_updated_at before update on public.customer_success_sla_timers
  for each row execute function public.set_updated_at();

drop trigger if exists set_regional_key_policies_updated_at on public.regional_key_policies;
create trigger set_regional_key_policies_updated_at before update on public.regional_key_policies
  for each row execute function public.set_updated_at();

alter table public.customer_success_live_ops_snapshots enable row level security;
alter table public.customer_success_recovery_items enable row level security;
alter table public.customer_success_sla_timers enable row level security;
alter table public.regional_key_policies enable row level security;

drop policy if exists customer_success_live_ops_snapshots_member_select on public.customer_success_live_ops_snapshots;
create policy customer_success_live_ops_snapshots_member_select on public.customer_success_live_ops_snapshots for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists customer_success_live_ops_snapshots_admin_insert on public.customer_success_live_ops_snapshots;
create policy customer_success_live_ops_snapshots_admin_insert on public.customer_success_live_ops_snapshots for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists customer_success_live_ops_snapshots_admin_update on public.customer_success_live_ops_snapshots;
create policy customer_success_live_ops_snapshots_admin_update on public.customer_success_live_ops_snapshots for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists customer_success_recovery_items_member_select on public.customer_success_recovery_items;
create policy customer_success_recovery_items_member_select on public.customer_success_recovery_items for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists customer_success_recovery_items_admin_insert on public.customer_success_recovery_items;
create policy customer_success_recovery_items_admin_insert on public.customer_success_recovery_items for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists customer_success_recovery_items_admin_update on public.customer_success_recovery_items;
create policy customer_success_recovery_items_admin_update on public.customer_success_recovery_items for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists customer_success_sla_timers_member_select on public.customer_success_sla_timers;
create policy customer_success_sla_timers_member_select on public.customer_success_sla_timers for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists customer_success_sla_timers_admin_insert on public.customer_success_sla_timers;
create policy customer_success_sla_timers_admin_insert on public.customer_success_sla_timers for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists customer_success_sla_timers_admin_update on public.customer_success_sla_timers;
create policy customer_success_sla_timers_admin_update on public.customer_success_sla_timers for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists regional_key_policies_member_select on public.regional_key_policies;
create policy regional_key_policies_member_select on public.regional_key_policies for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists regional_key_policies_admin_insert on public.regional_key_policies;
create policy regional_key_policies_admin_insert on public.regional_key_policies for insert to authenticated
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists regional_key_policies_admin_update on public.regional_key_policies;
create policy regional_key_policies_admin_update on public.regional_key_policies for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant select, insert, update on public.customer_success_live_ops_snapshots to authenticated;
grant select, insert, update on public.customer_success_recovery_items to authenticated;
grant select, insert, update on public.customer_success_sla_timers to authenticated;
grant select, insert, update on public.regional_key_policies to authenticated;

grant all on public.customer_success_live_ops_snapshots to service_role;
grant all on public.customer_success_recovery_items to service_role;
grant all on public.customer_success_sla_timers to service_role;
grant all on public.regional_key_policies to service_role;

comment on table public.customer_success_live_ops_snapshots is 'Sprint 30 customer-success live-ops snapshots for pilot recovery, SLA and regional key policy posture.';
comment on table public.customer_success_recovery_items is 'Tenant-scoped stuck-step recovery records derived from the golden path.';
comment on table public.customer_success_sla_timers is 'Customer-success SLA timers for pilot support, AI review and evidence handoff.';
comment on table public.regional_key_policies is 'Tenant regional key, BYOK and residency policy posture for customer-success live operations.';
