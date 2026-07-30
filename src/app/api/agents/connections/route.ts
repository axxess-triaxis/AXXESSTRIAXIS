import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { createAgentConnection, listAgentConnections, revokeAgentConnection } from "../../../../services/agents/agentConnectionRepository";
import { agentProviderIds, type AgentProviderId } from "../../../../security/agentScope";

const adminRoles = ["Super Admin", "Organization Admin"];

async function requireAdminSession(): Promise<
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>> }
  | { ok: false; error: NextResponse }
> {
  const session = await getServerAuthSession(true);
  if (!session) return { ok: false, error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  if (!adminRoles.includes(session.user.role)) {
    return { ok: false, error: NextResponse.json({ error: "Only organization admins can manage agent connections." }, { status: 403 }) };
  }
  return { ok: true, session };
}

export async function GET() {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;

  const connections = await listAgentConnections(authResult.session.user.organizationId);
  return NextResponse.json({ connections });
}

export async function POST(request: Request) {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;
  const { session } = authResult;

  const body = await request.json().catch(() => null) as { provider?: string; label?: string } | null;
  const provider = body?.provider as AgentProviderId | undefined;
  if (!provider || !agentProviderIds.includes(provider)) {
    return NextResponse.json({ error: `provider must be one of: ${agentProviderIds.join(", ")}` }, { status: 400 });
  }

  const { connection, rawApiKey } = await createAgentConnection({
    organizationId: session.user.organizationId,
    provider,
    label: body?.label?.trim() || provider,
    issuedByUserId: session.user.id,
    issuedByRole: session.user.role,
  });

  // rawApiKey is returned exactly once here -- it is never persisted (only its hash is) and this
  // response is the only opportunity the tenant admin has to copy it.
  return NextResponse.json({ connection, rawApiKey }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  await revokeAgentConnection(authResult.session.user.organizationId, id);
  return NextResponse.json({ ok: true });
}
