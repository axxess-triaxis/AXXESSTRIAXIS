-- ROLLBACK for supabase/migrations/20260812140000_fix_audit_trigger_old_role_eager_resolution.sql
--
-- NOT a migration -- kept outside supabase/migrations/ so the CLI never auto-applies it.
--
-- WARNING: restores the exact function body from 20260812130000, which still contains the
-- confirmed crash bug (SQLSTATE 42703, "record \"old\" has no field \"role\"") on ordinary
-- user_roles writes -- 20260812130000's nested-CASE attempt did not actually fix it. Only use
-- this if 20260812140000's own fix is found to cause a *different*, worse regression.

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

  target_action := case
    when tg_table_name = 'projects' and tg_op = 'INSERT' then 'project.created'
    when tg_table_name = 'projects' and tg_op = 'UPDATE' then 'project.updated'
    when tg_table_name = 'tasks' and tg_op = 'INSERT' then 'task.created'
    when tg_table_name = 'tasks' and tg_op = 'UPDATE' then 'task.updated'
    when tg_table_name = 'meetings' and tg_op = 'INSERT' then 'meeting.created'
    when tg_table_name = 'organizations' and tg_op = 'UPDATE' then 'organization.updated'
    when tg_table_name = 'users' and tg_op = 'UPDATE' then
      case
        when old.role is distinct from new.role then 'role.changed'
        else lower(tg_table_name) || '.' || lower(tg_op)
      end
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
