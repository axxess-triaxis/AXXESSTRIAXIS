create table if not exists public.rag_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'classified', 'chunked', 'embedded', 'ready', 'failed')),
  chunk_count integer not null default 0,
  model_id text not null default 'local-deterministic-v1',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.rag_document_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  ingestion_run_id uuid references public.rag_ingestion_runs(id) on delete set null,
  chunk_index integer not null,
  chunk_text text not null,
  embedding_model text not null default 'local-deterministic-v1',
  embedding_hash jsonb not null default '[]'::jsonb,
  visibility text not null default 'organization',
  department_id uuid,
  role_allowlist text[] not null default array[]::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rag_document_chunks_org_idx on public.rag_document_chunks(organization_id);
create index if not exists rag_document_chunks_document_idx on public.rag_document_chunks(document_id);
create index if not exists rag_document_chunks_metadata_gin_idx on public.rag_document_chunks using gin(metadata);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider_id text not null,
  status text not null default 'provider_gated' check (status in ('provider_gated', 'configured', 'connected', 'paused', 'error')),
  scopes text[] not null default array[]::text[],
  webhook_enabled boolean not null default false,
  configured_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider_id)
);

create table if not exists public.social_alert_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('x', 'facebook', 'rss', 'manual', 'demo')),
  keyword text not null,
  topic text not null,
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.social_alert_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid references public.social_alert_rules(id) on delete set null,
  provider text not null check (provider in ('x', 'facebook', 'rss', 'manual', 'demo')),
  title text not null,
  source_account text not null,
  sentiment text not null default 'neutral' check (sentiment in ('positive', 'neutral', 'negative')),
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high')),
  action_targets text[] not null default array[]::text[],
  received_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.rag_ingestion_runs enable row level security;
alter table public.rag_document_chunks enable row level security;
alter table public.integration_connections enable row level security;
alter table public.social_alert_rules enable row level security;
alter table public.social_alert_events enable row level security;

create policy "rag ingestion runs are organization scoped"
  on public.rag_ingestion_runs for all
  to authenticated
  using (organization_id in (select organization_id from public.users where id = auth.uid()))
  with check (organization_id in (select organization_id from public.users where id = auth.uid()));

create policy "rag chunks are organization scoped"
  on public.rag_document_chunks for all
  to authenticated
  using (organization_id in (select organization_id from public.users where id = auth.uid()))
  with check (organization_id in (select organization_id from public.users where id = auth.uid()));

create policy "integration connections are organization scoped"
  on public.integration_connections for all
  to authenticated
  using (organization_id in (select organization_id from public.users where id = auth.uid()))
  with check (organization_id in (select organization_id from public.users where id = auth.uid()));

create policy "social alert rules are organization scoped"
  on public.social_alert_rules for all
  to authenticated
  using (organization_id in (select organization_id from public.users where id = auth.uid()))
  with check (organization_id in (select organization_id from public.users where id = auth.uid()));

create policy "social alert events are organization scoped"
  on public.social_alert_events for all
  to authenticated
  using (organization_id in (select organization_id from public.users where id = auth.uid()))
  with check (organization_id in (select organization_id from public.users where id = auth.uid()));
