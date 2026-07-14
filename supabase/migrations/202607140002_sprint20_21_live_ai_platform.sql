-- Sprint 20/21: plugin runtime, tenant AI model policy, governed execution, usage limits, and support operations.

create extension if not exists pgcrypto;

create table if not exists public.plugin_installations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plugin_id text not null,
  status text not null default 'available' check (status in ('available', 'provider_gated', 'connected', 'syncing', 'error', 'revoked')),
  connected_by_user_id uuid references public.users(id) on delete set null,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  granted_scopes text[] not null default array[]::text[],
  policy jsonb not null default '{}'::jsonb,
  token_reference text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, plugin_id)
);

create table if not exists public.plugin_action_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_user_id uuid references public.users(id) on delete set null,
  plugin_id text not null,
  action text not null,
  status text not null default 'pending' check (status in ('pending', 'allowed', 'requires_approval', 'approved', 'blocked', 'executed', 'failed')),
  decision_reason text,
  scope_request text[] not null default array[]::text[],
  payload_summary text,
  approval_user_id uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  executed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.plugin_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plugin_installation_id uuid references public.plugin_installations(id) on delete set null,
  plugin_id text not null,
  sync_mode text not null default 'manual' check (sync_mode in ('manual', 'scheduled', 'webhook')),
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'revoked')),
  records_seen integer not null default 0 check (records_seen >= 0),
  records_created integer not null default 0 check (records_created >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.tenant_model_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_key text not null default 'tenant-default-ai-routing-policy',
  allowed_providers text[] not null default array['openai', 'anthropic', 'google', 'falcon', 'jais', 'local']::text[],
  blocked_providers text[] not null default array[]::text[],
  preferred_providers jsonb not null default '{}'::jsonb,
  fallback_providers text[] not null default array['local']::text[],
  max_estimated_cost_per_request_usd numeric(12, 6) not null default 0.45,
  daily_budget_usd numeric(12, 2) not null default 75.00,
  require_human_approval_for text[] not null default array['compliance_review', 'risk_assessment', 'workflow_generation']::text[],
  restricted_data_external_providers boolean not null default false,
  zero_data_retention_required boolean not null default true,
  gateway_tags text[] not null default array['product:axxess', 'layer:governed-ai']::text[],
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, policy_key)
);

create table if not exists public.ai_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  provider text not null,
  model_policy_id text not null,
  task_category text not null,
  estimated_cost_usd numeric(12, 6) not null default 0,
  actual_cost_usd numeric(12, 6),
  latency_ms integer,
  human_review_required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.execution_environments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  environment_type text not null check (environment_type in ('local', 'github_actions', 'kubernetes', 'docker', 'vercel_sandbox')),
  name text not null,
  status text not null default 'available' check (status in ('available', 'disabled', 'provider_gated', 'error')),
  policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.execution_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid references public.users(id) on delete set null,
  kind text not null check (kind in ('plugin_sync', 'ai_tool', 'document_extraction', 'integration_webhook', 'report_export')),
  title text not null,
  requested_action text not null,
  status text not null default 'queued' check (status in ('queued', 'policy_blocked', 'ready', 'running', 'succeeded', 'failed', 'requires_approval')),
  plugin_id text,
  ai_audit_id uuid,
  policy jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.execution_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.execution_jobs(id) on delete cascade,
  status text not null check (status in ('queued', 'policy_blocked', 'ready', 'running', 'succeeded', 'failed', 'requires_approval')),
  started_at timestamptz,
  completed_at timestamptz,
  exit_code integer,
  logs jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  sandbox_spec jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.execution_artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.execution_runs(id) on delete cascade,
  name text not null,
  content_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_path text,
  retention_days integer not null default 7 check (retention_days > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.enterprise_controls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  control_key text not null,
  name text not null,
  category text not null check (category in ('auth', 'tenant', 'ai', 'plugins', 'sandbox', 'audit', 'support')),
  status text not null default 'warning' check (status in ('pass', 'warning', 'blocked')),
  owner text not null default 'platform' check (owner in ('platform', 'tenant-admin', 'provider')),
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, control_key)
);

