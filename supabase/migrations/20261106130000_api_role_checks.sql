-- API role checks (audit findings L3, L6, L8, L9, L10, L13, L18).
--
-- Outside roles were shown "Access restricted" on pages, while direct calls returned the data. These
-- policies hold the same rules as capabilityPermissions in src/security/rbac.ts, because routes on the
-- service role skip RLS and direct /rest/v1 calls skip the routes. Change both together.
--
-- Depends on 20261106120000_access_and_audit_integrity.sql, which keeps user_roles in step with users.
-- has_any_role is what these policies read, so without that sync a role change would not reach them.
--
-- No data changes. tasks, projects and meetings each had two permissive select policies, and both must
-- go: Postgres combines permissive policies with OR, so one left behind keeps the whole table open.

-- ---------------------------------------------------------------------------------------------------
-- Helpers. These are security definer because meeting_attendees' own policy reads meetings, and a
-- meetings policy reading meeting_attendees directly would recurse.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.is_staff_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(
    target_organization_id,
    array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[]
  );
$$;

create or replace function public.is_senior_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(
    target_organization_id,
    array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]
  );
$$;

create or replace function public.holds_task_in_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tasks task
    where task.project_id = target_project_id and task.assignee_id = (select auth.uid())
  );
$$;

create or replace function public.is_meeting_attendee(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.meeting_attendees attendee
    where attendee.meeting_id = target_meeting_id and attendee.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_staff_member(uuid) from public, anon;
revoke all on function public.is_senior_member(uuid) from public, anon;
revoke all on function public.holds_task_in_project(uuid) from public, anon;
revoke all on function public.is_meeting_attendee(uuid) from public, anon;
grant execute on function public.is_staff_member(uuid) to authenticated, service_role;
grant execute on function public.is_senior_member(uuid) to authenticated, service_role;
grant execute on function public.holds_task_in_project(uuid) to authenticated, service_role;
grant execute on function public.is_meeting_attendee(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- CRM leads (L3, L13, L18). An Employee sees and creates only their own. Consultant and Guest get nothing.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists crm_leads_member_select on public.crm_leads;
create policy crm_leads_role_select on public.crm_leads for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_staff_member(organization_id)
      and (owner_user_id = (select auth.uid()) or created_by = (select auth.uid()))
    )
  );

drop policy if exists crm_leads_member_insert on public.crm_leads;
create policy crm_leads_role_insert on public.crm_leads for insert to authenticated
  with check (
    public.is_senior_member(organization_id)
    or (
      public.is_staff_member(organization_id)
      and created_by = (select auth.uid())
      and owner_user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------------------------------
-- Financial watch (L6). Manager is included for the finance head, because there is no finance role yet.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists financial_watch_items_member_select on public.financial_watch_items;
create policy financial_watch_items_role_select on public.financial_watch_items for select to authenticated
  using (public.is_senior_member(organization_id));

drop policy if exists financial_watch_items_member_insert on public.financial_watch_items;
create policy financial_watch_items_role_insert on public.financial_watch_items for insert to authenticated
  with check (
    public.is_senior_member(organization_id)
    and (
      created_by is null
      or created_by = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    )
  );

-- ---------------------------------------------------------------------------------------------------
-- Stakeholders, notes and the workflow timeline (L8, L9)
-- ---------------------------------------------------------------------------------------------------
drop policy if exists stakeholders_member_select on public.stakeholders;
create policy stakeholders_role_select on public.stakeholders for select to authenticated
  using (public.is_staff_member(organization_id));

drop policy if exists stakeholder_notes_member_select on public.stakeholder_notes;
create policy stakeholder_notes_role_select on public.stakeholder_notes for select to authenticated
  using (public.is_staff_member(organization_id));

drop policy if exists stakeholder_notes_member_insert on public.stakeholder_notes;
create policy stakeholder_notes_role_insert on public.stakeholder_notes for insert to authenticated
  with check (
    public.is_staff_member(organization_id)
    and (
      created_by_user_id is null
      or created_by_user_id = (select auth.uid())
      or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    )
  );

drop policy if exists workflow_timeline_events_member_select on public.workflow_timeline_events;
create policy workflow_timeline_events_role_select on public.workflow_timeline_events for select to authenticated
  using (public.is_staff_member(organization_id));

-- ---------------------------------------------------------------------------------------------------
-- Tasks, projects and meetings (L9). Staff see the tenant, unchanged. Outside roles see what is theirs.
-- is_org_member stays in the outside-role branch, so suspending a user still removes all of it.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists tasks_member_select on public.tasks;
drop policy if exists tasks_sprint5_member_select on public.tasks;
create policy tasks_role_select on public.tasks for select to authenticated
  using (
    public.is_staff_member(organization_id)
    or (public.is_org_member(organization_id) and assignee_id = (select auth.uid()))
  );

drop policy if exists projects_member_select on public.projects;
drop policy if exists projects_sprint5_member_select on public.projects;
create policy projects_role_select on public.projects for select to authenticated
  using (
    public.is_staff_member(organization_id)
    or (
      public.is_org_member(organization_id)
      and (
        owner_id = (select auth.uid())
        or created_by_user_id = (select auth.uid())
        or public.holds_task_in_project(id)
      )
    )
  );

drop policy if exists meetings_member_select on public.meetings;
drop policy if exists meetings_sprint5_member_select on public.meetings;
create policy meetings_role_select on public.meetings for select to authenticated
  using (
    public.is_staff_member(organization_id)
    or (
      public.is_org_member(organization_id)
      and (created_by_user_id = (select auth.uid()) or public.is_meeting_attendee(id))
    )
  );

-- ---------------------------------------------------------------------------------------------------
-- Documents (L10). The same policy as documents_sprint9_select, without Consultant in the
-- organization-visibility clause. Consultants keep what they own or what is shared with them.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists documents_sprint9_select on public.documents;
create policy documents_sprint9_select
  on public.documents for select
  to authenticated
  using (
    public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[])
    or (
      public.is_org_member(organization_id)
      and (
        owner_user_id = (select auth.uid())
        or created_by_user_id = (select auth.uid())
        or (
          visibility in ('organization', 'team', 'department')
          and public.has_any_role(organization_id, array['Executive', 'Manager', 'Employee']::public.app_role[])
        )
        or (
          visibility = 'shared'
          and exists (
            select 1
            from public.document_permissions permission
            where permission.document_id = documents.id
              and permission.organization_id = documents.organization_id
              and (permission.expires_at is null or permission.expires_at > now())
              and (
                (permission.principal_type = 'user' and permission.principal_id = (select auth.uid()))
                or (permission.principal_type = 'organization' and public.is_org_member(documents.organization_id))
                or (
                  permission.principal_type = 'role'
                  and exists (
                    select 1
                    from public.user_roles user_role
                    where user_role.organization_id = documents.organization_id
                      and user_role.user_id = (select auth.uid())
                      and user_role.role_id = permission.principal_id
                  )
                )
              )
          )
        )
      )
    )
  );
