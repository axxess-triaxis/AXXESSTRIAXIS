-- Sprint 13 persona fixture sketch for staging RLS tests.
-- Load only into disposable local/staging databases.

-- org_admin_alpha
-- executive_alpha
-- manager_alpha
-- employee_alpha
-- consultant_alpha
-- guest_alpha
-- org_admin_beta
-- guest_beta

-- Use Supabase Auth admin tooling or dashboard seed users to create auth.users rows,
-- then insert matching public.users, organization_members, roles, user_roles,
-- departments, workspaces, workspace_members, projects, documents, document_permissions,
-- prompt_registry, prompt_versions, and ai_output_audit records.