create table if not exists public.tenant_usage_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric text not null check (metric in ('ai_requests', 'document_ingestions', 'plugin_actions', 'sandbox_runs', 'rag_queries', 'audit_exports')),
  limit_value integer not null check (limit_value >= 0),
  used_value integer not null default 0 check (used_value >= 0),
  window text not null default 'monthly' check (window in ('daily', 'monthly')),
  hard_stop boolean not null default false,
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, metric, window)
);

create table if not exists public.support_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid references public.users(id) on delete set null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'triaged', 'monitoring', 'resolved')),
  affected_area text not null check (affected_area in ('auth', 'ai', 'rag', 'integrations', 'mobile', 'deployment')),
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plugin_installations_org_status_idx on public.plugin_installations (organization_id, status, updated_at desc);
create index if not exists plugin_action_requests_org_status_idx on public.plugin_action_requests (organization_id, status, created_at desc);
create index if not exists plugin_sync_runs_org_plugin_idx on public.plugin_sync_runs (organization_id, plugin_id, started_at desc);
create index if not exists tenant_model_policies_org_policy_idx on public.tenant_model_policies (organization_id, policy_key);
create index if not exists ai_usage_ledger_org_created_idx on public.ai_usage_ledger (organization_id, created_at desc);
create index if not exists execution_jobs_org_status_idx on public.execution_jobs (organization_id, status, created_at desc);
create index if not exists execution_runs_org_status_idx on public.execution_runs (organization_id, status, created_at desc);
create index if not exists enterprise_controls_org_status_idx on public.enterprise_controls (organization_id, status, updated_at desc);
create index if not exists tenant_usage_limits_org_metric_idx on public.tenant_usage_limits (organization_id, metric);
create index if not exists support_incidents_org_status_idx on public.support_incidents (organization_id, status, created_at desc);

drop trigger if exists set_plugin_installations_updated_at on public.plugin_installations;
create trigger set_plugin_installations_updated_at before update on public.plugin_installations
  for each row execute function public.set_updated_at();

drop trigger if exists set_tenant_model_policies_updated_at on public.tenant_model_policies;
create trigger set_tenant_model_policies_updated_at before update on public.tenant_model_policies
  for each row execute function public.set_updated_at();

drop trigger if exists set_execution_environments_updated_at on public.execution_environments;
create trigger set_execution_environments_updated_at before update on public.execution_environments
  for each row execute function public.set_updated_at();

drop trigger if exists set_execution_jobs_updated_at on public.execution_jobs;
create trigger set_execution_jobs_updated_at before update on public.execution_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists set_enterprise_controls_updated_at on public.enterprise_controls;
create trigger set_enterprise_controls_updated_at before update on public.enterprise_controls
  for each row execute function public.set_updated_at();

drop trigger if exists set_tenant_usage_limits_updated_at on public.tenant_usage_limits;
create trigger set_tenant_usage_limits_updated_at before update on public.tenant_usage_limits
  for each row execute function public.set_updated_at();

drop trigger if exists set_support_incidents_updated_at on public.support_incidents;
create trigger set_support_incidents_updated_at before update on public.support_incidents
  for each row execute function public.set_updated_at();

alter table public.plugin_installations enable row level security;
alter table public.plugin_action_requests enable row level security;
alter table public.plugin_sync_runs enable row level security;
alter table public.tenant_model_policies enable row level security;
alter table public.ai_usage_ledger enable row level security;
alter table public.execution_environments enable row level security;
alter table public.execution_jobs enable row level security;
alter table public.execution_runs enable row level security;
alter table public.execution_artifacts enable row level security;
alter table public.enterprise_controls enable row level security;
alter table public.tenant_usage_limits enable row level security;
alter table public.support_incidents enable row level security;

