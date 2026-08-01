-- Agentic Infrastructure Phase 1 (2026-07-30): inbound MCP server access for external AI agent
-- platforms (OpenAI, Anthropic, Microsoft Copilot). A tenant issues an AXXESS API key per
-- provider connection; the raw key is shown once and never stored -- only its one-way hash
-- (same scrypt-fingerprint pattern enterpriseConnectorVault.ts already uses for payloadHash in
-- 20260721170000_enterprise_connector_credentials.sql) is persisted, so this table cannot leak a
-- usable credential even if read. Server-only: no authenticated grant, matching the existing
-- enterprise_connector_credentials access model -- both key issuance (human session) and key
-- validation (inbound MCP calls) happen exclusively in trusted server code via the service role.
--
-- issued_by_user_id/issued_by_role snapshot the human who generated the key at issuance time, so
-- that the agent's later writes (e.g. create_task) can honestly attribute created_by_user_id and
-- owner_role to a real person who authorized the connection, rather than fabricating a role.

create table if not exists public.agent_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null,
  provider text not null check (provider in ('openai', 'anthropic', 'microsoft_copilot')),
  label text not null default '',
  api_key_hash text not null unique,
  api_key_prefix text not null,
  capabilities text[] not null default array['create_task', 'query_knowledge_hub', 'list_projects']::text[],
  status text not null default 'active' check (status in ('active', 'revoked')),
  issued_by_user_id uuid references public.users(id) on delete set null,
  issued_by_role text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists agent_connections_org_status_idx
  on public.agent_connections (organization_id, status);

create unique index if not exists agent_connections_api_key_hash_idx
  on public.agent_connections (api_key_hash);

alter table public.agent_connections enable row level security;

drop trigger if exists set_agent_connections_tenant_id on public.agent_connections;
create trigger set_agent_connections_tenant_id
  before insert on public.agent_connections
  for each row
  execute function public.default_tenant_id_from_organization();

revoke all on public.agent_connections from anon, authenticated;
grant select, insert, update on public.agent_connections to service_role;

comment on table public.agent_connections is 'Server-only inbound agent (OpenAI/Anthropic/Microsoft Copilot) API key registry for the MCP server at /api/agents/mcp. Stores a one-way hash only -- the raw key is never persisted. No authenticated API grant is provided.';
