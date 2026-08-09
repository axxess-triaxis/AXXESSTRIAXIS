-- A-103 (2026-08-09): a real, dedicated Reminder type inside Tasks & Workflow. Previously a
-- Reminder created from an AI answer silently became a Task tagged "reminder" -- see
-- AGENTIC_ROUTE_CAVEAT.reminder (now removed) in src/components/agentic/agenticActionTypes.ts.
-- Role set and RLS function names (is_org_member, has_any_role) mirror tasks' own live policies
-- exactly (supabase/migrations/20260702165820_sprint5_auth_multi_tenant_core.sql), matching
-- TasksSection.tsx's own canManageTasks role check.

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  remind_at timestamptz not null,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  linked_entity_type text check (linked_entity_type in ('task', 'project', 'stakeholder')),
  linked_entity_id uuid,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_org_status_remind_at_idx on public.reminders (organization_id, status, remind_at);
create index if not exists reminders_org_owner_idx on public.reminders (organization_id, owner_id) where owner_id is not null;

drop trigger if exists set_reminders_updated_at on public.reminders;
create trigger set_reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

alter table public.reminders enable row level security;

create policy reminders_member_select on public.reminders for select to authenticated
  using (public.is_org_member(organization_id));

create policy reminders_employee_write on public.reminders for all to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager', 'Employee']::public.app_role[]));

grant select, insert, update on public.reminders to authenticated;
