import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { buildConnectorOAuthUrl, getConnectorContract } from "../../../../../services/integrations/connectorContract";

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "";
  const contract = getConnectorContract(provider);
  if (!contract) return NextResponse.json({ error: "Unsupported connector provider." }, { status: 400 });

  const state = `${session.user.organizationId}:${session.user.id}:${randomUUID()}`;
  const authorizationUrl = buildConnectorOAuthUrl(contract.providerId, state);
  const scope = tenantScopeFromUser(session.user, session.accessToken);

  await auditLogsRepository.record(scope, {
    action: `connector.${contract.providerId}.oauth.started`,
    resourceType: "integration_connection",
    category: "integrations",
    metadata: {
      providerId: contract.providerId,
      scopes: contract.requiredScopes,
      configured: Boolean(authorizationUrl),
    },
  }).catch(() => undefined);

  if (!authorizationUrl) {
    return NextResponse.json({
      status: "provider_gated",
      providerId: contract.providerId,
      requiredScopes: contract.requiredScopes,
      message: "OAuth credentials are not configured for this provider yet.",
    });
  }

  return NextResponse.redirect(authorizationUrl);
}
