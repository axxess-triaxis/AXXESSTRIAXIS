-- AXXESS local seed architecture.
-- This file is intentionally not wired to production.
-- Auth users must be created by Supabase Auth local seeding before profile rows
-- can satisfy their auth.users foreign keys.

begin;

insert into public.organizations (id, tenant_id, name, slug, sector)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Public Safety Canada', 'public-safety-canada', 'government')
on conflict (id) do nothing;

insert into public.roles (id, organization_id, name, description)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'Organization Admin', 'Tenant administrator'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', 'Manager', 'Program and workflow manager'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', 'Executive', 'Executive stakeholder')
on conflict (id) do nothing;

insert into public.programs (id, organization_id, tenant_id, name, owner_id, status)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'National Security Modernization', null, 'active')
on conflict (id) do nothing;

insert into public.projects (id, organization_id, tenant_id, program_id, name, owner_id, progress, risk_level, status, due_date)
values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000301', 'Border Security AI Platform', null, 42, 'high', 'at-risk', '2025-08-20'),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000301', 'National Digital ID Infrastructure', null, 67, 'medium', 'in-progress', '2025-03-15')
on conflict (id) do nothing;

insert into public.risks (organization_id, project_id, title, severity, likelihood, status)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000401', 'Unresolved AI fairness concerns', 'high', 'medium', 'mitigating');

insert into public.audit_logs (organization_id, tenant_id, action, resource_type, metadata)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'seed.local_created', 'system', '{"source":"supabase/seeds/001_local_enterprise_seed.sql"}'::jsonb);

commit;
