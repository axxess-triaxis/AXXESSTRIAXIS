import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { revokeAgentProfile, updateAgentProfile } from "../../../../../services/agents/agentProfileRepository";
import { normalizeAgentCapabilities } from "../../../../../security/agentScope";

const adminRoles = ["Super Admin", "Organization Admin"];
const riskTiers = ["low", "standard", "elevated", "high"];

async function requireAdminSession(): Promise<
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>> }
  | { ok: false; error: NextResponse }
> {
  const session = await getServerAuthSession(true);
  if (!session) return { ok: false, error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  if (!adminRoles.includes(session.user.role)) {
    return { ok: false, error: NextResponse.json({ error: "Only organization admins can manage agent profiles." }, { status: 403 }) };
  }
  return { ok: true, session };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;

  const body = await request.json().catch(() => null) as {
    displayName?: string;
    purpose?: string;
    instructions?: string;
    riskTier?: string;
    capabilities?: unknown;
  } | null;
  if (body?.riskTier && !riskTiers.includes(body.riskTier)) {
    return NextResponse.json({ error: `riskTier must be one of: ${riskTiers.join(", ")}` }, { status: 400 });
  }
  if (Array.isArray(body?.capabilities)) {
    const normalized = normalizeAgentCapabilities(body.capabilities);
    if (normalized.length !== body.capabilities.length) {
      return NextResponse.json({ error: "capabilities contains an unsupported tool capability." }, { status: 400 });
    }
  }

  const profile = await updateAgentProfile({
    organizationId: authResult.session.user.organizationId,
    profileId: id,
    displayName: body?.displayName?.trim() || undefined,
    purpose: body?.purpose,
    instructions: body?.instructions,
    riskTier: body?.riskTier as "low" | "standard" | "elevated" | "high" | undefined,
    capabilities: body?.capabilities,
  });
  return NextResponse.json({ profile });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;

  await revokeAgentProfile(authResult.session.user.organizationId, id);
  return NextResponse.json({ ok: true });
}
