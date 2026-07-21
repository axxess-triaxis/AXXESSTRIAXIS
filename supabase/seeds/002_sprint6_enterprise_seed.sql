-- AXXESS Sprint 6 local seed notes.
-- Auth users must be created through Supabase Auth before user/profile rows
-- can be linked safely. This seed only creates tenant-owned business records.

begin;

insert into public.organizations (id, tenant_id, name, slug, sector)
values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Triaxis Ventures', 'triaxis-ventures', 'enterprise')
on conflict (id) do nothing;

insert into public.programs (id, organization_id, tenant_id, name, owner_id, status)
values
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Enterprise SaaS Readiness', null, 'active')
on conflict (id) do nothing;

insert into public.projects (id, organization_id, tenant_id, program_id, name, owner_id, progress, risk_level, status, due_date)
values
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000302', 'Supabase Production Data Layer', null, 60, 'medium', 'in-progress', '2026-08-15')
on conflict (id) do nothing;

insert into public.tasks (id, organization_id, tenant_id, project_id, title, assignee_id, priority, status, due_date)
values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000403', 'Validate RLS policy matrix', null, 'high', 'pending', '2026-07-15')
on conflict (id) do nothing;

commit;
