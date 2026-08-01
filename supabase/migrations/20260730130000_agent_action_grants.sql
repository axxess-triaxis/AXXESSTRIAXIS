-- Agentic Infrastructure Phase 2 (2026-07-30): "Always Allow" persistence for the critical-tool
-- approval gate added in the MCP server's tools/call dispatch. A grant row means "this agent
-- connection may call this tool without a fresh approval_requests round trip" -- the tenant admin
-- opts in explicitly when deciding a pending approval (see the new
-- approvalRequestsRepository.decide() / PATCH /api/approvals/[id]), never by default. Mirrors
-- agent_connections' server-only access model (20260730120000_agent_connections.sql): no
-- authenticated grant, since both writing and checking grants happen exclusively in trusted
-- server code via the service role (the MCP route resolving a Bearer key, or an admin session
-- deciding an approval).

create table if not exists public.agent_action_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null,
  agent_connection_id uuid not null references public.agent_connections(id) on delete cascade,
  tool_name text not null,
  granted_by_user_id uuid references public.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (agent_connection_id, tool_name)
);

create index if not exists agent_action_grants_connection_tool_idx
  on public.agent_action_grants (agent_connection_id, tool_name)
  where revoked_at is null;

create index if not exists agent_action_grants_org_idx
  on public.agent_action_grants (organization_id);

alter table public.agent_action_grants enable row level security;

drop trigger if exists set_agent_action_grants_tenant_id on public.agent_action_grants;
create trigger set_agent_action_grants_tenant_id
  before insert on public.agent_action_grants
  for each row
  execute function public.default_tenant_id_from_organization();

revoke all on public.agent_action_grants from anon, authenticated;
grant select, insert, update on public.agent_action_grants to service_role;

comment on table public.agent_action_grants is 'Server-only "Always Allow" decisions for agent-issued critical tool calls (POST /api/agents/mcp). A row means the named tool may execute for this agent connection without a fresh approval_requests round trip. No authenticated API grant is provided.';
