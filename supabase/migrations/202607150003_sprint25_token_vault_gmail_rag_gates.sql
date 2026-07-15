-- Sprint 25: encrypted connector token vault, live Gmail selected-message imports,
-- all-tenant command-center snapshot fan-out evidence, and production RAG release gates.

create extension if not exists pgcrypto;

create table if not exists public.oauth_token_vault (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  connection_id uuid references public.integration_connections(id) on delete set null,
  provider_id text not null,
  token_reference text not null unique,
  encrypted_payload jsonb not null,
  algorithm text not null default 'aes-256-gcm' check (algorithm in ('aes-256-gcm')),
  key_id text not null default 'primary',
  access_token_hash text not null,
  refresh_token_hash text,
  scopes text[] not null default array[]::text[],
  oauth_subject text,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'rotated', 'revoked', 'expired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.gmail_selected_message_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  connection_id uuid references public.integration_connections(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  message_id text not null,
  source_link text,
  from_email text not null,
  subject text not null,
  received_at timestamptz,
  status text not null default 'previewed' check (status in ('previewed', 'imported', 'rejected', 'failed')),
  import_preview jsonb not null default '{}'::jsonb,
  body_excerpt text,
  created_task_ids uuid[] not null default array[]::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.command_center_snapshot_runs (
  id uuid primary key default gen_random_uuid(),
  triggered_by_user_id uuid references public.users(id) on delete set null,
  status text not null default 'completed' check (status in ('completed', 'warning', 'failed', 'skipped')),
  tenants_seen integer not null default 0 check (tenants_seen >= 0),
  tenants_processed integer not null default 0 check (tenants_processed >= 0),
  snapshots_persisted integer not null default 0 check (snapshots_persisted >= 0),
  snapshots_failed integer not null default 0 check (snapshots_failed >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists oauth_token_vault_org_provider_idx on public.oauth_token_vault (organization_id, provider_id, status);
create index if not exists oauth_token_vault_connection_idx on public.oauth_token_vault (connection_id);
create index if not exists oauth_token_vault_expires_idx on public.oauth_token_vault (provider_id, status, expires_at);
create index if not exists gmail_selected_message_imports_org_created_idx on public.gmail_selected_message_imports (organization_id, created_at desc);
create index if not exists gmail_selected_message_imports_user_idx on public.gmail_selected_message_imports (organization_id, user_id, created_at desc);
create index if not exists command_center_snapshot_runs_created_idx on public.command_center_snapshot_runs (created_at desc);

alter table public.oauth_token_vault enable row level security;
alter table public.gmail_selected_message_imports enable row level security;
alter table public.command_center_snapshot_runs enable row level security;

drop policy if exists gmail_selected_message_imports_member_select on public.gmail_selected_message_imports;
create policy gmail_selected_message_imports_member_select on public.gmail_selected_message_imports for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists gmail_selected_message_imports_member_insert on public.gmail_selected_message_imports;
create policy gmail_selected_message_imports_member_insert on public.gmail_selected_message_imports for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists gmail_selected_message_imports_member_update on public.gmail_selected_message_imports;
create policy gmail_selected_message_imports_member_update on public.gmail_selected_message_imports for update to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  )
  with check (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

revoke all on public.oauth_token_vault from anon, authenticated;
revoke all on public.command_center_snapshot_runs from anon, authenticated;

grant select, insert, update on public.gmail_selected_message_imports to authenticated;
grant select, insert, update on
  public.oauth_token_vault,
  public.gmail_selected_message_imports,
  public.command_center_snapshot_runs,
  public.integration_connections
to service_role;

comment on table public.oauth_token_vault is 'Server-only encrypted OAuth token vault for connector access and refresh tokens. No authenticated API grant is provided.';
comment on table public.gmail_selected_message_imports is 'Tenant-scoped evidence of selected Gmail messages previewed or imported by users.';
comment on table public.command_center_snapshot_runs is 'Service-role scheduled fan-out summary for all-tenant command-center snapshot jobs.';
