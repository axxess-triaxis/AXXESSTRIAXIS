-- AXXESS by Triaxis - Sprint 7 real CRUD workflows and E2E readiness.
-- Adds operational form fields, notification metadata, write policies, and
-- indexed tenant filters for project/task/meeting workflows.

create extension if not exists pgcrypto;

alter table public.projects
  add column if not exists description text,
  add column if not exists priority public.task_priority not null default 'medium',
  add column if not exists start_date date,
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.tasks
  add column if not exists program_id uuid references public.programs(id) on delete set null,
  add column if not exists description text,
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.meetings
  add column if not exists program_id uuid references public.programs(id) on delete set null,
  add column if not exists stakeholder_id uuid references public.stakeholders(id) on delete set null,
  add column if not exists attendee_ids uuid[] not null default '{}'::uuid[],
  add column if not exists agenda text,
  add column if not exists notes text,
  add column if not exists decisions text[] not null default '{}'::text[],
  add column if not exists action_items text[] not null default '{}'::text[];

alter table public.notifications
  add column if not exists type text not null default 'system',
  add column if not exists resource_type text,
  add column if not exists resource_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_sprint7_status_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_sprint7_status_check
      check (status in ('pending', 'in-progress', 'blocked', 'completed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'meetings_sprint7_status_check'
      and conrelid = 'public.meetings'::regclass
  ) then
    alter table public.meetings
      add constraint meetings_sprint7_status_check
      check (status in ('scheduled', 'completed', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_sprint7_type_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_sprint7_type_check
      check (type in ('system', 'project', 'task', 'meeting', 'admin'));
  end if;
end $$;

create index if not exists projects_sprint7_owner_status_idx on public.projects (organization_id, owner_id, status);
create index if not exists projects_sprint7_due_idx on public.projects (organization_id, due_date) where due_date is not null;
create index if not exists tasks_sprint7_program_idx on public.tasks (organization_id, program_id) where program_id is not null;
create index if not exists tasks_sprint7_due_priority_idx on public.tasks (organization_id, due_date, priority) where due_date is not null;
create index if not exists meetings_sprint7_project_idx on public.meetings (organization_id, project_id) where project_id is not null;
create index if not exists meetings_sprint7_program_idx on public.meetings (organization_id, program_id) where program_id is not null;
create index if not exists notifications_sprint7_type_idx on public.notifications (organization_id, user_id, type, created_at desc);
create index if not exists notifications_sprint7_resource_idx on public.notifications (organization_id, resource_type, resource_id) where resource_id is not null;
create index if not exists users_sprint7_org_status_role_idx on public.users (organization_id, status, role);

drop trigger if exists audit_meetings_changes on public.meetings;
create trigger audit_meetings_changes
  after insert or update on public.meetings
  for each row execute function public.record_enterprise_audit_log();

drop policy if exists notifications_sprint7_member_insert on public.notifications;
create policy notifications_sprint7_member_insert
  on public.notifications for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists users_sprint7_leadership_select on public.users;
create policy users_sprint7_leadership_select
  on public.users for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[])
  );

grant select, insert, update on
  public.projects,
  public.tasks,
  public.meetings,
  public.notifications,
  public.users
to authenticated;

comment on column public.projects.description is 'Sprint 7 editable project description shown in project details.';
comment on column public.projects.priority is 'Operational priority used by project workflow forms.';
comment on column public.tasks.program_id is 'Optional program link for task workflow filtering.';
comment on column public.meetings.attendee_ids is 'Cached user participant ids for API-friendly meeting forms; meeting_attendees remains the normalized attendee table.';
comment on column public.notifications.type is 'Notification workflow type used by filters and E2E assertions.';