drop policy if exists plugin_installations_admin_access on public.plugin_installations;
create policy plugin_installations_admin_access on public.plugin_installations for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists plugin_action_requests_member_access on public.plugin_action_requests;
create policy plugin_action_requests_member_access on public.plugin_action_requests for all to authenticated
  using (
    requested_by_user_id = auth.uid()
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  )
  with check (
    requested_by_user_id = auth.uid()
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists plugin_sync_runs_admin_access on public.plugin_sync_runs;
create policy plugin_sync_runs_admin_access on public.plugin_sync_runs for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists tenant_model_policies_admin_access on public.tenant_model_policies;
create policy tenant_model_policies_admin_access on public.tenant_model_policies for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists ai_usage_ledger_member_access on public.ai_usage_ledger;
create policy ai_usage_ledger_member_access on public.ai_usage_ledger for select to authenticated
  using (user_id = auth.uid() or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists execution_environments_admin_access on public.execution_environments;
create policy execution_environments_admin_access on public.execution_environments for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists execution_jobs_member_access on public.execution_jobs;
create policy execution_jobs_member_access on public.execution_jobs for all to authenticated
  using (
    created_by_user_id = auth.uid()
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  )
  with check (
    created_by_user_id = auth.uid()
    or public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
  );

drop policy if exists execution_runs_member_access on public.execution_runs;
create policy execution_runs_member_access on public.execution_runs for select to authenticated
  using (
    public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    or exists (
      select 1 from public.execution_jobs j
      where j.id = execution_runs.job_id
        and j.created_by_user_id = auth.uid()
    )
  );

drop policy if exists execution_artifacts_member_access on public.execution_artifacts;
create policy execution_artifacts_member_access on public.execution_artifacts for select to authenticated
  using (
    public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])
    or exists (
      select 1 from public.execution_runs r
      join public.execution_jobs j on j.id = r.job_id
      where r.id = execution_artifacts.run_id
        and j.created_by_user_id = auth.uid()
    )
  );

drop policy if exists enterprise_controls_admin_access on public.enterprise_controls;
create policy enterprise_controls_admin_access on public.enterprise_controls for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists tenant_usage_limits_admin_access on public.tenant_usage_limits;
create policy tenant_usage_limits_admin_access on public.tenant_usage_limits for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

drop policy if exists support_incidents_member_insert on public.support_incidents;
create policy support_incidents_member_insert on public.support_incidents for insert to authenticated
  with check (public.is_org_member(organization_id) and (created_by_user_id is null or created_by_user_id = auth.uid()));

drop policy if exists support_incidents_admin_read_update on public.support_incidents;
create policy support_incidents_admin_read_update on public.support_incidents for all to authenticated
  using (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']))
  with check (public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin']));

grant select, insert, update on
  public.plugin_installations,
  public.plugin_action_requests,
  public.plugin_sync_runs,
  public.tenant_model_policies,
  public.execution_environments,
  public.execution_jobs,
  public.enterprise_controls,
  public.tenant_usage_limits,
  public.support_incidents
to authenticated;

grant select on
  public.ai_usage_ledger,
  public.execution_runs,
  public.execution_artifacts
to authenticated;

grant select, insert, update on
  public.plugin_installations,
  public.plugin_action_requests,
  public.plugin_sync_runs,
  public.tenant_model_policies,
  public.ai_usage_ledger,
  public.execution_environments,
  public.execution_jobs,
  public.execution_runs,
  public.execution_artifacts,
  public.enterprise_controls,
  public.tenant_usage_limits,
  public.support_incidents
to service_role;

comment on table public.plugin_installations is 'Tenant-owned plugin connection records with least-privilege scopes, revocation, and sync posture.';
comment on table public.plugin_action_requests is 'Governed plugin action decisions before external writes, exports, or messages execute.';
comment on table public.tenant_model_policies is 'Tenant-level AI provider allowlists, fallbacks, spend limits, and human-review requirements.';
comment on table public.ai_usage_ledger is 'Cost, latency, model policy, and provider metadata for AI routing and governance review.';
comment on table public.execution_jobs is 'Controlled execution jobs for plugin sync, AI tools, document extraction, webhooks, and report exports.';
comment on table public.execution_runs is 'Dry-run or live execution run records with sandbox/Kubernetes specs and retained artifacts.';
comment on table public.tenant_usage_limits is 'Tenant-level usage caps and hard stops for pilot and enterprise plan controls.';
comment on table public.support_incidents is 'Tenant-scoped support incidents for auth, AI, RAG, integrations, mobile, and deployment operations.';
