-- MCP3-3 (2026-08-14): human feedback (1-5 rating and/or an unsafe/wrong flag with a reason) against
-- a specific past agent tool call. References audit_logs.id directly -- GET /api/agents/activity
-- already returns that exact id per activity row (queried straight from audit_logs, not synthesized),
-- so no new id-plumbing was needed to make a past call referenceable.
--
-- Same isolation model as every other agent table this program has added (agent_connections,
-- agent_action_grants, agent_profiles, agent_pending_tool_calls): RLS enabled, no policies, explicit
-- revoke of anon/authenticated, service-role-only access. src/app/api/agents/feedback/route.ts
-- enforces organization scoping and admin-only visibility in application code, matching every other
-- route in this module -- kept consistent with this module's own established pattern rather than the
-- unrelated beta_feedback table's authenticated-RLS approach, since every other agent-governance
-- table already uses this shape.

create table if not exists public.agent_action_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null,
  audit_log_id uuid not null references public.audit_logs(id) on delete cascade,
  agent_connection_id uuid references public.agent_connections(id) on delete set null,
  tool_name text not null,
  provider text not null,
  rating smallint check (rating between 1 and 5),
  flagged boolean not null default false,
  flag_reason text,
  submitted_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists agent_action_feedback_org_idx
  on public.agent_action_feedback (organization_id, created_at desc);

create index if not exists agent_action_feedback_audit_log_idx
  on public.agent_action_feedback (audit_log_id);

create index if not exists agent_action_feedback_flagged_idx
  on public.agent_action_feedback (organization_id, flagged)
  where flagged = true;

alter table public.agent_action_feedback enable row level security;

drop trigger if exists set_agent_action_feedback_tenant_id on public.agent_action_feedback;
create trigger set_agent_action_feedback_tenant_id
  before insert on public.agent_action_feedback
  for each row
  execute function public.default_tenant_id_from_organization();

revoke all on public.agent_action_feedback from anon, authenticated;
grant select, insert on public.agent_action_feedback to service_role;

comment on table public.agent_action_feedback is 'Server-only human feedback (rating and/or unsafe/wrong flag) against a specific agent tool call, referenced by audit_logs.id. No authenticated API grant is provided -- POST/GET /api/agents/feedback enforce organization scoping and admin-only visibility in application code.';
