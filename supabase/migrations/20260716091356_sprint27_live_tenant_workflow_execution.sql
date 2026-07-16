-- Sprint 27: live tenant workflow execution, golden-path progress, and timeline evidence.

create extension if not exists pgcrypto;

create table if not exists public.enterprise_workflow_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  step_id text not null,
  status text not null default 'not_started' check (status in ('not_started', 'active', 'ready', 'needs_review', 'complete', 'blocked')),
  last_event_id uuid,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, step_id)
);

create table if not exists public.workflow_timeline_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_type text not null,
  resource_id uuid,
  event_type text not null,
  title text not null,
  description text,
  actor_user_id uuid references public.users(id) on delete set null,
  actor_label text,
  source_type text,
  source_id text,
  audit_log_id uuid references public.audit_logs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists enterprise_workflow_progress_org_step_idx
  on public.enterprise_workflow_progress (organization_id, step_id);

create index if not exists enterprise_workflow_progress_org_status_idx
  on public.enterprise_workflow_progress (organization_id, status, updated_at desc);

create index if not exists workflow_timeline_events_org_created_idx
  on public.workflow_timeline_events (organization_id, created_at desc);

create index if not exists workflow_timeline_events_resource_idx
  on public.workflow_timeline_events (organization_id, resource_type, resource_id, created_at desc);

create index if not exists workflow_timeline_events_source_idx
  on public.workflow_timeline_events (organization_id, source_type, source_id, created_at desc);

drop trigger if exists set_enterprise_workflow_progress_updated_at on public.enterprise_workflow_progress;
create trigger set_enterprise_workflow_progress_updated_at before update on public.enterprise_workflow_progress
  for each row execute function public.set_updated_at();

alter table public.enterprise_workflow_progress enable row level security;
alter table public.workflow_timeline_events enable row level security;

drop policy if exists enterprise_workflow_progress_member_select on public.enterprise_workflow_progress;
create policy enterprise_workflow_progress_member_select on public.enterprise_workflow_progress for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists enterprise_workflow_progress_member_insert on public.enterprise_workflow_progress;
create policy enterprise_workflow_progress_member_insert on public.enterprise_workflow_progress for insert to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists enterprise_workflow_progress_member_update on public.enterprise_workflow_progress;
create policy enterprise_workflow_progress_member_update on public.enterprise_workflow_progress for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists workflow_timeline_events_member_select on public.workflow_timeline_events;
create policy workflow_timeline_events_member_select on public.workflow_timeline_events for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists workflow_timeline_events_member_insert on public.workflow_timeline_events;
create policy workflow_timeline_events_member_insert on public.workflow_timeline_events for insert to authenticated
  with check (
    public.is_org_member(organization_id)
    and (
      actor_user_id is null
      or actor_user_id = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    )
  );

grant select, insert, update on public.enterprise_workflow_progress to authenticated;
grant select, insert on public.workflow_timeline_events to authenticated;

grant select, insert, update on
  public.enterprise_workflow_progress,
  public.workflow_timeline_events
to service_role;

comment on table public.enterprise_workflow_progress is 'Tenant-scoped persisted completion state for the AXXESS golden-path pilot journey.';
comment on table public.workflow_timeline_events is 'Tenant-scoped timeline evidence linking knowledge sources, AI answers, human decisions, workflow actions, dashboards, and audit records.';
