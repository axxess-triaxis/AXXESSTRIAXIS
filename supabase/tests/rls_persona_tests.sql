-- Sprint 13 RLS persona test plan.
-- Run against a disposable local/staging database after migrations and persona fixtures are loaded.
-- Expected personas:
-- org_admin_alpha, executive_alpha, manager_alpha, employee_alpha, consultant_alpha, guest_alpha, org_admin_beta, guest_beta.

begin;

-- 1. Alpha users must not see beta tenant projects.
set local role authenticated;
-- In local Supabase, set request.jwt.claim.sub to the persona auth uid before each assertion.
-- select count(*) = 0 as alpha_cannot_see_beta
-- from public.projects
-- where organization_id = :'org_beta_id';

-- 2. Guest cannot approve prompts.
-- select public.can_approve_prompt(:'org_alpha_id'::uuid) = false as guest_cannot_approve_prompt;

-- 3. Consultant access remains limited to explicitly visible documents.
-- select public.can_access_document(:'restricted_document_id'::uuid) = false as consultant_cannot_read_restricted_document;

-- 4. Organization admin can read tenant audit and compliance evidence.
-- select public.has_tenant_role(:'org_alpha_id'::uuid, array['Organization Admin']) = true as org_admin_role_detected;

-- 5. Service role is not required for client flows.
-- select count(*) >= 0 as authenticated_can_query_own_notifications
-- from public.notifications
-- where organization_id = :'org_alpha_id';

rollback;
