-- Fixes tenant provisioning failing outright on a bare local Supabase CLI instance:
-- "Supabase admin request failed for organizations: 403 {"code":"42501", ...,
-- "message":"permission denied for table organizations"}".
--
-- Root cause: Supabase Cloud grants its `service_role` Postgres role broad privileges on every
-- table in the `public` schema automatically at project creation -- this is part of the hosted
-- platform's own bootstrapping, not something captured in this repo's migrations. A hand-rolled
-- local `supabase start` instance never receives that bootstrapping, so any table that wasn't
-- explicitly granted to service_role in a migration is inaccessible to server-side admin requests
-- (provisionTenantForUser and everything else that goes through supabaseAdminRest()).
--
-- A handful of later migrations (sprint18, sprint29, sprint30, sprint32) already grant service_role
-- access per-table for the tables they introduced -- this migration applies the same treatment
-- retroactively to every table that predates that convention (organizations, users, roles,
-- departments, workspaces, and everything provisionTenantForUser or the enterprise repositories
-- write to), using a dynamic grant over every table in the schema rather than enumerating dozens
-- of names by hand, so newly added tables are covered automatically too.
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
    execute format('grant select, insert, update, delete on public.%I to service_role', target_table_name);
  end loop;
end;
$$;

-- Also cover sequences (identity/serial columns) and future tables created after this migration,
-- so this doesn't need to be repeated for every new table going forward.
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
