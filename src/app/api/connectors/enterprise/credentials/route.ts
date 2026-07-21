import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../../repositories/supabaseAdmin";
import {
  enterpriseConnectorProviders,
  getEnterpriseConnectorVaultMissingConfiguration,
  isEnterpriseConnectorVaultConfigured,
  sealEnterpriseConnectorCredentials,
  type EnterpriseConnectorProviderId,
} from "../../../../../services/integrations/enterpriseConnectorVault";

function isEnterpriseConnectorProviderId(value: string): value is EnterpriseConnectorProviderId {
  return value in enterpriseConnectorProviders;
}

function canConfigure(role: string) {
  return role === "Super Admin" || role === "Organization Admin";
}

type CredentialRow = {
  id: string;
  provider_id: EnterpriseConnectorProviderId;
  status: string;
  created_at: string;
  updated_at: string;
  last_tested_at: string | null;
};

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ providers: Object.keys(enterpriseConnectorProviders), connections: [] });
  }

  const rows = await supabaseAdminRest<CredentialRow[]>("enterprise_connector_credentials", {
    query: new URLSearchParams({
      select: "id,provider_id,status,created_at,updated_at,last_tested_at",
      organization_id: `eq.${session.user.organizationId}`,
    }),
  }).catch(() => []);

  return NextResponse.json({
    providers: Object.entries(enterpriseConnectorProviders).map(([providerId, definition]) => ({
      providerId,
      displayName: definition.displayName,
      category: definition.category,
      purpose: definition.purpose,
      credentialFields: definition.credentialFields,
    })),
    connections: rows,
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canConfigure(session.user.role)) {
    return NextResponse.json({ error: "Only Organization Admins can configure enterprise connectors." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { providerId?: string; credentials?: Record<string, string> };
  if (!body.providerId || !isEnterpriseConnectorProviderId(body.providerId)) {
    return NextResponse.json({ error: "Unsupported enterprise connector provider." }, { status: 400 });
  }
  const definition = enterpriseConnectorProviders[body.providerId];
  const missingFields = definition.credentialFields.filter((field) => !body.credentials?.[field.key]?.trim());
  if (missingFields.length > 0) {
    return NextResponse.json({ error: `Missing required field(s): ${missingFields.map((field) => field.label).join(", ")}.` }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured() || !isEnterpriseConnectorVaultConfigured()) {
    return NextResponse.json({
      status: "provider_gated",
      missing: [...getEnterpriseConnectorVaultMissingConfiguration(), !isSupabaseAdminConfigured() ? "SUPABASE_SERVICE_ROLE_KEY" : undefined].filter(Boolean),
      message: "Supabase service role access and AXXESS_TOKEN_VAULT_KEY are required before enterprise connector credentials can be stored.",
    }, { status: 400 });
  }

  const sealed = sealEnterpriseConnectorCredentials({
    providerId: body.providerId,
    organizationId: session.user.organizationId,
    credentials: body.credentials!,
  });

  const rows = await supabaseAdminRest<CredentialRow[]>("enterprise_connector_credentials", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,provider_id" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: session.user.organizationId,
      configured_by_user_id: session.user.id,
      provider_id: sealed.providerId,
      encrypted_payload: sealed.encryptedPayload,
      algorithm: sealed.algorithm,
      key_id: sealed.keyId,
      payload_hash: sealed.payloadHash,
      status: "configured",
      updated_at: new Date().toISOString(),
    },
  });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await auditLogsRepository.record(scope, {
    action: `connector.${sealed.providerId}.credentials.configured`,
    resourceType: "enterprise_connector_credential",
    resourceId: rows?.[0]?.id,
    category: "integrations",
    metadata: { providerId: sealed.providerId },
  }).catch(() => undefined);

  return NextResponse.json({ connection: rows?.[0] }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canConfigure(session.user.role)) {
    return NextResponse.json({ error: "Only Organization Admins can configure enterprise connectors." }, { status: 403 });
  }

  const url = new URL(request.url);
  const providerId = url.searchParams.get("providerId") ?? "";
  if (!isEnterpriseConnectorProviderId(providerId)) {
    return NextResponse.json({ error: "Unsupported enterprise connector provider." }, { status: 400 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin runtime is required." }, { status: 400 });
  }

  await supabaseAdminRest("enterprise_connector_credentials", {
    method: "PATCH",
    query: new URLSearchParams({
      organization_id: `eq.${session.user.organizationId}`,
      provider_id: `eq.${providerId}`,
    }),
    body: { status: "revoked", revoked_at: new Date().toISOString() },
  });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await auditLogsRepository.record(scope, {
    action: `connector.${providerId}.credentials.revoked`,
    resourceType: "enterprise_connector_credential",
    category: "integrations",
    metadata: { providerId },
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
