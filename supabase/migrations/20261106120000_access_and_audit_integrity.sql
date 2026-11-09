-- Access and audit integrity. Fixes audit findings L1, L2, M10, L16, L17, M20 and M7 at the database
-- level. Findings and evidence: docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md
--
-- Before this migration:
--   * The API read public.users.role, RLS read user_roles (has_any_role). A role PATCH changed only
--     the first, so a demoted user kept their old RLS role (L2, M10).
--   * public.users.status never reached organization_members.status or user_roles, so a suspended
--     user passed is_org_member and has_any_role (L1).
--   * Any Organization Admin could grant Super Admin (L16).
--   * audit_logs allowed direct inserts by any member with any actor (L17), and the app's insert asked
--     for the row back, which RLS refused to non-admins, so their audit writes failed silently (M20, M7).
--
-- users is the single source of truth from here on. Direct user_roles writes remain possible for
-- admins, subject to the Super Admin guard below.
--
-- THE BACKFILL BELOW CHANGES LIVE ACCESS for any user whose stores have drifted. Run the dry-run query
-- in docs/readiness/ACCESS_AND_AUDIT_INTEGRITY_CLOSEOUT_2026_11_06.md before applying this to a real project.

-- ---------------------------------------------------------------------------------------------------
-- 1. Audit trigger functions must keep working once members can no longer insert into audit_logs.
--    auth.uid() still reads the caller's JWT inside a security definer function, so attribution holds.
-- ---------------------------------------------------------------------------------------------------
alter function public.record_enterprise_audit_log() security definer;
alter function public.record_permission_audit_log() security definer;

-- ---------------------------------------------------------------------------------------------------
-- 2. Sync users -> user_roles and organization_members (L1, L2, M10)
-- ---------------------------------------------------------------------------------------------------
create or replace function public.sync_user_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role_id uuid;
begin
  if new.organization_id is null then
    return new;
  end if;

  if new.status = 'suspended' then
    update public.organization_members
      set status = 'suspended'
      where organization_id = new.organization_id and user_id = new.id and status <> 'suspended';
    delete from public.user_roles
      where organization_id = new.organization_id and user_id = new.id;
    return new;
  end if;

  update public.organization_members
    set status = 'active'
    where organization_id = new.organization_id and user_id = new.id and status = 'suspended';

  -- An invited user has not accepted yet, so holds no RLS role until the accept route activates them.
  if new.status <> 'active' then
    return new;
  end if;

  select role.id into target_role_id
    from public.roles role
    where role.organization_id = new.organization_id and role.name = new.role
    limit 1;

  if target_role_id is null then
    insert into public.roles (organization_id, name, description)
      values (new.organization_id, new.role, new.role::text || ' role')
      on conflict (organization_id, name) do update set name = excluded.name
      returning id into target_role_id;
  end if;

  delete from public.user_roles
    where organization_id = new.organization_id and user_id = new.id and role_id <> target_role_id;

  insert into public.user_roles (organization_id, user_id, role_id)
    values (new.organization_id, new.id, target_role_id)
    on conflict (organization_id, user_id, role_id) do nothing;

  return new;
end;
$$;

drop trigger if exists sync_user_access_on_change on public.users;
create trigger sync_user_access_on_change
  after insert or update of role, status, organization_id on public.users
  for each row execute function public.sync_user_access();

-- Backfill: bring every existing user into line, with users as the source of truth.
insert into public.roles (organization_id, name, description)
  select distinct app_user.organization_id, app_user.role, app_user.role::text || ' role'
  from public.users app_user
  where app_user.organization_id is not null
  on conflict (organization_id, name) do nothing;

delete from public.user_roles user_role
  using public.users app_user
  where user_role.user_id = app_user.id
    and user_role.organization_id = app_user.organization_id
    and (
      app_user.status = 'suspended'
      or not exists (
        select 1 from public.roles role
        where role.id = user_role.role_id and role.name = app_user.role
      )
    );

insert into public.user_roles (organization_id, user_id, role_id)
  select app_user.organization_id, app_user.id, role.id
  from public.users app_user
  join public.roles role on role.organization_id = app_user.organization_id and role.name = app_user.role
  where app_user.status = 'active'
  on conflict (organization_id, user_id, role_id) do nothing;

update public.organization_members member
  set status = 'suspended'
  from public.users app_user
  where member.user_id = app_user.id
    and member.organization_id = app_user.organization_id
    and app_user.status = 'suspended'
    and member.status <> 'suspended';

