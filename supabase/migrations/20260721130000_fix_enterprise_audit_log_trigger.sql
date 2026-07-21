-- Fixes public.record_enterprise_audit_log(), defined in
-- 20260703025318_sprint6_server_auth_repositories.sql, which breaks every insert/update to
-- projects, tasks, meetings, and organizations (any table it's attached to other than users).
--
-- Root cause: the function is a single generic trigger shared across multiple tables (OLD/NEW
-- are typed to whichever table actually fired the trigger). One branch of its `target_action`
-- CASE expression referenced `old.role is distinct from new.role`, intended only for the
-- users-table trigger. Because a CASE expression is planned as one SQL statement, Postgres must
-- resolve every column reference across all WHEN branches before it can execute any of them --
-- regardless of which branch's condition is actually true. `role` doesn't exist on
-- projects/tasks/meetings/organizations, so every write to those tables failed outright with
-- "record \"old\" has no field \"role\"" (discovered while starting a local Supabase instance for
-- a Sprint 3 planning verification step; see PRODUCT_ITERATION_I_CLOSEOUT.md /
-- ITERATION_PROGRESS.md for context).
--
-- Fix: compute the role-change flag in its own `if tg_table_name = 'users' ... then` block before
-- the CASE. PL/pgSQL only prepares/executes a procedural IF branch's body when that branch is
-- actually reached, unlike a single CASE expression -- so `old.role`/`new.role` are never touched
-- for any other table's trigger firing.
--
-- Also fixes a second bug in the same function: its own `insert into public.audit_logs` never set
-- `tenant_id`, which a later migration (20260709.../sprint13) made NOT NULL on this table. Once the
-- role bug above is fixed and this trigger can actually reach its INSERT, it would fail that
-- constraint next. Sets tenant_id = target_organization_id, matching the same convention that
-- migration's own backfill used (tenant_id = organization_id) for every other row on this table.

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
  users_role_changed boolean := false;
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

  if tg_table_name = 'users' and tg_op = 'UPDATE' then
    users_role_changed := old.role is distinct from new.role;
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
    when tg_table_name = 'users' and tg_op = 'UPDATE' and users_role_changed then 'role.changed'
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
    tenant_id,
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

-- record_permission_audit_log() (attached to role_permissions) has the same missing-tenant_id
-- gap as record_enterprise_audit_log() above, though not the old.role type-mismatch issue.
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
    tenant_id,
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
