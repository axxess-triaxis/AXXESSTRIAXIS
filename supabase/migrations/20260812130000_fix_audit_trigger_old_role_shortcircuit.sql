-- Emergency fix, same-day follow-up to 20260812120000_fix_organization_hard_delete_audit_trigger.sql.
--
-- Discovered live, 2026-08-12: immediately after that migration replaced
-- record_enterprise_audit_log(), an ordinary user_roles INSERT (via the isolation harness,
-- a real, unprivileged tenant-setup write -- not the delete path that migration targeted)
-- failed with SQLSTATE 42703, "record \"old\" has no field \"role\"".
--
-- Root cause: target_action's CASE expression contains
--   when tg_table_name = 'users' and tg_op = 'UPDATE' and old.role is distinct from new.role
--     then 'role.changed'
-- This assumes the flat AND chain short-circuits on `tg_table_name = 'users'` before ever
-- touching `old.role` (user_roles has no `role` column -- only `role_id` -- so this reference
-- is invalid for any other table's invocation of this shared function). That assumption does
-- not hold reliably here. This exact line was unchanged by the prior migration and had run
-- successfully in 3 prior isolation-harness executions before this same-day replacement --
-- consistent with the failure being a previously-latent defect exposed by the function being
-- freshly recompiled, not a regression introduced by this migration's own logic change.
--
-- Fix: replace the flat AND with a nested CASE. Nested CASE branches are only evaluated once
-- their enclosing WHEN is already selected -- unlike a flat AND chain's short-circuit behavior,
-- this IS guaranteed by the SQL CASE construct itself, removing any ambiguity about evaluation
-- order. This is the only line changed relative to 20260812120000's version; the
-- organization-hard-delete guard from that migration is preserved unchanged below.

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

  target_action := case
    when tg_table_name = 'projects' and tg_op = 'INSERT' then 'project.created'
    when tg_table_name = 'projects' and tg_op = 'UPDATE' then 'project.updated'
    when tg_table_name = 'tasks' and tg_op = 'INSERT' then 'task.created'
    when tg_table_name = 'tasks' and tg_op = 'UPDATE' then 'task.updated'
    when tg_table_name = 'meetings' and tg_op = 'INSERT' then 'meeting.created'
    when tg_table_name = 'organizations' and tg_op = 'UPDATE' then 'organization.updated'
    -- Nested CASE (this migration's fix): old.role is only ever referenced once
    -- tg_table_name = 'users' is already independently true -- no reliance on AND
    -- short-circuit evaluation order for a record-typed field access. The inner ELSE
    -- reproduces exactly what the old flat-AND version's fallthrough to the outer `else`
    -- branch below would have produced for this same tg_table_name/tg_op combination
    -- (lower('users') || '.' || lower('UPDATE') = 'users.update') -- so a role-column
    -- UPDATE that doesn't actually change the value still audits identically to before;
    -- this migration changes nothing about behavior, only removes the crash.
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
