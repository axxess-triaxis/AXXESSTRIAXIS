-- Second emergency fix, same-day follow-up to 20260812130000. That migration's nested-CASE
-- fix did NOT resolve the crash -- confirmed by reproducing the exact failure directly via SQL
-- (bypassing PostgREST) and reading the full Postgres CONTEXT trace, which pointed at the same
-- `target_action := case ... end` assignment, unchanged by that fix.
--
-- Corrected root cause: this is not a short-circuit-evaluation-order problem at all. PL/pgSQL
-- compiles the entire `case ... end` expression (including nested CASE branches) as ONE combined
-- SQL expression tree, and Postgres resolves every `record.field` reference in that tree against
-- the actual row type bound to `old`/`new` for THIS invocation -- eagerly, for the whole tree,
-- before any branch's value is selected at runtime. Nesting the CASE (20260812130000's attempt)
-- does not change this, because it is still one combined expression passed to the executor as a
-- single unit. `old.role`/`new.role` are therefore resolved (and fail, since user_roles has no
-- `role` column) on every invocation of this shared function, for every table, regardless of
-- which CASE branch would "logically" apply -- confirmed empirically via a raw SQL reproduction
-- (docs/readiness/ORGANIZATION_HARD_DELETE_TRIGGER_FIX_2026_08_12.md has the full trace).
--
-- Fix: move the users-role-change logic out of the shared CASE expression entirely, into a real
-- PL/pgSQL IF/ELSE statement. Each IF branch is a separately compiled/executed statement, so
-- `old.role`/`new.role` are only ever type-checked when this invocation is already, structurally,
-- inside the tg_table_name = 'users' branch -- this is the same principle that already made the
-- organization-hard-delete guard (20260812120000) work correctly: real PL/pgSQL control flow, not
-- a SQL CASE sub-expression, is what actually gates record-field access safely here.
--
-- This is the only structural change relative to 20260812130000. Every other branch (projects,
-- tasks, meetings, organizations, user_roles, the catch-all else) produces the identical value it
-- always has; the organization-hard-delete guard is unchanged.

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
      -- Cascade-from-organization-delete guard (20260812120000): if the organization this
      -- row belonged to no longer exists, this DELETE is a direct consequence of that
      -- organization being deleted in the same statement -- skip the audit write instead of
      -- attempting an insert that would fail every time with SQLSTATE 23503
      -- (audit_logs_organization_id_fkey), rolling back the entire organization delete.
      if not exists (select 1 from public.organizations org where org.id = target_organization_id) then
        return old;
      end if;
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

  -- Moved out of the shared CASE below (this migration's fix): a real PL/pgSQL IF branch,
  -- entered only when tg_table_name = 'users' is already true for this invocation, so
  -- old.role/new.role are never type-checked against any other table's row type.
  if tg_table_name = 'users' and tg_op = 'UPDATE' then
    if old.role is distinct from new.role then
      target_action := 'role.changed';
    else
      target_action := lower(tg_table_name) || '.' || lower(tg_op);
    end if;
  else
    target_action := case
      when tg_table_name = 'projects' and tg_op = 'INSERT' then 'project.created'
      when tg_table_name = 'projects' and tg_op = 'UPDATE' then 'project.updated'
      when tg_table_name = 'tasks' and tg_op = 'INSERT' then 'task.created'
      when tg_table_name = 'tasks' and tg_op = 'UPDATE' then 'task.updated'
      when tg_table_name = 'meetings' and tg_op = 'INSERT' then 'meeting.created'
      when tg_table_name = 'organizations' and tg_op = 'UPDATE' then 'organization.updated'
      when tg_table_name = 'user_roles' then 'role.changed'
      else lower(tg_table_name) || '.' || lower(tg_op)
    end;
  end if;

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
