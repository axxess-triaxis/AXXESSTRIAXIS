import { supabaseAdminRest } from "../../repositories/supabaseAdmin";
import { listGrants } from "./agentGrantsRepository";
import { listAgentConnections } from "./agentConnectionRepository";
import { listAgentProfiles } from "./agentProfileRepository";

type AuditLogRow = {
  id: string;
  action: string;
  category: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ApprovalRequestRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function activityStatus(metadata: Record<string, unknown>) {
  if (metadata.success === true) return "success";
  const errorMessage = readString(metadata.errorMessage);
  if (errorMessage === "pending_approval") return "pending";
  if (errorMessage?.toLowerCase().includes("capability")) return "denied";
  return "failure";
}

// MCP3-3: extracted from GET /api/agents/activity (unchanged data/shape from that MCP3-1 route) so
// POST /api/agents/export can build the same governance snapshot without duplicating the fetch/
// aggregation logic. Both routes are admin-role-gated by their own callers -- this function itself
// does no authorization, only organization-scoped data assembly.
export async function buildAgentGovernanceSnapshot(organizationId: string) {
  const [auditRows, approvalRows, activeGrants, connections, profiles] = await Promise.all([
    supabaseAdminRest<AuditLogRow[]>("audit_logs", {
      query: new URLSearchParams({
        select: "id,action,category,metadata,created_at",
        organization_id: `eq.${organizationId}`,
        category: "eq.agentic-infrastructure",
        order: "created_at.desc",
        limit: "100",
      }),
    }).catch(() => []),
    supabaseAdminRest<ApprovalRequestRow[]>("approval_requests", {
      query: new URLSearchParams({
        select: "id,title,status,priority,metadata,created_at",
        organization_id: `eq.${organizationId}`,
        order: "created_at.desc",
        limit: "100",
      }),
    }).catch(() => []),
    listGrants(organizationId).catch(() => []),
    listAgentConnections(organizationId).catch(() => []),
    listAgentProfiles(organizationId).catch(() => []),
  ]);

  const activity = auditRows.map((row) => {
    const metadata = row.metadata ?? {};
    const provider = readString(metadata.provider) ?? row.action.split(".")[1] ?? "unknown";
    const toolName = readString(metadata.toolName) ?? row.action.split(".").slice(-1)[0] ?? "unknown";
    return {
      id: row.id,
      provider,
      toolName,
      status: activityStatus(metadata),
      errorMessage: readString(metadata.errorMessage),
      agentConnectionId: readString(metadata.agentConnectionId),
      createdAt: row.created_at,
    };
  });

  const pendingApprovals = approvalRows
    .filter((row) => row.status === "pending" && readString(row.metadata?.agentConnectionId))
    .map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      provider: readString(row.metadata?.provider),
      toolName: readString(row.metadata?.toolName),
      agentConnectionId: readString(row.metadata?.agentConnectionId),
      createdAt: row.created_at,
    }));

  const callsByProvider: Record<string, number> = {};
  const callsByTool: Record<string, number> = {};
  for (const event of activity) {
    callsByProvider[event.provider] = (callsByProvider[event.provider] ?? 0) + 1;
    callsByTool[event.toolName] = (callsByTool[event.toolName] ?? 0) + 1;
  }

  // Governance-dashboard roster -- one row per connection, risk tier resolved through
  // agent_profile_id -> agent_profiles.risk_tier (agent_connections itself carries no risk tier of
  // its own). Sorted active-first, then most-recently-used first, so the roster reads top-down as
  // "what's live and busy" rather than insertion order.
  const profileRiskTierById = new Map(profiles.map((profile) => [profile.id, profile.riskTier]));
  const roster = [...connections]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "");
    })
    .map((connection) => ({
      connectionId: connection.id,
      label: connection.label,
      provider: connection.provider,
      status: connection.status,
      riskTier: connection.agentProfileId ? (profileRiskTierById.get(connection.agentProfileId) ?? "unassigned") : "unassigned",
      lastUsedAt: connection.lastUsedAt,
      agentProfileId: connection.agentProfileId,
    }));
  const activeConnections = connections.filter((connection) => connection.status === "active");

  // agent-originated approval_requests rows only (metadata.agentConnectionId present) -- split by
  // status instead of one conflated count.
  const agentApprovalRows = approvalRows.filter((row) => readString(row.metadata?.agentConnectionId));

  return {
    activity: activity.slice(0, 25),
    fullActivity: activity,
    pendingApprovals,
    roster,
    summary: {
      callsByProvider,
      callsByTool,
      failures: activity.filter((event) => event.status === "failure").length,
      denials: activity.filter((event) => event.status === "denied").length,
      pendingApprovals: pendingApprovals.length,
      approvalCount: agentApprovalRows.length,
      approvals: {
        approved: agentApprovalRows.filter((row) => row.status === "approved").length,
        rejected: agentApprovalRows.filter((row) => row.status === "rejected").length,
        pending: agentApprovalRows.filter((row) => row.status === "pending").length,
      },
      activeGrants: activeGrants.length,
      grantCount: activeGrants.length,
      activeAgents: activeConnections.length,
      activeProviders: new Set(activeConnections.map((connection) => connection.provider)).size,
    },
  };
}
