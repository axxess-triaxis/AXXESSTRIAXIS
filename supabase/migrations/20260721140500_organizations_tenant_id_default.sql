-- Fixes new organization signup failing outright: "null value in column \"tenant_id\" of
-- relation \"organizations\" violates not-null constraint".
--
-- 202607090001_sprint12_security_compliance_foundation.sql made organizations.tenant_id NOT NULL
-- and backfilled every row that existed at the time as tenant_id = id, but added no default for
-- rows inserted afterward. src/auth/provisioning.ts's provisionTenantForUser() -- the real
-- onboarding backend every new signup goes through -- never set tenant_id, so this has been
-- failing for every brand-new organization since that migration landed (discovered via a live
-- onboarding walkthrough in a local environment; see PRODUCT_ITERATION_I_CLOSEOUT.md and
-- ITERATION_PROGRESS.md for context).
--
-- Fixed at the schema level with a trigger rather than only in application code: this protects
-- every insert path into organizations (including ones this pass may not have found), and avoids
-- the alternative of having the application generate and pass its own id/tenant_id explicitly,
-- which would be unsafe here specifically -- provisionTenantForUser's insert upserts on
-- conflict(slug), and an application-supplied id would let that conflict path reassign an
-- *existing* organization's primary key if two signups ever raced on the same org name.

create or replace function public.default_organization_tenant_id()
returns trigger
language plpgsql
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists set_organizations_tenant_id on public.organizations;
create trigger set_organizations_tenant_id
  before insert on public.organizations
  for each row
  execute function public.default_organization_tenant_id();
