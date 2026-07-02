-- AXXESS by Triaxis - Sprint 2 Supabase preparation.
-- Draft migration only: the frontend is still using mock services.

create extension if not exists pgcrypto;

create type public.organization_sector as enum (
  'government',
  'enterprise',
  'healthcare',
  'ngo',
  'consulting',
  'other'
);

create type public.app_role as enum (
  'Super Admin',
  'Organization Admin',
  'Executive',
  'Manager',
  'Employee',
  'External Partner',
  'Consultant',
  'Guest'
);

create type public.work_status as enum (
  'planning',
  'active',
  'in-progress',
  'review',
  'at-risk',
  'completed',
  'archived'
);

create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.risk_level as enum ('low', 'medium', 'high', 'urgent');
create type public.notification_status as enum ('unread', 'read', 'archived');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sector public.organization_sector not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_initials text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  parent_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name public.app_role not null,
  description text,
  unique (organization_id, name)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  description text,
  unique (resource, action)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (organization_id, user_id, role_id)
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  status public.work_status not null default 'planning',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  name text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  risk_level public.risk_level not null default 'low',
  status public.work_status not null default 'planning',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles(id) on delete set null,
  priority public.task_priority not null default 'medium',
  status text not null default 'pending',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stakeholders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  affiliation text,
  role text,
  relationship_owner_id uuid references public.profiles(id) on delete set null,
  influence_score integer not null default 0 check (influence_score >= 0 and influence_score <= 100),
  engagement_level text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  storage_path text not null,
  mime_type text not null,
  classification text not null default 'internal',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  stakeholder_id uuid references public.stakeholders(id) on delete cascade,
  check (user_id is not null or stakeholder_id is not null)
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id uuid references public.meetings(id) on delete set null,
  title text not null,
  summary text not null,
  decided_by_id uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  severity public.risk_level not null default 'medium',
  likelihood text not null default 'medium',
  status text not null default 'open',
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  status public.notification_status not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on public.organization_members (user_id);
create index on public.user_roles (user_id, organization_id);
create index on public.programs (organization_id, status);
create index on public.projects (organization_id, program_id, status);
create index on public.tasks (organization_id, project_id, assignee_id, status);
create index on public.documents (organization_id, project_id);
create index on public.meetings (organization_id, starts_at);
create unique index meeting_attendees_unique_user on public.meeting_attendees (meeting_id, user_id) where user_id is not null;
create unique index meeting_attendees_unique_stakeholder on public.meeting_attendees (meeting_id, stakeholder_id) where stakeholder_id is not null;
create index on public.decisions (organization_id, decided_at);
create index on public.risks (organization_id, severity, status);
create index on public.notifications (organization_id, user_id, status);
create index on public.audit_logs (organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_programs_updated_at before update on public.programs for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_stakeholders_updated_at before update on public.stakeholders for each row execute function public.set_updated_at();
create trigger set_documents_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger set_meetings_updated_at before update on public.meetings for each row execute function public.set_updated_at();
create trigger set_risks_updated_at before update on public.risks for each row execute function public.set_updated_at();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.status = 'active'
  );
$$;

create or replace function public.has_any_role(target_organization_id uuid, allowed_roles public.app_role[])
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
    where user_role.organization_id = target_organization_id
      and user_role.user_id = auth.uid()
      and role.name = any(allowed_roles)
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

create policy organizations_member_select
  on public.organizations for select
  using (public.is_org_member(id));

create policy profiles_self_select
  on public.profiles for select
  using (id = auth.uid());

create policy profiles_self_update
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy organization_members_member_select
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy organization_members_admin_manage
  on public.organization_members for all
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

create policy roles_member_select
  on public.roles for select
  using (organization_id is null or public.is_org_member(organization_id));

create policy roles_admin_manage
  on public.roles for all
  using (organization_id is null or public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]))
  with check (organization_id is null or public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

create policy permissions_authenticated_select
  on public.permissions for select
  to authenticated
  using (true);

create policy role_permissions_member_select
  on public.role_permissions for select
  using (exists (
    select 1
    from public.roles role
    where role.id = role_permissions.role_id
      and (role.organization_id is null or public.is_org_member(role.organization_id))
  ));

create policy user_roles_member_select
  on public.user_roles for select
  using (public.is_org_member(organization_id));

create policy user_roles_admin_manage
  on public.user_roles for all
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'teams',
    'programs',
    'projects',
    'tasks',
    'stakeholders',
    'documents',
    'meetings',
    'decisions',
    'risks'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select using (public.is_org_member(organization_id))',
      table_name || '_member_select',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all using (public.has_any_role(organization_id, array[''Super Admin'', ''Organization Admin'', ''Executive'', ''Manager'']::public.app_role[])) with check (public.has_any_role(organization_id, array[''Super Admin'', ''Organization Admin'', ''Executive'', ''Manager'']::public.app_role[]))',
      table_name || '_manager_write',
      table_name
    );
  end loop;
end $$;

alter table public.meeting_attendees enable row level security;

create policy meeting_attendees_member_select
  on public.meeting_attendees for select
  using (exists (
    select 1
    from public.meetings meeting
    where meeting.id = meeting_attendees.meeting_id
      and public.is_org_member(meeting.organization_id)
  ));

create policy meeting_attendees_manager_write
  on public.meeting_attendees for all
  using (exists (
    select 1
    from public.meetings meeting
    where meeting.id = meeting_attendees.meeting_id
      and public.has_any_role(meeting.organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[])
  ))
  with check (exists (
    select 1
    from public.meetings meeting
    where meeting.id = meeting_attendees.meeting_id
      and public.has_any_role(meeting.organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[])
  ));

create policy notifications_owner_select
  on public.notifications for select
  using (user_id = auth.uid() and public.is_org_member(organization_id));

create policy notifications_owner_update
  on public.notifications for update
  using (user_id = auth.uid() and public.is_org_member(organization_id))
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

create policy audit_logs_admin_select
  on public.audit_logs for select
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

create policy audit_logs_system_insert
  on public.audit_logs for insert
  with check (public.is_org_member(organization_id));
