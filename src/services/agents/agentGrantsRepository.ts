import { supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type AgentActionGrant = {
  id: string;
  organizationId: string;
  agentConnectionId: string;
  toolName: string;
  grantedByUserId?: string;
  grantedAt: string;
};

type AgentActionGrantRow = {
  id: string;
  organization_id: string;
  agent_connection_id: string;
  tool_name: string;
  granted_by_user_id: string | null;
  granted_at: string;
  revoked_at: string | null;
};

const activeSelect = "id,organization_id,agent_connection_id,tool_name,granted_by_user_id,granted_at,revoked_at";

function toGrant(row: AgentActionGrantRow): AgentActionGrant {
  return {
    id: row.id,
    organizationId: row.organization_id,
    agentConnectionId: row.agent_connection_id,
    toolName: row.tool_name,
    grantedByUserId: row.granted_by_user_id ?? undefined,
    grantedAt: row.granted_at,
  };
}

/** Whether an active (non-revoked) "Always Allow" grant exists for this connection+tool. */
export async function hasGrant(agentConnectionId: string, toolName: string): Promise<boolean> {
  const rows = await supabaseAdminRest<AgentActionGrantRow[]>("agent_action_grants", {
    query: new URLSearchParams({
      select: "id",
      agent_connection_id: `eq.${agentConnectionId}`,
      tool_name: `eq.${toolName}`,
      revoked_at: "is.null",
      limit: "1",
    }),
  });
  return (rows?.length ?? 0) > 0;
}

/** Creates (or re-activates a previously revoked) grant. */
export async function createGrant(input: {
  organizationId: string;
  agentConnectionId: string;
  toolName: string;
  grantedByUserId: string;
}): Promise<AgentActionGrant> {
  const rows = await supabaseAdminRest<AgentActionGrantRow[]>("agent_action_grants", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "agent_connection_id,tool_name" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: input.organizationId,
      agent_connection_id: input.agentConnectionId,
      tool_name: input.toolName,
      granted_by_user_id: input.grantedByUserId,
      granted_at: new Date().toISOString(),
      revoked_at: null,
    },
  });
  const row = rows?.[0];
  if (!row) throw new Error("Agent action grant was not returned by Supabase.");
  return toGrant(row);
}

export async function listGrants(organizationId: string, agentConnectionId?: string): Promise<AgentActionGrant[]> {
  const params = new URLSearchParams({
    select: activeSelect,
    organization_id: `eq.${organizationId}`,
    revoked_at: "is.null",
    order: "granted_at.desc",
  });
  if (agentConnectionId) params.set("agent_connection_id", `eq.${agentConnectionId}`);
  const rows = await supabaseAdminRest<AgentActionGrantRow[]>("agent_action_grants", { query: params });
  return (rows ?? []).map(toGrant);
}

export async function revokeGrant(organizationId: string, grantId: string): Promise<void> {
  await supabaseAdminRest("agent_action_grants", {
    method: "PATCH",
    query: new URLSearchParams({
      id: `eq.${grantId}`,
      organization_id: `eq.${organizationId}`,
    }),
    body: { revoked_at: new Date().toISOString() },
  });
}
