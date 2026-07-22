-- Fixes every live tenant write to programs/projects/tasks/meetings/stakeholders/documents/
-- notifications/audit_logs/beta_feedback/knowledge_articles failing outright:
-- "null value in column \"tenant_id\" of relation \"documents\" violates not-null constraint"
-- (discovered via a live onboarding -> AI workspace walkthrough seeding a sample document; see
-- ITERATION_PROGRESS.md).
--
-- Root cause: 202607090002_sprint13_onboarding_rls_persona_readiness.sql added a `tenant_id`
-- column to exactly these 10 tables, backfilled it as tenant_id = organization_id for every row
-- that existed at the time, and made it NOT NULL -- but added no default for rows inserted
-- afterward. None of the application repositories that write to these tables set tenant_id
-- explicitly (they only set organization_id), so every insert into any of these 10 tables has
-- been failing this constraint since that migration landed. This is the same class of bug as
-- 20260721140500_organizations_tenant_id_default.sql, just affecting 10 child tables instead of
-- the organizations root table -- and for these tables tenant_id mirrors organization_id (the
-- tenant this row belongs to), not id (these rows are not tenants themselves).
--
-- Fixed at the schema level with one generic trigger function reused across all 10 tables, rather
-- than requiring every application call site (and every future one) to remember to set tenant_id.

create or replace function public.default_tenant_id_from_organization()
returns trigger
language plpgsql
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := new.organization_id;
  end if;
  return new;
end;
$$;

do $$
declare
  target_table_name text;
begin
  foreach target_table_name in array array[
    'programs',
    'projects',
    'tasks',
    'meetings',
    'stakeholders',
    'documents',
    'notifications',
    'audit_logs',
    'beta_feedback',
    'knowledge_articles'
  ]
  loop
    if exists (
      select 1
      from information_schema.tables existing_table
      where existing_table.table_schema = 'public'
        and existing_table.table_name = target_table_name
    ) then
      execute format('drop trigger if exists set_%I_tenant_id on public.%I', target_table_name, target_table_name);
      execute format(
        'create trigger set_%I_tenant_id before insert on public.%I for each row execute function public.default_tenant_id_from_organization()',
        target_table_name, target_table_name
      );
    end if;
  end loop;
end $$;
