-- Fixes live tenant AI/document workflows failing outright on a bare local Supabase CLI instance:
-- "Supabase repository request failed for documents: 403 {"code":"42501", ...,
-- "hint":"Grant the required privileges to the current role with: GRANT SELECT ON
-- public.user_roles TO authenticated;", "message":"permission denied for table user_roles"}"
-- (discovered via a live onboarding -> AI workspace walkthrough; see ITERATION_PROGRESS.md).
--
-- Root cause: same class of gap as 20260721140000_grant_service_role_public_schema.sql, but for
-- the `authenticated` role instead of `service_role`. Supabase Cloud grants `authenticated` (and
-- `anon`) broad table-level privileges automatically at project creation -- real access control is
-- then enforced entirely by each table's RLS policies, not by table-level GRANT/REVOKE. A handful
-- of later migrations (starting with sprint18) already follow this convention explicitly for the
-- tables they introduce (e.g. `grant select, insert on public.audit_exports to authenticated`),
-- but foundational tables from before that convention -- including user_roles, created in
-- 20260702165736_initial_enterprise_schema.sql -- never received it, because on Supabase Cloud
-- it happened automatically and so was never written down as a migration.
--
-- Safe to apply broadly: granting table-level access to `authenticated` does not bypass RLS --
-- every table here already has row level security enabled (see the initial schema migration),
-- so real per-row access is still governed entirely by each table's policies. This mirrors exactly
-- how Supabase Cloud provisions new projects.
--
-- Safe to run against an environment that already has these grants (e.g. real Supabase Cloud
-- projects, where this is a no-op) -- GRANT is idempotent.

do $$
declare
  target_table_name text;
begin
  for target_table_name in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', target_table_name);
  end loop;
end;
$$;

-- Also cover sequences (identity/serial columns) and future tables created after this migration,
-- so this doesn't need to be repeated for every new table going forward.
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
