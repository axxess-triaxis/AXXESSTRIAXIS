-- Sprint 19: functional enterprise AI workflow foundation.
-- Adds live onboarding/profile metadata, governed RAG review records,
-- AI conversations, and reusable connector sync evidence.

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists department_name text,
  add column if not exists title text,
  add column if not exists timezone text not null default 'Asia/Kolkata';

alter table public.rag_ingestion_runs
  add column if not exists source_text_digest text,
  add column if not exists source_text_preview text;

alter table public.rag_document_chunks
  add column if not exists source_title text,
  add column if not exists source_mime_type text,
  add column if not exists source_text_digest text;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  title text not null,
  conversation_type text not null default 'rag' check (conversation_type in ('rag', 'chat', 'email_import', 'workflow')),
  status text not null default 'active' check (status in ('active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  ai_output_audit_id uuid references public.ai_output_audit(id) on delete set null,
  citations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_action_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_output_audit_id uuid references public.ai_output_audit(id) on delete set null,
  reviewer_user_id uuid references public.users(id) on delete set null,
  decision text not null check (decision in ('approved', 'rejected')),
  action_type text not null default 'answer_review',
  status text not null default 'approved' check (status in ('approved', 'rejected', 'queued', 'completed')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.integration_connections
  add column if not exists oauth_subject text,
  add column if not exists token_reference text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists retry_count integer not null default 0 check (retry_count >= 0),
  add column if not exists last_error text,
  add column if not exists revoked_at timestamptz;

create table if not exists public.integration_sync_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete set null,
  provider_id text not null,
  sync_type text not null,
  status text not null check (status in ('started', 'succeeded', 'failed', 'skipped', 'revoked')),
  retry_count integer not null default 0 check (retry_count >= 0),
  error_message text,
  source_reference text,
  records_previewed integer not null default 0 check (records_previewed >= 0),
  records_created integer not null default 0 check (records_created >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists users_org_department_name_idx on public.users (organization_id, department_name);
create index if not exists rag_document_chunks_digest_idx on public.rag_document_chunks (organization_id, source_text_digest);
create index if not exists ai_conversations_org_user_idx on public.ai_conversations (organization_id, user_id, created_at desc);
create index if not exists ai_conversation_messages_conversation_idx on public.ai_conversation_messages (organization_id, conversation_id, created_at);
create index if not exists workflow_action_reviews_org_created_idx on public.workflow_action_reviews (organization_id, created_at desc);
create index if not exists workflow_action_reviews_ai_output_idx on public.workflow_action_reviews (organization_id, ai_output_audit_id);
create index if not exists integration_sync_logs_org_provider_idx on public.integration_sync_logs (organization_id, provider_id, created_at desc);

drop trigger if exists set_ai_conversations_updated_at on public.ai_conversations;
create trigger set_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

alter table public.ai_conversations enable row level security;
alter table public.ai_conversation_messages enable row level security;
alter table public.workflow_action_reviews enable row level security;
alter table public.integration_sync_logs enable row level security;

drop policy if exists ai_conversations_member_access on public.ai_conversations;
create policy ai_conversations_member_access
  on public.ai_conversations for all
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists ai_conversation_messages_member_access on public.ai_conversation_messages;
create policy ai_conversation_messages_member_access
  on public.ai_conversation_messages for all
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists workflow_action_reviews_reviewer_access on public.workflow_action_reviews;
create policy workflow_action_reviews_reviewer_access
  on public.workflow_action_reviews for all
  to authenticated
  using (
    reviewer_user_id = auth.uid()
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
  )
  with check (
    reviewer_user_id = auth.uid()
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Executive', 'Manager'])
  );

drop policy if exists integration_sync_logs_admin_access on public.integration_sync_logs;
create policy integration_sync_logs_admin_access
  on public.integration_sync_logs for all
  to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant select, insert, update on
  public.ai_conversations,
  public.ai_conversation_messages,
  public.workflow_action_reviews,
  public.integration_sync_logs
to authenticated;

grant select, insert, update on
  public.ai_conversations,
  public.ai_conversation_messages,
  public.workflow_action_reviews,
  public.integration_sync_logs,
  public.rag_ingestion_runs,
  public.rag_document_chunks,
  public.integration_connections
to service_role;

comment on table public.ai_conversations is 'Tenant-scoped AI conversation headers for live RAG, email import, and workflow sessions.';
comment on table public.ai_conversation_messages is 'Tenant-scoped AI conversation messages with citations and optional ai_output_audit links.';
comment on table public.workflow_action_reviews is 'Human approval/rejection records for consequential AI output and workflow actions.';
comment on table public.integration_sync_logs is 'Tenant-scoped connector sync, retry, error, revocation, and audit evidence.';
