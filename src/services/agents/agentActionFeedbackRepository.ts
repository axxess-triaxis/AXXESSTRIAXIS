import { supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type AgentActionFeedbackSummary = {
  id: string;
  organizationId: string;
  auditLogId: string;
  agentConnectionId?: string;
  toolName: string;
  provider: string;
  rating?: number;
  flagged: boolean;
  flagReason?: string;
  submittedByUserId?: string;
  createdAt: string;
};

type AgentActionFeedbackRow = {
  id: string;
  organization_id: string;
  audit_log_id: string;
  agent_connection_id: string | null;
  tool_name: string;
  provider: string;
  rating: number | null;
  flagged: boolean;
  flag_reason: string | null;
  submitted_by_user_id: string | null;
  created_at: string;
};

const feedbackSelect = "id,organization_id,audit_log_id,agent_connection_id,tool_name,provider,rating,flagged,flag_reason,submitted_by_user_id,created_at";

function toSummary(row: AgentActionFeedbackRow): AgentActionFeedbackSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    auditLogId: row.audit_log_id,
    agentConnectionId: row.agent_connection_id ?? undefined,
    toolName: row.tool_name,
    provider: row.provider,
    rating: row.rating ?? undefined,
    flagged: row.flagged,
    flagReason: row.flag_reason ?? undefined,
    submittedByUserId: row.submitted_by_user_id ?? undefined,
    createdAt: row.created_at,
  };
}

// Rating and flagging are two independent, optional dimensions of the same submission -- a
// reviewer can rate without flagging, flag without rating, or both. At least one of the two must be
// present (enforced by the route, not here) so an empty feedback row is never created.
export async function createAgentActionFeedback(input: {
  organizationId: string;
  auditLogId: string;
  agentConnectionId?: string;
  toolName: string;
  provider: string;
  rating?: number;
  flagged?: boolean;
  flagReason?: string;
  submittedByUserId?: string;
}): Promise<AgentActionFeedbackSummary> {
  const rows = await supabaseAdminRest<AgentActionFeedbackRow[]>("agent_action_feedback", {
    method: "POST",
    prefer: "return=representation",
    body: {
      organization_id: input.organizationId,
      audit_log_id: input.auditLogId,
      agent_connection_id: input.agentConnectionId ?? null,
      tool_name: input.toolName,
      provider: input.provider,
      rating: input.rating ?? null,
      flagged: Boolean(input.flagged),
      flag_reason: input.flagReason ?? null,
      submitted_by_user_id: input.submittedByUserId ?? null,
    },
  });
  const row = rows?.[0];
  if (!row) throw new Error("Agent action feedback was not returned by Supabase.");
  return toSummary(row);
}

export async function listAgentActionFeedback(organizationId: string, options: { flaggedOnly?: boolean } = {}): Promise<AgentActionFeedbackSummary[]> {
  const query = new URLSearchParams({
    select: feedbackSelect,
    organization_id: `eq.${organizationId}`,
    order: "created_at.desc",
    limit: "100",
  });
  if (options.flaggedOnly) query.set("flagged", "eq.true");

  const rows = await supabaseAdminRest<AgentActionFeedbackRow[]>("agent_action_feedback", { method: "GET", query });
  return (rows ?? []).map(toSummary);
}
