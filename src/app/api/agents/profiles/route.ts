import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { createAgentProfile, listAgentProfiles } from "../../../../services/agents/agentProfileRepository";
import { isAgentPolicyTemplateId } from "../../../../services/agents/agentPolicyTemplates";
import { agentProviderIds, normalizeAgentCapabilities, type AgentProviderId } from "../../../../security/agentScope";

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

// MCP3-2: agent_profiles CRUD (list/create), mirroring the admin-role/session gate already
// established by src/app/api/agents/connections/route.ts.
export async function GET() {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;

  const profiles = await listAgentProfiles(authResult.session.user.organizationId);
  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const authResult = await requireAdminSession();
  if (!authResult.ok) return authResult.error;
  const { session } = authResult;

  const body = await request.json().catch(() => null) as {
    provider?: string;
    displayName?: string;
    purpose?: string;
    instructions?: string;
    riskTier?: string;
    capabilities?: unknown;
    policyTemplateId?: string;
  } | null;

  const provider = body?.provider as AgentProviderId | undefined;
  if (!provider || !agentProviderIds.includes(provider)) {
    return NextResponse.json({ error: `provider must be one of: ${agentProviderIds.join(", ")}` }, { status: 400 });
  }
  const displayName = body?.displayName?.trim();
  if (!displayName) return NextResponse.json({ error: "displayName is required." }, { status: 400 });
  if (body?.riskTier && !riskTiers.includes(body.riskTier)) {
    return NextResponse.json({ error: `riskTier must be one of: ${riskTiers.join(", ")}` }, { status: 400 });
  }
  if (body?.policyTemplateId && !isAgentPolicyTemplateId(body.policyTemplateId)) {
    return NextResponse.json({ error: "policyTemplateId is not a recognized policy template." }, { status: 400 });
  }
  if (Array.isArray(body?.capabilities)) {
    const normalized = normalizeAgentCapabilities(body.capabilities);
    if (normalized.length !== body.capabilities.length) {
      return NextResponse.json({ error: "capabilities contains an unsupported tool capability." }, { status: 400 });
    }
  }

  const profile = await createAgentProfile({
    organizationId: session.user.organizationId,
    provider,
    displayName,
    purpose: body?.purpose?.trim() || undefined,
    instructions: body?.instructions?.trim() || undefined,
    ownerUserId: session.user.id,
    riskTier: body?.riskTier as "low" | "standard" | "elevated" | "high" | undefined,
    capabilities: body?.capabilities,
    policyTemplateId: body?.policyTemplateId,
  });
  return NextResponse.json({ profile }, { status: 201 });
}
