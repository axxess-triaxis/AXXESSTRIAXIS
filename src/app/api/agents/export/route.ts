import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { buildAgentGovernanceSnapshot } from "../../../../services/agents/agentGovernanceSnapshot";

const adminRoles = ["Super Admin", "Organization Admin"];

function csvEscape(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

// MCP3-3: no PDF or ZIP export exists anywhere in this repo (confirmed by a read-only search before
// this route was written) -- this returns JSON and CSV only, matching the two real export patterns
// already established elsewhere (ApprovalsSection.tsx's client-side JSON Blob download,
// /api/audit-exports's server-generated CSV-string-in-JSON-response). It deliberately does not claim
// PDF/ZIP support anywhere in its response or the UI that calls it.
export async function POST() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Only organization admins can export agent governance data." }, { status: 403 });
  }

  const organizationId = session.user.organizationId;
  const { fullActivity, roster, summary } = await buildAgentGovernanceSnapshot(organizationId);

  const csvHeader = ["created_at", "provider", "tool_name", "status", "agent_connection_id", "error_message"];
  const csvRows = fullActivity.map((event) => [event.createdAt, event.provider, event.toolName, event.status, event.agentConnectionId ?? "", event.errorMessage ?? ""]);
  const csv = [csvHeader, ...csvRows].map((row) => row.map(csvEscape).join(",")).join("\n");

  const exportedAt = new Date().toISOString();
  const json = { exportedAt, organizationId, summary, roster, activity: fullActivity };

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const auditLog = await auditLogsRepository.record(scope, {
    action: "agent_governance.export",
    resourceType: "agent_governance_report",
    category: "agentic-infrastructure",
    metadata: { activityCount: fullActivity.length, rosterCount: roster.length, exportedAt },
  }).catch(() => undefined);

  return NextResponse.json({
    fileNamePrefix: "axxess-agent-governance",
    exportedAt,
    json,
    csv,
    auditLogId: auditLog?.id,
  });
}
