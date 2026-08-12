-- ROLLBACK for supabase/migrations/20260812120000_fix_organization_hard_delete_audit_trigger.sql
--
-- NOT a migration. Do not place this file (or a copy of it) inside supabase/migrations/ --
-- the Supabase CLI applies every file in that directory in order; this file is deliberately
-- kept outside it and is only ever run manually, by explicit founder decision, if the forward
-- migration needs to be reverted.
--
-- Effect of running this: restores record_enterprise_audit_log() to its exact pre-fix body
-- (byte-for-byte identical to supabase/migrations/20260703025318_sprint6_server_auth_repositories.sql's
-- original definition). This re-introduces the organization-hard-delete defect (SQLSTATE 23503,
-- constraint audit_logs_organization_id_fkey) -- only run this if the forward fix itself is found
-- to have caused a regression and needs to be backed out while a different fix is designed.
--
-- This statement only ever replaces the function body; it does not touch the trigger definition,
-- any table, any RLS policy, or any data. No data was deleted or altered by the forward migration,
-- so no data-level rollback is needed -- this is a pure function-body revert.

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
