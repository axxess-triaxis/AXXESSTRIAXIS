-- Fix: organization hard-deletion fails deterministically (SQLSTATE 23503,
-- constraint audit_logs_organization_id_fkey) because record_enterprise_audit_log()'s
-- user_roles-DELETE branch unconditionally inserts a new audit_logs row referencing
-- the organization, but organizations.id -> user_roles.organization_id cascades user_roles
-- deletion as part of the SAME statement that deletes the organization itself -- by the
-- time this trigger fires, the parent organizations row is already gone, so the new
-- insert's FK check fails and the entire top-level delete rolls back atomically.
--
-- Root cause, full investigation, and design rationale:
-- docs/readiness/ORGANIZATION_HARD_DELETE_TRIGGER_FIX_2026_08_12.md
--
-- Fix mirrors the exact defensive pattern record_permission_audit_log() (defined
-- immediately below this function in the same original migration,
-- 20260703025318_sprint6_server_auth_repositories.sql) already uses for the structurally
-- identical role_permissions-DELETE case: check whether the referenced parent row still
-- exists before attempting the insert; if not, skip the audit write instead of crashing.
-- This is the smallest change that preserves every other branch of this shared function
-- (organizations UPDATE, users role UPDATE, projects/tasks/meetings/documents/
-- knowledge_articles/document_permissions INSERT/UPDATE, and user_roles INSERT/UPDATE)
-- byte-for-byte, and preserves ordinary (non-cascade) user_roles DELETE auditing exactly
-- as before -- the guard only skips the write when the organization itself no longer
-- exists, which is only possible when this DELETE is a direct consequence of that same
-- organization being deleted in the same statement.

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
      -- Cascade-from-organization-delete guard: if the organization this row belonged to
      -- no longer exists, this DELETE is a direct consequence of that organization being
      -- deleted in the same statement -- there is nothing valid left to attribute this
      -- audit event to, and attempting the insert below would fail every time with
      -- SQLSTATE 23503 (audit_logs_organization_id_fkey), rolling back the entire
      -- organization delete. Skip the audit write in this one case only; every other
      -- user_roles DELETE (role revoked, user removed, while the organization itself
      -- remains live) is unaffected and continues to be audited exactly as before.
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
