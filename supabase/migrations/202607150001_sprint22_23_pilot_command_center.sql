-- Sprint 22/23: pilot command center, connector queue, AI review operations, sandbox attestations, and RAG evaluation evidence.

create extension if not exists pgcrypto;

create table if not exists public.pilot_command_center_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generated_by_user_id uuid references public.users(id) on delete set null,
  score integer not null check (score between 0 and 100),
  status text not null check (status in ('pass', 'warning', 'blocked')),
  readiness_score integer not null check (readiness_score between 0 and 100),
  sprint_plan jsonb not null default '{}'::jsonb,
  workstreams jsonb not null default '[]'::jsonb,
  queues jsonb not null default '[]'::jsonb,
  plugin_runtime jsonb not null default '{}'::jsonb,
  execution_runtime jsonb not null default '{}'::jsonb,
  rag_evaluation jsonb not null default '{}'::jsonb,
  recommendations text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.ai_operation_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid references public.users(id) on delete set null,
  reviewer_user_id uuid references public.users(id) on delete set null,
  source_audit_id text,
  source_conversation_id uuid,
  task_category text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'edited', 'rejected', 'escalated')),
  confidence numeric(5, 4) not null default 0 check (confidence >= 0 and confidence <= 1),
  human_review_flag boolean not null default true,
  decision_reason text,
  answer_excerpt text,
  citations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connector_execution_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_user_id uuid references public.users(id) on delete set null,
  approved_by_user_id uuid references public.users(id) on delete set null,
  plugin_id text not null,
  action text not null,
  status text not null default 'pending' check (status in ('pending', 'requires_approval', 'approved', 'blocked', 'queued', 'running', 'succeeded', 'failed', 'revoked')),
  approval_required boolean not null default true,
  requested_scope text[] not null default array[]::text[],
  payload_summary text,
  decision_reason text,
  execution_job_id uuid references public.execution_jobs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sandbox_policy_attestations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  execution_job_id uuid references public.execution_jobs(id) on delete cascade,
  reviewed_by_user_id uuid references public.users(id) on delete set null,
  environment_type text not null check (environment_type in ('local', 'github_actions', 'kubernetes', 'docker', 'vercel_sandbox')),
  security_tier text not null check (security_tier in ('standard', 'restricted', 'regulated')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'blocked', 'expired')),
  policy_hash text not null,
  findings jsonb not null default '[]'::jsonb,
  kubernetes_spec jsonb not null default '{}'::jsonb,
  network_policy jsonb not null default '{}'::jsonb,
  secret_policy jsonb not null default '{}'::jsonb,
  attested_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rag_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_by_user_id uuid references public.users(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'passed', 'warning', 'failed')),
  fixtures_run integer not null default 0 check (fixtures_run >= 0),
  passed_fixtures integer not null default 0 check (passed_fixtures >= 0),
  failed_fixtures integer not null default 0 check (failed_fixtures >= 0),
  minimum_confidence numeric(5, 4) not null default 0 check (minimum_confidence >= 0 and minimum_confidence <= 1),
  source_coverage jsonb not null default '{}'::jsonb,
  permission_findings jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pilot_command_center_snapshots_org_created_idx on public.pilot_command_center_snapshots (organization_id, created_at desc);
create index if not exists ai_operation_reviews_org_status_idx on public.ai_operation_reviews (organization_id, status, created_at desc);
create index if not exists connector_execution_queue_org_status_idx on public.connector_execution_queue (organization_id, status, created_at desc);
create index if not exists connector_execution_queue_org_plugin_idx on public.connector_execution_queue (organization_id, plugin_id, created_at desc);
create index if not exists sandbox_policy_attestations_org_status_idx on public.sandbox_policy_attestations (organization_id, status, created_at desc);
create index if not exists rag_evaluation_runs_org_created_idx on public.rag_evaluation_runs (organization_id, created_at desc);

drop trigger if exists set_ai_operation_reviews_updated_at on public.ai_operation_reviews;
create trigger set_ai_operation_reviews_updated_at before update on public.ai_operation_reviews
  for each row execute function public.set_updated_at();

drop trigger if exists set_connector_execution_queue_updated_at on public.connector_execution_queue;
create trigger set_connector_execution_queue_updated_at before update on public.connector_execution_queue
  for each row execute function public.set_updated_at();

drop trigger if exists set_sandbox_policy_attestations_updated_at on public.sandbox_policy_attestations;
create trigger set_sandbox_policy_attestations_updated_at before update on public.sandbox_policy_attestations
  for each row execute function public.set_updated_at();

alter table public.pilot_command_center_snapshots enable row level security;
alter table public.ai_operation_reviews enable row level security;
alter table public.connector_execution_queue enable row level security;
alter table public.sandbox_policy_attestations enable row level security;
alter table public.rag_evaluation_runs enable row level security;

drop policy if exists pilot_command_center_snapshots_admin_access on public.pilot_command_center_snapshots;
create policy pilot_command_center_snapshots_admin_access on public.pilot_command_center_snapshots for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists ai_operation_reviews_member_select on public.ai_operation_reviews;
create policy ai_operation_reviews_member_select on public.ai_operation_reviews for select to authenticated
  using (
    created_by_user_id = (select auth.uid())
    or reviewer_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists ai_operation_reviews_member_insert on public.ai_operation_reviews;
create policy ai_operation_reviews_member_insert on public.ai_operation_reviews for insert to authenticated
  with check (
    created_by_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists ai_operation_reviews_reviewer_update on public.ai_operation_reviews;
create policy ai_operation_reviews_reviewer_update on public.ai_operation_reviews for update to authenticated
  using (
    reviewer_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  )
  with check (
    reviewer_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists connector_execution_queue_member_select on public.connector_execution_queue;
create policy connector_execution_queue_member_select on public.connector_execution_queue for select to authenticated
  using (
    requested_by_user_id = (select auth.uid())
    or approved_by_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists connector_execution_queue_member_insert on public.connector_execution_queue;
create policy connector_execution_queue_member_insert on public.connector_execution_queue for insert to authenticated
  with check (
    requested_by_user_id = (select auth.uid())
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists connector_execution_queue_admin_update on public.connector_execution_queue;
create policy connector_execution_queue_admin_update on public.connector_execution_queue for update to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists sandbox_policy_attestations_admin_access on public.sandbox_policy_attestations;
create policy sandbox_policy_attestations_admin_access on public.sandbox_policy_attestations for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists rag_evaluation_runs_admin_access on public.rag_evaluation_runs;
create policy rag_evaluation_runs_admin_access on public.rag_evaluation_runs for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant select, insert, update on public.pilot_command_center_snapshots to authenticated;
grant select, insert, update on public.ai_operation_reviews to authenticated;
grant select, insert, update on public.connector_execution_queue to authenticated;
grant select, insert, update on public.sandbox_policy_attestations to authenticated;
grant select, insert, update on public.rag_evaluation_runs to authenticated;
