-- Sprint 24: tenant AI review inbox, OAuth callback state, approved sandbox runner evidence, and RAG release gates.

create extension if not exists pgcrypto;

alter table public.integration_connections
  add column if not exists token_expires_at timestamptz,
  add column if not exists oauth_state_hash text,
  add column if not exists connected_at timestamptz,
  add column if not exists connection_health text not null default 'unknown' check (connection_health in ('unknown', 'healthy', 'warning', 'error', 'revoked'));

create table if not exists public.oauth_connection_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  provider_id text not null,
  state_hash text not null unique,
  status text not null default 'issued' check (status in ('issued', 'consumed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sandbox_runner_invocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  execution_job_id uuid references public.execution_jobs(id) on delete set null,
  runner_mode text not null default 'dry_run' check (runner_mode in ('dry_run', 'github_actions', 'kubernetes', 'vercel_sandbox')),
  status text not null default 'queued' check (status in ('queued', 'succeeded', 'blocked', 'failed')),
  logs jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  evidence text[] not null default array[]::text[],
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.rag_release_gates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_by_user_id uuid references public.users(id) on delete set null,
  status text not null check (status in ('passed', 'warning', 'failed')),
  fixtures_run integer not null default 0 check (fixtures_run >= 0),
  passed_fixtures integer not null default 0 check (passed_fixtures >= 0),
  failed_fixtures integer not null default 0 check (failed_fixtures >= 0),
  minimum_confidence numeric(5, 4) not null default 0 check (minimum_confidence >= 0 and minimum_confidence <= 1),
  findings jsonb not null default '[]'::jsonb,
  release_blocking boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists oauth_connection_states_org_provider_idx on public.oauth_connection_states (organization_id, provider_id, created_at desc);
create index if not exists oauth_connection_states_status_idx on public.oauth_connection_states (organization_id, status, expires_at);
create index if not exists integration_connections_oauth_state_idx on public.integration_connections (organization_id, oauth_state_hash);
create index if not exists sandbox_runner_invocations_org_status_idx on public.sandbox_runner_invocations (organization_id, status, started_at desc);
create index if not exists rag_release_gates_org_status_idx on public.rag_release_gates (organization_id, status, created_at desc);

alter table public.oauth_connection_states enable row level security;
alter table public.sandbox_runner_invocations enable row level security;
alter table public.rag_release_gates enable row level security;

drop policy if exists oauth_connection_states_owner_or_admin on public.oauth_connection_states;
create policy oauth_connection_states_owner_or_admin on public.oauth_connection_states for all to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  )
  with check (
    user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists sandbox_runner_invocations_admin_access on public.sandbox_runner_invocations;
create policy sandbox_runner_invocations_admin_access on public.sandbox_runner_invocations for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists rag_release_gates_admin_access on public.rag_release_gates;
create policy rag_release_gates_admin_access on public.rag_release_gates for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant select, insert, update on public.oauth_connection_states to authenticated;
grant select, insert, update on public.sandbox_runner_invocations to authenticated;
grant select, insert, update on public.rag_release_gates to authenticated;
grant select, insert, update on
  public.oauth_connection_states,
  public.sandbox_runner_invocations,
  public.rag_release_gates,
  public.integration_connections
to service_role;

comment on table public.oauth_connection_states is 'Hashed OAuth state records for tenant-owned connector callback validation.';
comment on table public.sandbox_runner_invocations is 'Approved sandbox runner invocation evidence after policy attestation.';
comment on table public.rag_release_gates is 'RAG fixture release gate outcomes for permission, citation, and confidence regressions.';
