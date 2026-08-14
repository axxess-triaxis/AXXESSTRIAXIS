-- MCP3-2 (2026-08-14): agent profiles, policy-template linkage, and the pending-execution state
-- that "approval resume" needs. Read-only investigation before this migration traced
-- PATCH /api/approvals/[id] end to end and confirmed approving a critical MCP tool call has never
-- actually executed the underlying tool -- only approval_requests.status flips and (optionally) an
-- Always-Allow grant is created for *future* calls. This migration adds the table that lets the
-- approval route atomically execute the specific pending call exactly once, plus a named
-- agent_profiles entity so a connection can be issued from a reusable, admin-defined persona
-- instead of only a bare provider+label pair.
--
-- Same isolation model as the two existing agent tables (20260730120000_agent_connections.sql,
-- 20260730130000_agent_action_grants.sql): RLS enabled, no policies, explicit revoke of
-- anon/authenticated, service-role-only access. All reads/writes happen through
-- src/services/agents/*Repository.ts, which always filter/set organization_id explicitly.

create table if not exists public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null,
  provider text not null check (provider in ('openai', 'anthropic', 'microsoft_copilot')),
  display_name text not null,
  purpose text,
  instructions text,
  owner_user_id uuid references public.users(id) on delete set null,
  risk_tier text not null default 'standard' check (risk_tier in ('low', 'standard', 'elevated', 'high')),
  default_capabilities text[] not null default array[]::text[],
  policy_template text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists agent_profiles_org_status_idx
  on public.agent_profiles (organization_id, status);

alter table public.agent_profiles enable row level security;

drop trigger if exists set_agent_profiles_tenant_id on public.agent_profiles;
create trigger set_agent_profiles_tenant_id
  before insert on public.agent_profiles
  for each row
  execute function public.default_tenant_id_from_organization();

revoke all on public.agent_profiles from anon, authenticated;
grant select, insert, update on public.agent_profiles to service_role;

comment on table public.agent_profiles is 'Server-only reusable agent persona (provider, purpose, instructions, risk tier, default capabilities, optional policy template) a connection can be issued from. No authenticated API grant is provided.';

-- Backward-compatible link: existing connections keep working with agent_profile_id null.
alter table public.agent_connections
  add column if not exists agent_profile_id uuid references public.agent_profiles(id) on delete set null;

create table if not exists public.agent_pending_tool_calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null,
  agent_connection_id uuid not null references public.agent_connections(id) on delete cascade,
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  tool_name text not null,
  tool_version text not null default '1',
  provider text not null,
  arguments jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  status text not null default 'pending' check (status in ('pending', 'executed', 'rejected', 'failed')),
  decided_by_user_id uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  executed_at timestamptz,
  execution_result jsonb,
  created_at timestamptz not null default now(),
  unique (approval_request_id),
  unique (idempotency_key)
);

create index if not exists agent_pending_tool_calls_org_idx
  on public.agent_pending_tool_calls (organization_id);

alter table public.agent_pending_tool_calls enable row level security;

drop trigger if exists set_agent_pending_tool_calls_tenant_id on public.agent_pending_tool_calls;
create trigger set_agent_pending_tool_calls_tenant_id
  before insert on public.agent_pending_tool_calls
  for each row
  execute function public.default_tenant_id_from_organization();

revoke all on public.agent_pending_tool_calls from anon, authenticated;
grant select, insert, update on public.agent_pending_tool_calls to service_role;

comment on table public.agent_pending_tool_calls is 'Server-only machine-execution record for a critical MCP tool call awaiting human approval, linked 1:1 to an approval_requests row. PATCH /api/approvals/[id] transitions this row pending -> executed|rejected|failed via a compare-and-swap update (status=eq.pending in the WHERE clause) so an approval decision executes the underlying tool exactly once even under a concurrent double-decide. No authenticated API grant is provided.';
