create table if not exists public.module_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  module text not null,
  created_at timestamptz not null default now()
);

create index if not exists module_usage_events_org_module_idx
  on public.module_usage_events (organization_id, module, created_at desc);

alter table public.module_usage_events enable row level security;

drop policy if exists module_usage_events_member_select on public.module_usage_events;
create policy module_usage_events_member_select
  on public.module_usage_events for select
  using (public.is_org_member(organization_id));

drop policy if exists module_usage_events_member_insert on public.module_usage_events;
create policy module_usage_events_member_insert
  on public.module_usage_events for insert
  with check (public.is_org_member(organization_id));

grant select, insert on public.module_usage_events to authenticated;

comment on table public.module_usage_events is 'Tenant-scoped per-navigation module-usage log, feeding the real "Most Used Modules" view on Product Analytics.';
comment on column public.module_usage_events.module is 'Stable module id from src/app/routing/routes.ts, e.g. ai-workspace, projects, tasks.';
