import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { createAgentActionFeedback, listAgentActionFeedback } from "../../../../services/agents/agentActionFeedbackRepository";

// MCP3-3: same admin-only gate as GET /api/agents/activity -- the Agent Activity feed this feedback
// attaches to is itself only ever rendered inside AgentConnectionsPanel's canManage-gated view, so
// there is no case where a non-admin can see a row to rate/flag in the first place. Keeping both
// verbs on the same role set avoids an inconsistent "can submit but can't see the feed" state.
const adminRoles = ["Super Admin", "Organization Admin"];

async function requireAdminSession(): Promise<
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>> }
  | { ok: false; error: NextResponse }
> {
  const session = await getServerAuthSession(true);
  if (!session) return { ok: false, error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  if (!adminRoles.includes(session.user.role)) {
    return { ok: false, error: NextResponse.json({ error: "Only organization admins can review agent activity." }, { status: 403 }) };
  }
  return { ok: true, session };
}

export async function GET(request: Request) {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;

  const flaggedOnly = new URL(request.url).searchParams.get("flaggedOnly") === "true";
  const feedback = await listAgentActionFeedback(authResult.session.user.organizationId, { flaggedOnly });
  return NextResponse.json({ feedback });
}

export async function POST(request: Request) {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;
  const { session } = authResult;

  const body = await request.json().catch(() => null) as {
    auditLogId?: string;
    agentConnectionId?: string;
    toolName?: string;
    provider?: string;
    rating?: number;
    flagged?: boolean;
    flagReason?: string;
  } | null;

  const auditLogId = body?.auditLogId?.trim();
  const toolName = body?.toolName?.trim();
  const provider = body?.provider?.trim();
  if (!auditLogId || !toolName || !provider) {
    return NextResponse.json({ error: "auditLogId, toolName, and provider are required." }, { status: 400 });
  }
  if (body?.rating !== undefined && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) {
    return NextResponse.json({ error: "rating must be an integer between 1 and 5." }, { status: 400 });
  }
  const flagged = Boolean(body?.flagged);
  if (flagged && !body?.flagReason?.trim()) {
    return NextResponse.json({ error: "flagReason is required when flagging an action." }, { status: 400 });
  }
  if (!flagged && body?.rating === undefined) {
    return NextResponse.json({ error: "Provide a rating, a flag with a reason, or both." }, { status: 400 });
  }

  const feedback = await createAgentActionFeedback({
    organizationId: session.user.organizationId,
    auditLogId,
    agentConnectionId: body?.agentConnectionId,
    toolName,
    provider,
    rating: body?.rating,
    flagged,
    flagReason: flagged ? body?.flagReason?.trim() : undefined,
    submittedByUserId: session.user.id,
  });
  return NextResponse.json({ feedback }, { status: 201 });
}
