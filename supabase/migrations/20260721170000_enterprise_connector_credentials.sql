-- Adds server-only encrypted credential storage for the non-OAuth Postgres wrapper integrations
-- (Auth0 SSO configuration, ClickHouse/MSSQL/Snowflake data warehouse connections, S3 storage,
-- Paddle/Stripe billing) -- see MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md section 4 and
-- ITERATION_PROGRESS.md for the product-facing feature this backs.
--
-- Mirrors oauth_token_vault's shape and access model (202607150003_sprint25_token_vault_gmail_
-- rag_gates.sql): server-only, accessed exclusively via supabaseAdminRest with the service_role
-- key, never granted to authenticated -- these are connection secrets (API keys, connection
-- strings, client secrets), not something any client-side code should read directly. Unlike
-- oauth_token_vault (which stores a fixed OAuth token bundle shape), encrypted_payload here holds
-- an arbitrary per-provider credential JSON blob, since each of these seven providers needs a
-- different credential shape (connection string vs access-key/secret vs API key vs domain+client
-- credentials).
--
-- tenant_id defaults via the same trigger function added in
-- 20260721160000_tenant_child_tables_tenant_id_default.sql, keeping this table consistent with
-- every other tenant-scoped table's NOT NULL tenant_id convention from day one, rather than
-- repeating the gap that migration fixed.

create table if not exists public.enterprise_connector_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null,
  configured_by_user_id uuid references public.users(id) on delete set null,
  provider_id text not null check (provider_id in ('auth0', 'clickhouse', 'mssql', 'snowflake', 's3', 'paddle', 'stripe')),
  encrypted_payload jsonb not null,
  algorithm text not null default 'aes-256-gcm' check (algorithm in ('aes-256-gcm')),
  key_id text not null default 'primary',
  payload_hash text not null,
  status text not null default 'configured' check (status in ('configured', 'connection_verified', 'connection_failed', 'revoked')),
  last_tested_at timestamptz,
  last_test_result text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (organization_id, provider_id)
);

create index if not exists enterprise_connector_credentials_org_provider_idx
  on public.enterprise_connector_credentials (organization_id, provider_id, status);

alter table public.enterprise_connector_credentials enable row level security;

drop trigger if exists set_enterprise_connector_credentials_tenant_id on public.enterprise_connector_credentials;
create trigger set_enterprise_connector_credentials_tenant_id
  before insert on public.enterprise_connector_credentials
  for each row
  execute function public.default_tenant_id_from_organization();

revoke all on public.enterprise_connector_credentials from anon, authenticated;
grant select, insert, update on public.enterprise_connector_credentials to service_role;

comment on table public.enterprise_connector_credentials is 'Server-only encrypted credential storage for non-OAuth enterprise connector integrations (Auth0, ClickHouse, MSSQL, Snowflake, S3, Paddle, Stripe). No authenticated API grant is provided.';
