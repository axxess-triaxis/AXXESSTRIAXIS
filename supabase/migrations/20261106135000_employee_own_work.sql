-- Employees see their own work, by founder decision on 2026-11-06, see
-- docs/readiness/API_ROLE_CHECKS_CLOSEOUT_2026_11_06.md. Senior roles keep everything.
--
-- tasks_sprint5_employee_write has to go as well as the read policy. It is "for all", so it also grants
-- select, update and delete on every task, and Postgres combines permissive policies with OR.
--
-- Also fixes the meeting rule from 20261106130000_api_role_checks.sql for every role. The app saves
-- participants in meetings.attendee_ids, so reading only meeting_attendees missed them.
--
-- No data changes.

create or replace function public.holds_task_in_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tasks task
    where task.project_id = target_project_id
      and (task.assignee_id = (select auth.uid()) or task.created_by_user_id = (select auth.uid()))
  );
$$;

-- ---------------------------------------------------------------------------------------------------
-- Tasks. Consultant and Guest stay assigned only, and cannot write.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists tasks_sprint5_employee_write on public.tasks;
drop policy if exists tasks_role_select on public.tasks;

create policy tasks_role_select on public.tasks for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_org_member(organization_id)
      and (
        assignee_id = (select auth.uid())
        or (public.is_staff_member(organization_id) and created_by_user_id = (select auth.uid()))
      )
    )
  );

create policy tasks_staff_insert on public.tasks for insert to authenticated
  with check (public.is_staff_member(organization_id));

create policy tasks_own_update on public.tasks for update to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_staff_member(organization_id)
      and (assignee_id = (select auth.uid()) or created_by_user_id = (select auth.uid()))
    )
  )
  with check (public.is_staff_member(organization_id));

create policy tasks_own_delete on public.tasks for delete to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_staff_member(organization_id)
      and (assignee_id = (select auth.uid()) or created_by_user_id = (select auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------------------------------
-- Projects and meetings. Every role below senior follows the same rule. Writes are unchanged.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists projects_role_select on public.projects;
create policy projects_role_select on public.projects for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_org_member(organization_id)
      and (
        owner_id = (select auth.uid())
        or created_by_user_id = (select auth.uid())
        or public.holds_task_in_project(id)
      )
    )
  );

drop policy if exists meetings_role_select on public.meetings;
create policy meetings_role_select on public.meetings for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (
      public.is_org_member(organization_id)
      and (
        created_by_user_id = (select auth.uid())
        or (select auth.uid()) = any(attendee_ids)
        or public.is_meeting_attendee(id)
      )
    )
  );

-- ---------------------------------------------------------------------------------------------------
-- Workflow timeline. Titles and descriptions name other people's work, so an Employee reads only events
-- they performed. The route repeats this, because it reads with the service role.
-- ---------------------------------------------------------------------------------------------------
drop policy if exists workflow_timeline_events_role_select on public.workflow_timeline_events;
create policy workflow_timeline_events_role_select on public.workflow_timeline_events for select to authenticated
  using (
    public.is_senior_member(organization_id)
    or (public.is_staff_member(organization_id) and actor_user_id = (select auth.uid()))
  );
