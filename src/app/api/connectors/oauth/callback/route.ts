import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../../repositories/supabaseAdmin";
import { getConnectorContract, type ConnectorProviderId } from "../../../../../services/integrations/connectorContract";
import { buildIntegrationConnectionUpsert, exchangeOAuthCode, getOAuthProviderConfiguration, hashOAuthState, verifyOAuthState } from "../../../../../services/integrations/oauthProvider";

function providerId(value: string | null): ConnectorProviderId | undefined {
  return value === "gmail" || value === "microsoft" ? value : undefined;
}

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const provider = providerId(url.searchParams.get("provider"));
  if (!provider || !getConnectorContract(provider)) return NextResponse.json({ error: "Unsupported connector provider." }, { status: 400 });
  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL(`/integrations?provider=${provider}&status=error&reason=${encodeURIComponent(error)}`, url.origin));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return NextResponse.json({ error: "OAuth code and state are required." }, { status: 400 });

  const verified = verifyOAuthState(state, provider);
  if (!verified.ok) return NextResponse.json({ error: verified.reason }, { status: 400 });
  if (verified.payload.organizationId !== session.user.organizationId || verified.payload.userId !== session.user.id) {
    return NextResponse.json({ error: "OAuth state does not match the active session." }, { status: 403 });
  }

  const config = getOAuthProviderConfiguration(provider);
  if (!config.configured || !config.redirectUri) {
    return NextResponse.json({
      status: "provider_gated",
      providerId: provider,
      missing: config.missing,
    }, { status: 400 });
  }

  const exchange = await exchangeOAuthCode({ providerId: provider, code, redirectUri: config.redirectUri });
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const stateHash = hashOAuthState(state);

  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("integration_connections", {
      method: "POST",
      query: new URLSearchParams({ on_conflict: "organization_id,provider_id" }),
      prefer: "resolution=merge-duplicates,return=representation",
      body: buildIntegrationConnectionUpsert({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        exchange,
        stateHash,
      }),
    }).catch(() => undefined);
    await supabaseAdminRest("oauth_connection_states", {
      method: "PATCH",
      query: new URLSearchParams({ state_hash: `eq.${stateHash}`, organization_id: `eq.${session.user.organizationId}` }),
      body: { consumed_at: new Date().toISOString(), status: "consumed" },
    }).catch(() => undefined);
  }

  await auditLogsRepository.record(scope, {
    action: `connector.${provider}.oauth.connected`,
    resourceType: "integration_connection",
    category: "integrations",
    metadata: {
      providerId: provider,
      scopes: exchange.scope,
      tokenReference: exchange.tokenReference,
      oauthSubject: exchange.oauthSubject,
    },
  }).catch(() => undefined);

  return NextResponse.redirect(new URL(`/integrations?provider=${provider}&status=connected`, url.origin));
}
