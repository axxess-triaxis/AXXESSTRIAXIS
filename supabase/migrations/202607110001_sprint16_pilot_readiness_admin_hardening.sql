-- Sprint 16: pilot readiness, admin hardening, and audit export support.

create index if not exists audit_logs_sprint16_resource_idx
  on public.audit_logs (organization_id, resource_type, created_at desc);

create index if not exists audit_logs_sprint16_action_idx
  on public.audit_logs (organization_id, action, created_at desc);

create table if not exists public.pilot_readiness_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  step_id text not null,
  event_type text not null default 'step_completed',
  source text not null default 'web',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pilot_readiness_events_org_step_idx
  on public.pilot_readiness_events (organization_id, step_id, created_at desc);

create index if not exists pilot_readiness_events_org_user_idx
  on public.pilot_readiness_events (organization_id, user_id, created_at desc);

alter table public.pilot_readiness_events enable row level security;

drop policy if exists pilot_readiness_events_member_select on public.pilot_readiness_events;
create policy pilot_readiness_events_member_select
  on public.pilot_readiness_events for select
  using (public.is_org_member(organization_id));

drop policy if exists pilot_readiness_events_member_insert on public.pilot_readiness_events;
create policy pilot_readiness_events_member_insert
  on public.pilot_readiness_events for insert
  with check (public.is_org_member(organization_id));

drop policy if exists pilot_readiness_events_admin_update on public.pilot_readiness_events;
create policy pilot_readiness_events_admin_update
  on public.pilot_readiness_events for update
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

grant select, insert, update on public.pilot_readiness_events to authenticated;

comment on table public.pilot_readiness_events is 'Tenant-scoped pilot onboarding and conversion-readiness events for Sprint 16.';
comment on column public.pilot_readiness_events.step_id is 'Stable pilot onboarding step identifier, such as first_project, first_ai_question, or view_audit_trail.';
comment on column public.pilot_readiness_events.metadata is 'Sanitized event context for pilot conversion analytics. Do not store secrets or raw document text.';
