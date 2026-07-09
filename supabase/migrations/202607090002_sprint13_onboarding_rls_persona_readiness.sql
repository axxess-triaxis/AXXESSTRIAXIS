-- AXXESS by Triaxis - Sprint 13 onboarding, workspace, and RLS persona readiness.
-- This migration normalizes tenant/workspace metadata and adds helper functions used by staging RLS tests.

create extension if not exists pgcrypto;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select app_user.organization_id
  from public.users app_user
  where app_user.id = auth.uid()
    and app_user.status = 'active'
  limit 1;
$$;

create or replace function public.has_tenant_role(target_tenant_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.organization_id = target_tenant_id
      and user_role.user_id = auth.uid()
      and role.name::text = any(allowed_roles)
  )
  or exists (
    select 1
    from public.users app_user
    where app_user.organization_id = target_tenant_id
      and app_user.id = auth.uid()
      and app_user.status = 'active'
      and app_user.role::text = any(allowed_roles)
  );
$$;

create or replace function public.has_workspace_access(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = auth.uid()
      and member.status = 'active'
  )
  or exists (
    select 1
    from public.workspaces workspace
    where workspace.id = target_workspace_id
      and public.has_tenant_role(workspace.organization_id, array['Super Admin', 'Organization Admin', 'Department Admin', 'Executive', 'Manager'])
  );
$$;

create or replace function public.can_approve_prompt(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select public.has_tenant_role(target_organization_id, array['Super Admin', 'Organization Admin', 'Department Admin', 'Executive', 'Manager']);
$$;

create or replace function public.can_access_document(target_document_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.documents document
    where document.id = target_document_id
      and document.organization_id = public.current_tenant_id()
      and coalesce(document.status, 'active') <> 'deleted'
      and (
        public.has_tenant_role(document.organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
        or document.owner_user_id = auth.uid()
        or document.created_by_user_id = auth.uid()
        or coalesce(document.visibility, 'organization') = 'organization'
        or exists (
          select 1
          from public.document_permissions permission
          where permission.document_id = document.id
            and permission.organization_id = document.organization_id
            and (permission.expires_at is null or permission.expires_at > now())
            and (
              (permission.principal_type = 'user' and permission.principal_id = auth.uid())
              or (permission.principal_type = 'organization' and public.is_org_member(document.organization_id))
            )
        )
      )
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'programs',
    'projects',
    'tasks',
    'meetings',
    'stakeholders',
    'documents',
    'notifications',
    'audit_logs',
    'beta_feedback',
    'knowledge_articles'
  ]
  loop
    if exists (
      select 1
      from information_schema.tables existing_table
      where existing_table.table_schema = 'public'
        and existing_table.table_name = table_name
    ) then
      execute format('alter table public.%I add column if not exists tenant_id uuid', table_name);
      execute format('update public.%I set tenant_id = organization_id where tenant_id is null', table_name);
      execute format('alter table public.%I alter column tenant_id set not null', table_name);
      execute format('alter table public.%I add column if not exists workspace_id uuid references public.workspaces(id) on delete set null', table_name);
      execute format('alter table public.%I add column if not exists department_id uuid references public.departments(id) on delete set null', table_name);
      execute format('alter table public.%I add column if not exists updated_by uuid references public.users(id) on delete set null', table_name);
      execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
      execute format('create index if not exists %I on public.%I (tenant_id, organization_id)', table_name || '_sprint13_tenant_idx', table_name);
      execute format('create index if not exists %I on public.%I (organization_id, workspace_id)', table_name || '_sprint13_workspace_idx', table_name);
      execute format('create index if not exists %I on public.%I (organization_id, department_id)', table_name || '_sprint13_department_idx', table_name);
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

alter table public.prompt_versions
  add column if not exists review_status text not null default 'draft' check (review_status in ('draft', 'pending_review', 'approved', 'rejected', 'retired')),
  add column if not exists rejected_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text;

alter table public.ai_output_audit
  add column if not exists human_review_status text not null default 'not_required' check (human_review_status in ('not_required', 'pending_review', 'approved', 'rejected')),
  add column if not exists finalization_status text not null default 'draft' check (finalization_status in ('draft', 'finalized', 'blocked')),
  add column if not exists audit_log_id uuid references public.audit_logs(id) on delete set null;

drop policy if exists prompt_versions_sprint13_approve on public.prompt_versions;
create policy prompt_versions_sprint13_approve
  on public.prompt_versions for update
  to authenticated
  using (public.can_approve_prompt(organization_id))
  with check (public.can_approve_prompt(organization_id));

drop policy if exists ai_output_audit_sprint13_review on public.ai_output_audit;
create policy ai_output_audit_sprint13_review
  on public.ai_output_audit for update
  to authenticated
  using (public.can_approve_prompt(organization_id))
  with check (public.can_approve_prompt(organization_id));

revoke all on function public.current_tenant_id() from public;
revoke all on function public.has_tenant_role(uuid, text[]) from public;
revoke all on function public.has_workspace_access(uuid) from public;
revoke all on function public.can_approve_prompt(uuid) from public;
revoke all on function public.can_access_document(uuid) from public;

grant execute on function public.current_user_id() to authenticated;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.has_tenant_role(uuid, text[]) to authenticated;
grant execute on function public.has_workspace_access(uuid) to authenticated;
grant execute on function public.can_approve_prompt(uuid) to authenticated;
grant execute on function public.can_access_document(uuid) to authenticated;

comment on function public.current_tenant_id() is 'Returns the active organization_id for the authenticated AXXESS user.';
comment on function public.has_workspace_access(uuid) is 'Checks explicit workspace membership or elevated tenant role access.';
comment on function public.can_approve_prompt(uuid) is 'Checks whether the authenticated user can approve governed AI prompt and output records.';
comment on function public.can_access_document(uuid) is 'Tenant-aware document access helper for RLS and RAG staging tests.';
