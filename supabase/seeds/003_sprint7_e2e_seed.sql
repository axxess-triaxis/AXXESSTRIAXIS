-- AXXESS Sprint 7 E2E seed.
-- Development-only accounts use the shared password: AxxessSprint7!
-- Apply after Sprint 7 migration on a disposable Supabase development branch.

begin;

insert into public.organizations (id, tenant_id, name, slug, sector)
values
  ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Axxess Public Sector Lab', 'axxess-public-sector-lab', 'government'),
  ('10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Triaxis Enterprise Studio', 'triaxis-enterprise-studio', 'enterprise')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, sector = excluded.sector, tenant_id = excluded.tenant_id;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'superadmin@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Mira Shah"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'orgadmin.alpha@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Raj Anand"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'orgadmin.beta@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Nora Patel"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'executive.alpha@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Aisha Mensah"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'executive.beta@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Theo Kim"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'manager.alpha1@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Lina Torres"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'manager.alpha2@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Omar Chen"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'manager.beta@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Priya Rao"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'employee.alpha1@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Sam Rivera"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'employee.alpha2@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Mina Okafor"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'employee.alpha3@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Ivy Brooks"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'employee.beta1@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Dev Malik"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'employee.beta2@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Elle Park"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'guest.alpha@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Guest Alpha"}', false),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-4000-8000-000000000015', 'authenticated', 'authenticated', 'guest.beta@axxess.test', crypt('AxxessSprint7!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Guest Beta"}', false)
on conflict (id) do update set email = excluded.email, encrypted_password = excluded.encrypted_password, updated_at = now();

insert into public.profiles (id, email, display_name, avatar_initials)
values
  ('20000000-0000-4000-8000-000000000001', 'superadmin@axxess.test', 'Mira Shah', 'MS'),
  ('20000000-0000-4000-8000-000000000002', 'orgadmin.alpha@axxess.test', 'Raj Anand', 'RA'),
  ('20000000-0000-4000-8000-000000000003', 'orgadmin.beta@axxess.test', 'Nora Patel', 'NP'),
  ('20000000-0000-4000-8000-000000000004', 'executive.alpha@axxess.test', 'Aisha Mensah', 'AM'),
  ('20000000-0000-4000-8000-000000000005', 'executive.beta@axxess.test', 'Theo Kim', 'TK'),
  ('20000000-0000-4000-8000-000000000006', 'manager.alpha1@axxess.test', 'Lina Torres', 'LT'),
  ('20000000-0000-4000-8000-000000000007', 'manager.alpha2@axxess.test', 'Omar Chen', 'OC'),
  ('20000000-0000-4000-8000-000000000008', 'manager.beta@axxess.test', 'Priya Rao', 'PR'),
  ('20000000-0000-4000-8000-000000000009', 'employee.alpha1@axxess.test', 'Sam Rivera', 'SR'),
  ('20000000-0000-4000-8000-000000000010', 'employee.alpha2@axxess.test', 'Mina Okafor', 'MO'),
  ('20000000-0000-4000-8000-000000000011', 'employee.alpha3@axxess.test', 'Ivy Brooks', 'IB'),
  ('20000000-0000-4000-8000-000000000012', 'employee.beta1@axxess.test', 'Dev Malik', 'DM'),
  ('20000000-0000-4000-8000-000000000013', 'employee.beta2@axxess.test', 'Elle Park', 'EP'),
  ('20000000-0000-4000-8000-000000000014', 'guest.alpha@axxess.test', 'Guest Alpha', 'GA'),
  ('20000000-0000-4000-8000-000000000015', 'guest.beta@axxess.test', 'Guest Beta', 'GB')
on conflict (id) do update set email = excluded.email, display_name = excluded.display_name, avatar_initials = excluded.avatar_initials;

