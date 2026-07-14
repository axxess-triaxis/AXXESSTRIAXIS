-- AXXESS by Triaxis - Sprint 6 Supabase-backed SaaS data layer.
-- Adds invitation provisioning, audit metadata, Consultant role readiness,
-- explicit Data API grants, and stronger RLS policies for production access.

create extension if not exists pgcrypto;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.app_role not null,
  invited_by_user_id uuid references public.profiles(id) on delete set null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_enterprise_role_check check (
    role in ('Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee', 'Consultant', 'Guest')
  )
);

alter table public.audit_logs
  add column if not exists category text,
  add column if not exists request_id text,
  add column if not exists actor_role public.app_role;

do $$
begin
  alter table public.users drop constraint if exists users_sprint5_role_check;
  alter table public.users drop constraint if exists users_enterprise_role_check;
  alter table public.users
    add constraint users_enterprise_role_check check (
      role in ('Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee', 'Consultant', 'Guest')
    );
end $$;

create unique index if not exists invitations_token_hash_idx on public.invitations (token_hash);
create index if not exists invitations_organization_status_idx on public.invitations (organization_id, status, expires_at);
create index if not exists invitations_email_status_idx on public.invitations (email, status);
create index if not exists audit_logs_category_idx on public.audit_logs (organization_id, category, created_at desc);
create index if not exists audit_logs_request_idx on public.audit_logs (request_id) where request_id is not null;

create or replace function public.record_enterprise_audit_log()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_organization_id uuid;
  target_resource_id uuid;
  target_action text;
  target_category text;
  current_actor_role public.app_role;
begin
  if tg_table_name = 'organizations' then
    target_organization_id := coalesce(new.id, old.id);
    target_resource_id := target_organization_id;
  elsif tg_table_name = 'user_roles' then
    if tg_op = 'DELETE' then
      target_organization_id := old.organization_id;
      target_resource_id := old.role_id;
    else
      target_organization_id := new.organization_id;
      target_resource_id := new.role_id;
    end if;
  else
    target_organization_id := coalesce(new.organization_id, old.organization_id);
    target_resource_id := coalesce(new.id, old.id);
  end if;

  select app_user.role
    into current_actor_role
  from public.users app_user
  where app_user.id = auth.uid()
    and app_user.organization_id = target_organization_id
  limit 1;

  target_action := case
    when tg_table_name = 'projects' and tg_op = 'INSERT' then 'project.created'
    when tg_table_name = 'projects' and tg_op = 'UPDATE' then 'project.updated'
    when tg_table_name = 'tasks' and tg_op = 'INSERT' then 'task.created'
    when tg_table_name = 'tasks' and tg_op = 'UPDATE' then 'task.updated'
    when tg_table_name = 'meetings' and tg_op = 'INSERT' then 'meeting.created'
    when tg_table_name = 'organizations' and tg_op = 'UPDATE' then 'organization.updated'
    when tg_table_name = 'users' and tg_op = 'UPDATE' and old.role is distinct from new.role then 'role.changed'
    when tg_table_name = 'user_roles' then 'role.changed'
    else lower(tg_table_name) || '.' || lower(tg_op)
  end;

  target_category := case
    when target_action like 'project.%' then 'project-management'
    when target_action like 'task.%' then 'task-management'
    when target_action like 'meeting.%' then 'meeting-management'
    when target_action in ('role.changed', 'permission.changed') then 'access-control'
    when target_action = 'organization.updated' then 'organization-management'
    else 'system'
  end;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    actor_role,
    action,
    resource_type,
    resource_id,
    category,
    metadata
  )
  values (
    target_organization_id,
    auth.uid(),
    current_actor_role,
    target_action,
    tg_table_name,
    target_resource_id,
    target_category,
    jsonb_build_object('operation', tg_op)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.record_permission_audit_log()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_organization_id uuid;
  current_actor_role public.app_role;
begin
  select role.organization_id
    into target_organization_id
  from public.roles role
  where role.id = case when tg_op = 'DELETE' then old.role_id else new.role_id end
  limit 1;

  if target_organization_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select app_user.role
    into current_actor_role
  from public.users app_user
  where app_user.id = auth.uid()
    and app_user.organization_id = target_organization_id
  limit 1;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    actor_role,
    action,
    resource_type,
    resource_id,
    category,
    metadata
  )
  values (
    target_organization_id,
    auth.uid(),
    current_actor_role,
    'permission.changed',
    'role_permissions',
    case when tg_op = 'DELETE' then old.permission_id else new.permission_id end,
    'access-control',
    jsonb_build_object('operation', tg_op, 'role_id', case when tg_op = 'DELETE' then old.role_id else new.role_id end)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists audit_projects_changes on public.projects;
create trigger audit_projects_changes after insert or update on public.projects for each row execute function public.record_enterprise_audit_log();

drop trigger if exists audit_tasks_changes on public.tasks;
create trigger audit_tasks_changes after insert or update on public.tasks for each row execute function public.record_enterprise_audit_log();

drop trigger if exists audit_meetings_changes on public.meetings;
create trigger audit_meetings_changes after insert on public.meetings for each row execute function public.record_enterprise_audit_log();

drop trigger if exists audit_organizations_changes on public.organizations;
create trigger audit_organizations_changes after update on public.organizations for each row execute function public.record_enterprise_audit_log();

drop trigger if exists audit_users_role_changes on public.users;
create trigger audit_users_role_changes after update of role on public.users for each row execute function public.record_enterprise_audit_log();

drop trigger if exists audit_user_roles_changes on public.user_roles;
create trigger audit_user_roles_changes after insert or update or delete on public.user_roles for each row execute function public.record_enterprise_audit_log();

drop trigger if exists audit_role_permissions_changes on public.role_permissions;
create trigger audit_role_permissions_changes after insert or update or delete on public.role_permissions for each row execute function public.record_permission_audit_log();

drop trigger if exists set_invitations_updated_at on public.invitations;
create trigger set_invitations_updated_at
  before update on public.invitations
  for each row
  execute function public.set_updated_at();

alter table public.invitations enable row level security;
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.programs enable row level security;
alter table public.tasks enable row level security;
alter table public.meetings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists invitations_admin_select on public.invitations;
drop policy if exists invitations_admin_insert on public.invitations;
drop policy if exists invitations_admin_update on public.invitations;

create policy invitations_admin_select
  on public.invitations for select
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

create policy invitations_admin_insert
  on public.invitations for insert
  to authenticated
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

create policy invitations_admin_update
  on public.invitations for update
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

drop policy if exists audit_logs_sprint5_member_insert on public.audit_logs;
drop policy if exists audit_logs_system_insert on public.audit_logs;

create policy audit_logs_member_insert
  on public.audit_logs for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists audit_logs_sprint6_admin_select on public.audit_logs;
create policy audit_logs_sprint6_admin_select
  on public.audit_logs for select
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.organizations,
  public.users,
  public.projects,
  public.programs,
  public.tasks,
  public.meetings,
  public.notifications,
  public.audit_logs,
  public.invitations
to authenticated;

comment on table public.invitations is 'AXXESS organization invitations. Email delivery is placeholder-only until a production email provider is selected.';
comment on column public.invitations.token_hash is 'SHA-256 hash of the invitation token. Raw tokens must never be stored.';
comment on column public.audit_logs.category is 'Compliance-friendly action category for filtering and exports.';
comment on column public.audit_logs.request_id is 'Optional request correlation identifier for future compliance exports.';
