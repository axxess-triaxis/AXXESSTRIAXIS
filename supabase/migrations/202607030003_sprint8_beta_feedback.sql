-- AXXESS by Triaxis - Sprint 8 beta analytics and feedback readiness.
-- Adds privacy-conscious beta feedback storage with explicit Data API grants
-- and RLS policies for tenant-scoped owner/admin access.

create extension if not exists pgcrypto;

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('Bug', 'Feature Request', 'Confusing Workflow', 'General Feedback')),
  module text not null,
  rating integer not null check (rating between 1 and 5),
  message text not null,
  permission_to_contact boolean not null default false,
  status text not null default 'new' check (status in ('new', 'triaged', 'in-review', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists beta_feedback_org_created_idx on public.beta_feedback (organization_id, created_at desc);
create index if not exists beta_feedback_user_created_idx on public.beta_feedback (organization_id, user_id, created_at desc);
create index if not exists beta_feedback_status_idx on public.beta_feedback (organization_id, status, created_at desc);

alter table public.beta_feedback enable row level security;

drop policy if exists beta_feedback_owner_or_admin_select on public.beta_feedback;
drop policy if exists beta_feedback_member_insert on public.beta_feedback;
drop policy if exists beta_feedback_admin_update on public.beta_feedback;

create policy beta_feedback_owner_or_admin_select
  on public.beta_feedback for select
  to authenticated
  using (
    (user_id = (select auth.uid()) and public.is_org_member(organization_id))
    or public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[])
  );

create policy beta_feedback_member_insert
  on public.beta_feedback for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

create policy beta_feedback_admin_update
  on public.beta_feedback for update
  to authenticated
  using (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]))
  with check (public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[]));

grant usage on schema public to authenticated;
grant select, insert, update on public.beta_feedback to authenticated;

comment on table public.beta_feedback is 'Controlled beta user feedback. Feedback messages stay in Supabase and must not be sent to product analytics providers.';
comment on column public.beta_feedback.metadata is 'Safe operational metadata only, such as route and release version; never store analytics secrets here.';