insert into public.users (id, organization_id, email, display_name, avatar_initials, role, status)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'superadmin@axxess.test', 'Mira Shah', 'MS', 'Super Admin', 'active'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'orgadmin.alpha@axxess.test', 'Raj Anand', 'RA', 'Organization Admin', 'active'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'orgadmin.beta@axxess.test', 'Nora Patel', 'NP', 'Organization Admin', 'active'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'executive.alpha@axxess.test', 'Aisha Mensah', 'AM', 'Executive', 'active'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'executive.beta@axxess.test', 'Theo Kim', 'TK', 'Executive', 'active'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'manager.alpha1@axxess.test', 'Lina Torres', 'LT', 'Manager', 'active'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'manager.alpha2@axxess.test', 'Omar Chen', 'OC', 'Manager', 'active'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', 'manager.beta@axxess.test', 'Priya Rao', 'PR', 'Manager', 'active'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'employee.alpha1@axxess.test', 'Sam Rivera', 'SR', 'Employee', 'active'),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'employee.alpha2@axxess.test', 'Mina Okafor', 'MO', 'Employee', 'active'),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'employee.alpha3@axxess.test', 'Ivy Brooks', 'IB', 'Employee', 'active'),
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000002', 'employee.beta1@axxess.test', 'Dev Malik', 'DM', 'Employee', 'active'),
  ('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000002', 'employee.beta2@axxess.test', 'Elle Park', 'EP', 'Employee', 'active'),
  ('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'guest.alpha@axxess.test', 'Guest Alpha', 'GA', 'Guest', 'active'),
  ('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000002', 'guest.beta@axxess.test', 'Guest Beta', 'GB', 'Guest', 'active')
on conflict (id) do update set role = excluded.role, status = excluded.status, updated_at = now();

insert into public.organization_members (organization_id, user_id, title, status)
select organization_id, id, role::text, status from public.users
where id between '20000000-0000-4000-8000-000000000001' and '20000000-0000-4000-8000-000000000015'
on conflict (organization_id, user_id) do update set title = excluded.title, status = excluded.status;

insert into public.programs (id, organization_id, tenant_id, name, owner_id, status, start_date, end_date)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Public Digital Services', '20000000-0000-4000-8000-000000000004', 'active', '2026-07-01', '2026-12-31'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Enterprise Operating System', '20000000-0000-4000-8000-000000000005', 'active', '2026-07-01', '2027-01-31')
on conflict (id) do update set name = excluded.name, owner_id = excluded.owner_id, status = excluded.status;

insert into public.projects (id, organization_id, tenant_id, program_id, name, description, owner_id, progress, risk_level, priority, status, start_date, due_date, tags)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Resident Services Portal', 'Self-service civic workflows for residents.', '20000000-0000-4000-8000-000000000006', 35, 'medium', 'high', 'in-progress', '2026-07-05', '2026-09-15', array['public-sector','portal']),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Permit Modernization', 'Digitize permit intake and review.', '20000000-0000-4000-8000-000000000007', 15, 'high', 'urgent', 'planning', '2026-07-10', '2026-10-30', array['permits','workflow']),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Field Operations Dashboard', 'Operations cockpit for regional teams.', '20000000-0000-4000-8000-000000000006', 70, 'low', 'medium', 'review', '2026-06-01', '2026-08-05', array['dashboard','operations']),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Enterprise Knowledge Hub', 'Institutional knowledge rollout.', '20000000-0000-4000-8000-000000000008', 45, 'medium', 'high', 'in-progress', '2026-07-01', '2026-11-12', array['knowledge','enablement']),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Operating Rhythm Automation', 'Automated program cadence and meeting actions.', '20000000-0000-4000-8000-000000000008', 25, 'high', 'urgent', 'at-risk', '2026-07-15', '2026-12-20', array['meetings','automation'])
on conflict (id) do update set name = excluded.name, description = excluded.description, owner_id = excluded.owner_id, progress = excluded.progress, risk_level = excluded.risk_level, priority = excluded.priority, status = excluded.status, tags = excluded.tags;

