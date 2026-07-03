-- AXXESS by Triaxis - Sprint 5 production SaaS foundation.
-- Adds auth-linked users, exact Sprint 5 role checks, resource ownership columns,
-- and RLS policies for the first production tables.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_initials text not null default 'AU',
  role public.app_role not null default 'Employee',
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_sprint5_role_check check (
    role in ('Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee', 'Guest')
  )
);

alter table public.projects
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists owner_role public.app_role not null default 'Manager';

alter table public.tasks
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists owner_role public.app_role not null default 'Employee';

alter table public.programs
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists owner_role public.app_role not null default 'Executive';

alter table public.meetings
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists owner_role public.app_role not null default 'Manager';

alter table public.notifications
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists owner_role public.app_role not null default 'Employee';

alter table public.audit_logs
  add column if not exists actor_role public.app_role;

create index if not exists users_organization_role_idx on public.users (organization_id, role, status);
create index if not exists projects_organization_owner_idx on public.projects (organization_id, owner_id, owner_role);
create index if not exists tasks_organization_assignee_idx on public.tasks (organization_id, assignee_id, owner_role);
create index if not exists programs_organization_owner_idx on public.programs (organization_id, owner_id, owner_role);
create index if not exists meetings_organization_created_by_idx on public.meetings (organization_id, created_by_user_id, starts_at);
create index if not exists notifications_user_unread_idx on public.notifications (organization_id, user_id, read_at);
create index if not exists audit_logs_actor_idx on public.audit_logs (organization_id, actor_user_id, created_at desc);

create trigger set_users_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.programs enable row level security;
alter table public.meetings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy users_sprint5_self_or_admin_select
  on public.users for select
  using (
    id = auth.uid()
    or public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[])
  );

create policy users_sprint5_admin_write
  on public.users for all
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

create policy organizations_sprint5_admin_write
  on public.organizations for all
  using (public.has_any_role(id, array['Super Admin', 'Organization Admin']::public.app_role[]))
  with check (public.has_any_role(id, array['Super Admin', 'Organization Admin']::public.app_role[]));

create policy projects_sprint5_member_select
  on public.projects for select
  using (public.is_org_member(organization_id));

create policy projects_sprint5_manager_write
  on public.projects for all
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

create policy tasks_sprint5_member_select
  on public.tasks for select
  using (public.is_org_member(organization_id));

create policy tasks_sprint5_employee_write
  on public.tasks for all
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[]));

create policy programs_sprint5_member_select
  on public.programs for select
  using (public.is_org_member(organization_id));

create policy programs_sprint5_manager_write
  on public.programs for all
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

create policy meetings_sprint5_member_select
  on public.meetings for select
  using (public.is_org_member(organization_id));

create policy meetings_sprint5_manager_write
  on public.meetings for all
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager']::public.app_role[]));

create policy notifications_sprint5_owner_select
  on public.notifications for select
  using (user_id = auth.uid() and public.is_org_member(organization_id));

create policy notifications_sprint5_owner_update
  on public.notifications for update
  using (user_id = auth.uid() and public.is_org_member(organization_id))
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

create policy audit_logs_sprint5_admin_select
  on public.audit_logs for select
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

create policy audit_logs_sprint5_member_insert
  on public.audit_logs for insert
  with check (public.is_org_member(organization_id));
