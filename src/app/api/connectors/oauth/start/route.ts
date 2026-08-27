import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { resolveIsLiteSurface } from "../../../../../config/liteSurfaceHosts";
import { isLiteAllowedConnectorProvider } from "../../../../../features/lite/liteIntegrationsConfig";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../../repositories/supabaseAdmin";
import { buildConnectorOAuthUrl, getConnectorContract } from "../../../../../services/integrations/connectorContract";
import { createOAuthState, generatePkceVerifier, getOAuthProviderConfiguration, hashOAuthState, pkceCodeChallenge } from "../../../../../services/integrations/oauthProvider";

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "";
  const contract = getConnectorContract(provider);
  if (!contract) return NextResponse.json({ error: "Unsupported connector provider." }, { status: 400 });

  // proxy.ts's edge gate only decides whether /api/connectors/oauth/* is reachable on a Lite host
  // at all -- it can't cheaply inspect this ?provider= value. This is the actual narrowing: a Lite
  // host request for a provider outside Lite's own 12-item list is rejected even if that provider
  // is otherwise fully configured for X0.
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (resolveIsLiteSurface(requestHost, process.env.AXXESS_LITE_HOSTS, process.env.AXXESS_SURFACE) && !isLiteAllowedConnectorProvider(contract.providerId)) {
    return NextResponse.json({ error: "This connector is not available on AXXESS Lite." }, { status: 400 });
  }
  const config = getOAuthProviderConfiguration(contract.providerId);
  if (!config.configured) {
    return NextResponse.json({
      status: "provider_gated",
      providerId: contract.providerId,
      requiredScopes: contract.requiredScopes,
      missing: config.missing,
      message: "OAuth credentials and encrypted token vault settings must be configured before connecting this provider.",
    });
  }

  const codeVerifier = contract.requiresPkce ? generatePkceVerifier() : undefined;
  const state = createOAuthState({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    providerId: contract.providerId,
    nonce: randomUUID(),
    codeVerifier,
  });
  const authorizationUrl = buildConnectorOAuthUrl(
    contract.providerId,
    state,
    undefined,
    codeVerifier ? { codeChallenge: pkceCodeChallenge(codeVerifier) } : undefined,
  );
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const stateHash = hashOAuthState(state);

  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("oauth_connection_states", {
      method: "POST",
      body: {
        organization_id: session.user.organizationId,
        user_id: session.user.id,
        provider_id: contract.providerId,
        state_hash: stateHash,
        status: "issued",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    }).catch(() => undefined);
  }

  await auditLogsRepository.record(scope, {
    action: `connector.${contract.providerId}.oauth.started`,
    resourceType: "integration_connection",
    category: "integrations",
    metadata: {
      providerId: contract.providerId,
      scopes: contract.requiredScopes,
      configured: Boolean(authorizationUrl),
      stateHash,
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