insert into public.tasks (id, organization_id, tenant_id, program_id, project_id, title, description, assignee_id, priority, status, due_date, tags)
values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Define resident intake validation', 'Confirm mandatory fields and validation copy.', '20000000-0000-4000-8000-000000000009', 'high', 'in-progress', '2026-07-10', array['forms']),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Prepare launch checklist', 'Operational readiness checklist for portal pilot.', '20000000-0000-4000-8000-000000000010', 'medium', 'pending', '2026-07-18', array['launch']),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Review accessibility report', 'Resolve WCAG findings before pilot.', '20000000-0000-4000-8000-000000000011', 'urgent', 'blocked', '2026-07-12', array['accessibility']),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Map permit statuses', 'Align legacy statuses with new workflow.', '20000000-0000-4000-8000-000000000009', 'high', 'pending', '2026-07-20', array['permits']),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Draft reviewer training plan', 'Create enablement plan for permit reviewers.', '20000000-0000-4000-8000-000000000010', 'medium', 'pending', '2026-07-25', array['training']),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'Finalize regional KPIs', 'Confirm field metrics for dashboard release.', '20000000-0000-4000-8000-000000000011', 'low', 'completed', '2026-07-04', array['analytics']),
  ('50000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'Load sample field data', 'Seed field activity records for demo.', '20000000-0000-4000-8000-000000000009', 'medium', 'in-progress', '2026-07-14', array['data']),
  ('50000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', 'Migrate playbook library', 'Move key operating playbooks into knowledge hub.', '20000000-0000-4000-8000-000000000012', 'high', 'in-progress', '2026-07-22', array['knowledge']),
  ('50000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', 'Create owner review queue', 'Route stale knowledge pages to owners.', '20000000-0000-4000-8000-000000000013', 'medium', 'pending', '2026-07-26', array['governance']),
  ('50000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', 'Publish onboarding deck', 'Prepare onboarding packet for beta teams.', '20000000-0000-4000-8000-000000000012', 'low', 'completed', '2026-07-03', array['enablement']),
  ('50000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000005', 'Define meeting action schema', 'Confirm action item and decision payload.', '20000000-0000-4000-8000-000000000013', 'urgent', 'blocked', '2026-07-16', array['meetings']),
  ('50000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000005', 'Wire cadence reminders', 'Create reminders for weekly operating rhythm.', '20000000-0000-4000-8000-000000000012', 'high', 'pending', '2026-07-27', array['notifications']),
  ('50000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000005', 'Review stakeholder dependencies', 'Confirm external dependencies before automation pilot.', '20000000-0000-4000-8000-000000000013', 'medium', 'pending', '2026-08-02', array['stakeholders']),
  ('50000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'Validate tenant isolation case', 'Ensure beta tenant data is invisible to alpha users.', '20000000-0000-4000-8000-000000000006', 'urgent', 'pending', '2026-07-11', array['security']),
  ('50000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', 'Validate beta tenant isolation case', 'Ensure alpha tenant data is invisible to beta users.', '20000000-0000-4000-8000-000000000008', 'urgent', 'pending', '2026-07-11', array['security'])
on conflict (id) do update set title = excluded.title, description = excluded.description, assignee_id = excluded.assignee_id, priority = excluded.priority, status = excluded.status, tags = excluded.tags;

insert into public.meetings (id, organization_id, tenant_id, project_id, program_id, title, starts_at, ends_at, attendee_ids, agenda, notes, decisions, action_items, status)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Resident portal readiness review', '2026-07-08T15:00:00Z', '2026-07-08T15:45:00Z', array['20000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000006'::uuid], 'Review launch blockers', 'Accessibility remains the key risk.', array['Keep pilot date unchanged'], array['Resolve accessibility report'], 'scheduled'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Permit modernization kickoff', '2026-07-09T16:00:00Z', '2026-07-09T17:00:00Z', array['20000000-0000-4000-8000-000000000004'::uuid,'20000000-0000-4000-8000-000000000007'::uuid], 'Confirm operating model', null, array['Use phased migration'], array['Create reviewer training plan'], 'scheduled'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Field dashboard acceptance', '2026-07-06T14:00:00Z', '2026-07-06T14:30:00Z', array['20000000-0000-4000-8000-000000000006'::uuid,'20000000-0000-4000-8000-000000000011'::uuid], 'Review acceptance metrics', 'KPIs accepted by regional leads.', array['Proceed to release candidate'], array['Load final sample field data'], 'completed'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'Knowledge hub content council', '2026-07-10T15:00:00Z', '2026-07-10T15:45:00Z', array['20000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000008'::uuid], 'Approve playbook taxonomy', null, array['Adopt owner-based review queue'], array['Create owner review queue'], 'scheduled'),
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 'Operating rhythm automation risk review', '2026-07-11T18:00:00Z', '2026-07-11T18:45:00Z', array['20000000-0000-4000-8000-000000000005'::uuid,'20000000-0000-4000-8000-000000000013'::uuid], 'Review blocked meeting action schema', 'Schema decision needed before pilot.', array['Escalate schema decision'], array['Define meeting action schema'], 'scheduled')
on conflict (id) do update set title = excluded.title, starts_at = excluded.starts_at, attendee_ids = excluded.attendee_ids, decisions = excluded.decisions, action_items = excluded.action_items, status = excluded.status;

insert into public.notifications (id, organization_id, tenant_id, user_id, type, title, body, resource_type, resource_id, read_at)
values
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 'project', 'Project created', 'Resident Services Portal was created.', 'projects', '40000000-0000-4000-8000-000000000001', null),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000009', 'task', 'Task assigned', 'Define resident intake validation was assigned to you.', 'tasks', '50000000-0000-4000-8000-000000000001', null),
  ('70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'meeting', 'Meeting created', 'Resident portal readiness review was scheduled.', 'meetings', '60000000-0000-4000-8000-000000000001', null),
  ('70000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'admin', 'User invited', 'Sprint 7 invitation workflow is ready.', null, null, now()),
  ('70000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'system', 'Tenant isolation check', 'Alpha tenant records are ready for E2E validation.', null, null, null),
  ('70000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000008', 'project', 'Project created', 'Enterprise Knowledge Hub was created.', 'projects', '40000000-0000-4000-8000-000000000004', null),
  ('70000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000012', 'task', 'Task assigned', 'Migrate playbook library was assigned to you.', 'tasks', '50000000-0000-4000-8000-000000000008', null),
  ('70000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'meeting', 'Meeting created', 'Knowledge hub content council was scheduled.', 'meetings', '60000000-0000-4000-8000-000000000004', null),
  ('70000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'system', 'Tenant isolation check', 'Beta tenant records are ready for E2E validation.', null, null, null),
  ('70000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000013', 'task', 'Blocked task requires update', 'Define meeting action schema is blocked.', 'tasks', '50000000-0000-4000-8000-000000000011', null)
on conflict (id) do update set title = excluded.title, body = excluded.body, read_at = excluded.read_at;

insert into public.audit_logs (id, organization_id, tenant_id, actor_user_id, actor_role, action, resource_type, resource_id, category, metadata)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Organization Admin', 'project.created', 'projects', '40000000-0000-4000-8000-000000000001', 'project-management', '{"seed":"sprint7"}'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 'Manager', 'task.updated', 'tasks', '50000000-0000-4000-8000-000000000001', 'task-management', '{"seed":"sprint7"}'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'Executive', 'meeting.created', 'meetings', '60000000-0000-4000-8000-000000000001', 'meeting-management', '{"seed":"sprint7"}'),
  ('80000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'Organization Admin', 'project.created', 'projects', '40000000-0000-4000-8000-000000000004', 'project-management', '{"seed":"sprint7"}'),
  ('80000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000008', 'Manager', 'task.updated', 'tasks', '50000000-0000-4000-8000-000000000011', 'task-management', '{"seed":"sprint7"}')
on conflict (id) do update set action = excluded.action, metadata = excluded.metadata;

commit;
