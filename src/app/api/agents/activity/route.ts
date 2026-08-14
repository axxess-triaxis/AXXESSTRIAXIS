import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import { listGrants } from "../../../../services/agents/agentGrantsRepository";

const adminRoles = ["Super Admin", "Organization Admin"];

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

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!adminRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Only organization admins can view agent activity." }, { status: 403 });
  }

  const organizationId = session.user.organizationId;
  const [auditRows, approvalRows, activeGrants] = await Promise.all([
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

  return NextResponse.json({
    activity: activity.slice(0, 25),
    pendingApprovals,
    summary: {
      callsByProvider,
      callsByTool,
      failures: activity.filter((event) => event.status === "failure").length,
      denials: activity.filter((event) => event.status === "denied").length,
      pendingApprovals: pendingApprovals.length,
      approvalCount: approvalRows.filter((row) => readString(row.metadata?.agentConnectionId)).length,
      activeGrants: activeGrants.length,
      grantCount: activeGrants.length,
    },
  });
}