-- ---------------------------------------------------------------------------------------------------
-- 3. Only a Super Admin can grant, invite, change or remove Super Admin (L16)
--    auth.uid() is null for the service role and for SQL run without a JWT (provisioning, seeds, tenant
--    switch), which stay allowed. Depth above 1 is a write made by another trigger or a cascade.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.caller_may_manage_super_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is null
    or pg_trigger_depth() > 1
    or public.has_any_role(target_organization_id, array['Super Admin']::public.app_role[]);
$$;

create or replace function public.guard_super_admin_on_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.caller_may_manage_super_admin(new.organization_id) then
    return new;
  end if;

  if new.role = 'Super Admin' and (tg_op = 'INSERT' or old.role <> 'Super Admin') then
    raise exception 'Only a Super Admin can grant the Super Admin role.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and old.role = 'Super Admin'
    and (new.role <> old.role or new.status <> old.status) then
    raise exception 'Only a Super Admin can change a Super Admin.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_super_admin_on_users on public.users;
create trigger guard_super_admin_on_users
  before insert or update of role, status on public.users
  for each row execute function public.guard_super_admin_on_users();

create or replace function public.guard_super_admin_on_user_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid := coalesce(new.organization_id, old.organization_id);
begin
  if not public.caller_may_manage_super_admin(target_organization_id)
    and exists (
      select 1 from public.roles role
      where role.id in (new.role_id, old.role_id) and role.name = 'Super Admin'
    ) then
    raise exception 'Only a Super Admin can grant or remove the Super Admin role.' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_super_admin_on_user_roles on public.user_roles;
create trigger guard_super_admin_on_user_roles
  before insert or update or delete on public.user_roles
  for each row execute function public.guard_super_admin_on_user_roles();

create or replace function public.guard_super_admin_on_invitations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'Super Admin' and not public.caller_may_manage_super_admin(new.organization_id) then
    raise exception 'Only a Super Admin can invite a Super Admin.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_super_admin_on_invitations on public.invitations;
create trigger guard_super_admin_on_invitations
  before insert or update of role on public.invitations
  for each row execute function public.guard_super_admin_on_invitations();

-- has_any_role matches on roles.name, so renaming a role is the same as granting it.
create or replace function public.guard_super_admin_on_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid := coalesce(new.organization_id, old.organization_id);
begin
  if (new.name = 'Super Admin' or old.name = 'Super Admin')
    and (tg_op <> 'UPDATE' or new.name is distinct from old.name)
    and not public.caller_may_manage_super_admin(target_organization_id) then
    raise exception 'Only a Super Admin can create, rename or remove the Super Admin role.' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_super_admin_on_roles on public.roles;
create trigger guard_super_admin_on_roles
  before insert or update or delete on public.roles
  for each row execute function public.guard_super_admin_on_roles();

-- The original policy passed for any caller when organization_id is null, which let any signed-in
-- user write platform-wide role rows. Those are managed with the service role only.
drop policy if exists roles_admin_manage on public.roles;
create policy roles_admin_manage
  on public.roles for all
  using (
    organization_id is not null
    and public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[])
  )
  with check (
    organization_id is not null
    and public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[])
  );

-- ---------------------------------------------------------------------------------------------------
-- 4. One way to write an audit row (L17, M20, M7)
--    The actor always comes from the token. Service-role inserts are unaffected.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.record_audit_event(
  p_organization_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_category text default null,
  p_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns setof public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_app_role public.app_role;
begin
  if actor_id is null or not public.is_org_member(p_organization_id) then
    raise exception 'Not a member of this organization.' using errcode = '42501';
  end if;

  -- Admin events are written only by admins, so a member cannot add a believable entry of that kind
  -- even under their own name.
  if (
    p_action like 'role.%'
    or p_action like 'permission.%'
    or p_action like 'agent_connection.%'
    or p_action like 'agent_profile.%'
    or p_action in ('user.access_updated', 'user.invited', 'invitation.revoked')
  ) and not public.has_any_role(p_organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]) then
    raise exception 'This audit action is reserved for admins.' using errcode = '42501';
  end if;

  select app_user.role into actor_app_role
    from public.users app_user
    where app_user.id = actor_id and app_user.organization_id = p_organization_id
    limit 1;

  return query
    insert into public.audit_logs (
      organization_id, tenant_id, actor_user_id, actor_role, action,
      resource_type, resource_id, category, request_id, metadata
    )
    values (
      p_organization_id, p_organization_id, actor_id, actor_app_role, p_action,
      p_resource_type, p_resource_id, p_category, p_request_id, coalesce(p_metadata, '{}'::jsonb)
    )
    returning *;
end;
$$;

revoke all on function public.record_audit_event(uuid, text, text, uuid, text, text, jsonb) from public, anon;
grant execute on function public.record_audit_event(uuid, text, text, uuid, text, text, jsonb) to authenticated;

drop policy if exists audit_logs_member_insert on public.audit_logs;
