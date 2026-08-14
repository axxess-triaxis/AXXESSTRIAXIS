import { supabaseAdminRest } from "../../repositories/supabaseAdmin";
import { getAgentPolicyTemplate } from "./agentPolicyTemplates";
import { normalizeAgentCapabilities, type AgentCapability, type AgentProviderId } from "../../security/agentScope";

export type AgentProfileRiskTier = "low" | "standard" | "elevated" | "high";

export type AgentProfileSummary = {
  id: string;
  organizationId: string;
  provider: AgentProviderId;
  displayName: string;
  purpose?: string;
  instructions?: string;
  ownerUserId?: string;
  riskTier: AgentProfileRiskTier;
  defaultCapabilities: AgentCapability[];
  policyTemplate?: string;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt?: string;
};

type AgentProfileRow = {
  id: string;
  organization_id: string;
  provider: AgentProviderId;
  display_name: string;
  purpose: string | null;
  instructions: string | null;
  owner_user_id: string | null;
  risk_tier: AgentProfileRiskTier;
  default_capabilities: AgentCapability[];
  policy_template: string | null;
  status: "active" | "revoked";
  created_at: string;
  revoked_at: string | null;
};

const profileSelect = "id,organization_id,provider,display_name,purpose,instructions,owner_user_id,risk_tier,default_capabilities,policy_template,status,created_at,revoked_at";

function toSummary(row: AgentProfileRow): AgentProfileSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    displayName: row.display_name,
    purpose: row.purpose ?? undefined,
    instructions: row.instructions ?? undefined,
    ownerUserId: row.owner_user_id ?? undefined,
    riskTier: row.risk_tier,
    defaultCapabilities: row.default_capabilities,
    policyTemplate: row.policy_template ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    revokedAt: row.revoked_at ?? undefined,
  };
}

// Resolves the profile's default_capabilities from either an explicit capabilities array (takes
// precedence, same "explicit wins" convention as createAgentConnection's own capabilities param)
// or a named policy template (agentPolicyTemplates.ts). Neither given -> empty array, same as a
// bare connection with no capabilities ever grants nothing extra by accident.
function resolveDefaultCapabilities(input: { capabilities?: unknown; policyTemplateId?: string }): AgentCapability[] {
  const explicit = normalizeAgentCapabilities(input.capabilities);
  if (explicit.length) return explicit;
  const template = input.policyTemplateId ? getAgentPolicyTemplate(input.policyTemplateId) : undefined;
  return template ? [...template.capabilities] : [];
}

export async function createAgentProfile(input: {
  organizationId: string;
  provider: AgentProviderId;
  displayName: string;
  purpose?: string;
  instructions?: string;
  ownerUserId?: string;
  riskTier?: AgentProfileRiskTier;
  capabilities?: unknown;
  policyTemplateId?: string;
}): Promise<AgentProfileSummary> {
  const defaultCapabilities = resolveDefaultCapabilities(input);
  const rows = await supabaseAdminRest<AgentProfileRow[]>("agent_profiles", {
    method: "POST",
    prefer: "return=representation",
    body: {
      organization_id: input.organizationId,
      provider: input.provider,
      display_name: input.displayName,
      purpose: input.purpose ?? null,
      instructions: input.instructions ?? null,
      owner_user_id: input.ownerUserId ?? null,
      risk_tier: input.riskTier ?? "standard",
      default_capabilities: defaultCapabilities,
      policy_template: input.policyTemplateId ?? null,
      status: "active",
    },
  });
  const row = rows?.[0];
  if (!row) throw new Error("Agent profile was not returned by Supabase.");
  return toSummary(row);
}

export async function listAgentProfiles(organizationId: string): Promise<AgentProfileSummary[]> {
  const rows = await supabaseAdminRest<AgentProfileRow[]>("agent_profiles", {
    method: "GET",
    query: new URLSearchParams({
      select: profileSelect,
      organization_id: `eq.${organizationId}`,
      order: "created_at.desc",
    }),
  });
  return (rows ?? []).map(toSummary);
}

export async function getAgentProfile(organizationId: string, profileId: string): Promise<AgentProfileSummary | undefined> {
  const rows = await supabaseAdminRest<AgentProfileRow[]>("agent_profiles", {
    method: "GET",
    query: new URLSearchParams({
      select: profileSelect,
      id: `eq.${profileId}`,
      organization_id: `eq.${organizationId}`,
      limit: "1",
    }),
  });
  const row = rows?.[0];
  return row ? toSummary(row) : undefined;
}

export async function updateAgentProfile(input: {
  organizationId: string;
  profileId: string;
  displayName?: string;
  purpose?: string;
  instructions?: string;
  riskTier?: AgentProfileRiskTier;
  capabilities?: unknown;
}): Promise<AgentProfileSummary> {
  const body: Record<string, unknown> = {};
  if (input.displayName !== undefined) body.display_name = input.displayName;
  if (input.purpose !== undefined) body.purpose = input.purpose;
  if (input.instructions !== undefined) body.instructions = input.instructions;
  if (input.riskTier !== undefined) body.risk_tier = input.riskTier;
  if (input.capabilities !== undefined) body.default_capabilities = normalizeAgentCapabilities(input.capabilities);

  const rows = await supabaseAdminRest<AgentProfileRow[]>("agent_profiles", {
    method: "PATCH",
    query: new URLSearchParams({
      id: `eq.${input.profileId}`,
      organization_id: `eq.${input.organizationId}`,
    }),
    body,
  });
  const row = rows?.[0];
  if (!row) throw new Error("Agent profile was not found for this organization.");
  return toSummary(row);
}

export async function revokeAgentProfile(organizationId: string, profileId: string): Promise<void> {
  await supabaseAdminRest("agent_profiles", {
    method: "PATCH",
    query: new URLSearchParams({
      id: `eq.${profileId}`,
      organization_id: `eq.${organizationId}`,
    }),
    body: { status: "revoked", revoked_at: new Date().toISOString() },
  });
}
