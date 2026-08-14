import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";
import { agentApiKeyHashMatches, generateAgentApiKey, hashAgentApiKey } from "./agentConnectionVault";
import { defaultAgentCapabilities, normalizeAgentCapabilities, type AgentCapability, type AgentProviderId, type AgentScope } from "../../security/agentScope";

export type AgentConnectionSummary = {
  id: string;
  organizationId: string;
  provider: AgentProviderId;
  label: string;
  apiKeyPrefix: string;
  capabilities: AgentCapability[];
  status: "active" | "revoked";
  issuedByUserId?: string;
  issuedByRole?: string;
  lastUsedAt?: string;
  createdAt: string;
  revokedAt?: string;
};

type AgentConnectionRow = {
  id: string;
  organization_id: string;
  provider: AgentProviderId;
  label: string;
  api_key_hash: string;
  api_key_prefix: string;
  capabilities: AgentCapability[];
  status: "active" | "revoked";
  issued_by_user_id: string | null;
  issued_by_role: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

const summarySelect = "id,organization_id,provider,label,api_key_prefix,capabilities,status,issued_by_user_id,issued_by_role,last_used_at,created_at,revoked_at";

function toSummary(row: AgentConnectionRow): AgentConnectionSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    label: row.label,
    apiKeyPrefix: row.api_key_prefix,
    capabilities: row.capabilities,
    status: row.status,
    issuedByUserId: row.issued_by_user_id ?? undefined,
    issuedByRole: row.issued_by_role ?? undefined,
    lastUsedAt: row.last_used_at ?? undefined,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? undefined,
  };
}

export async function createAgentConnection(input: {
  organizationId: string;
  provider: AgentProviderId;
  label: string;
  issuedByUserId: string;
  issuedByRole: string;
  capabilities?: AgentCapability[];
}, env: NodeJS.ProcessEnv = process.env): Promise<{ connection: AgentConnectionSummary; rawApiKey: string }> {
  const { rawKey, prefix } = generateAgentApiKey();
  const rows = await supabaseAdminRest<AgentConnectionRow[]>("agent_connections", {
    method: "POST",
    prefer: "return=representation",
    body: {
      organization_id: input.organizationId,
      provider: input.provider,
      label: input.label,
      api_key_hash: hashAgentApiKey(rawKey, env),
      api_key_prefix: prefix,
      capabilities: input.capabilities?.length ? input.capabilities : defaultAgentCapabilities,
      status: "active",
      issued_by_user_id: input.issuedByUserId,
      issued_by_role: input.issuedByRole,
    },
  });
  const row = rows?.[0];
  if (!row) throw new Error("Agent connection was not returned by Supabase.");
  return { connection: toSummary(row), rawApiKey: rawKey };
}

export async function updateAgentConnectionCapabilities(input: {
  organizationId: string;
  connectionId: string;
  capabilities: unknown;
}): Promise<AgentConnectionSummary> {
  const capabilities = normalizeAgentCapabilities(input.capabilities);
  const rows = await supabaseAdminRest<AgentConnectionRow[]>("agent_connections", {
    method: "PATCH",
    query: new URLSearchParams({
      id: `eq.${input.connectionId}`,
      organization_id: `eq.${input.organizationId}`,
    }),
    body: { capabilities },
  });
  const row = rows?.[0];
  if (!row) throw new Error("Agent connection was not found for this organization.");
  return toSummary(row);
}

export async function listAgentConnections(organizationId: string): Promise<AgentConnectionSummary[]> {
  const rows = await supabaseAdminRest<AgentConnectionRow[]>("agent_connections", {
    method: "GET",
    query: new URLSearchParams({
      select: summarySelect,
      organization_id: `eq.${organizationId}`,
      order: "created_at.desc",
    }),
  });
  return (rows ?? []).map(toSummary);
}

export async function revokeAgentConnection(organizationId: string, connectionId: string): Promise<void> {
  await supabaseAdminRest("agent_connections", {
    method: "PATCH",
    query: new URLSearchParams({
      id: `eq.${connectionId}`,
      organization_id: `eq.${organizationId}`,
    }),
    body: { status: "revoked", revoked_at: new Date().toISOString() },
  });
}

/**
 * Resolves a raw Bearer API key to its AgentScope. Returns undefined for any key that doesn't
 * hash-match an active connection -- callers must treat that as unauthenticated, not as "agent
 * with zero capabilities", to avoid a confused-deputy path.
 */
export async function resolveAgentScopeFromApiKey(rawKey: string, env: NodeJS.ProcessEnv = process.env): Promise<AgentScope | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const candidateHash = hashAgentApiKey(rawKey, env);

  const rows = await supabaseAdminRest<AgentConnectionRow[]>("agent_connections", {
    method: "GET",
    query: new URLSearchParams({
      select: `${summarySelect},api_key_hash`,
      api_key_hash: `eq.${candidateHash}`,
      status: `eq.active`,
      limit: "1",
    }),
  });
  const row = rows?.[0];
  if (!row || !agentApiKeyHashMatches(candidateHash, row.api_key_hash)) return undefined;

  await supabaseAdminRest("agent_connections", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${row.id}` }),
    body: { last_used_at: new Date().toISOString() },
    prefer: "return=minimal",
  }).catch(() => undefined);

  return {
    organizationId: row.organization_id,
    agentConnectionId: row.id,
    provider: row.provider,
    capabilities: row.capabilities,
    issuedByUserId: row.issued_by_user_id ?? undefined,
    issuedByRole: row.issued_by_role ?? undefined,
  };
}

/**
 * Writes one audit_logs row per MCP tool call, success or failure -- distinct from
 * auditLogsRepository.record (repositories/supabaseEnterpriseRepositories.ts), which requires a
 * human Supabase access token an inbound agent call never has. Uses the same table/columns via
 * the service role, matching the write-directly-via-supabaseAdminRest pattern already established
 * in src/app/api/connectors/oauth/callback/route.ts.
 */
export async function recordAgentToolAuditEvent(scope: AgentScope, input: {
  toolName: string;
  success: boolean;
  errorMessage?: string;
  argsSummary?: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdminRest("audit_logs", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      organization_id: scope.organizationId,
      actor_user_id: scope.issuedByUserId ?? null,
      actor_role: scope.issuedByRole ?? null,
      action: `agent.${scope.provider}.tool.${input.toolName}`,
      resource_type: "agent_tool_call",
      category: "agentic-infrastructure",
      metadata: {
        agentConnectionId: scope.agentConnectionId,
        provider: scope.provider,
        toolName: input.toolName,
        success: input.success,
        errorMessage: input.errorMessage,
        args: input.argsSummary,
      },
    },
  }).catch(() => undefined);
}
