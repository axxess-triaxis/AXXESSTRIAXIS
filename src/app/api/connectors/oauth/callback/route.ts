import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../../repositories/supabaseAdmin";
import { getConnectorContract, type ConnectorProviderId } from "../../../../../services/integrations/connectorContract";
import { buildIntegrationConnectionUpsert, exchangeOAuthCode, getOAuthProviderConfiguration, hashOAuthState, verifyOAuthState } from "../../../../../services/integrations/oauthProvider";

const supportedProviderIds: ConnectorProviderId[] = ["gmail", "microsoft", "slack", "calendly", "airtable", "hubspot", "notion", "google_calendar", "zoom", "teams", "google_drive", "linear", "github", "google_sheets", "whatsapp_business", "google_docs", "google_slides", "x_twitter", "threads", "meta_business"];

function providerId(value: string | null): ConnectorProviderId | undefined {
  return supportedProviderIds.find((id) => id === value);
}

type IntegrationConnectionRow = {
  id: string;
};

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const provider = providerId(url.searchParams.get("provider"));
  if (!provider || !getConnectorContract(provider)) return NextResponse.json({ error: "Unsupported connector provider." }, { status: 400 });
  // A-100 (2026-08-07): providers don't agree on an error param shape -- Google/Zoom/Microsoft send
  // a plain `error`, but Meta (WhatsApp Business/meta_business) sends `error_code`/`error_message`
  // instead and never sets `error` at all. Checking only `error` let a real Meta rejection
  // ("URL Blocked: ...") fall through to the generic "OAuth code and state are required." 400 JSON
  // below instead of redirecting to a real, readable error toast on /integrations.
  const error = url.searchParams.get("error") ?? url.searchParams.get("error_message") ?? url.searchParams.get("error_code");
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

  const exchange = await exchangeOAuthCode({
    providerId: provider,
    organizationId: session.user.organizationId,
    userId: session.user.id,
    code,
    redirectUri: config.redirectUri,
    codeVerifier: verified.payload.codeVerifier,
  });
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const stateHash = hashOAuthState(state);
  const adminConfigured = isSupabaseAdminConfigured();

  if (adminConfigured) {
    await supabaseAdminRest("oauth_token_vault", {
      method: "POST",
      query: new URLSearchParams({ on_conflict: "token_reference" }),
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        organization_id: session.user.organizationId,
        user_id: session.user.id,
        provider_id: provider,
        token_reference: exchange.vaultRecord.tokenReference,
        encrypted_payload: exchange.vaultRecord.encryptedPayload,
        algorithm: exchange.vaultRecord.algorithm,
        key_id: exchange.vaultRecord.keyId,
        access_token_hash: exchange.vaultRecord.accessTokenHash,
        refresh_token_hash: exchange.vaultRecord.refreshTokenHash ?? null,
        scopes: exchange.vaultRecord.scope,
        expires_at: exchange.vaultRecord.expiresAt ?? null,
        status: "active",
        metadata: {
          oauthSubject: exchange.vaultRecord.oauthSubject,
          sealedBy: "oauth_callback",
        },
      },
    });

    const connectionRows = await supabaseAdminRest<IntegrationConnectionRow[]>("integration_connections", {
      method: "POST",
      query: new URLSearchParams({ on_conflict: "organization_id,provider_id" }),
      prefer: "resolution=merge-duplicates,return=representation",
      body: buildIntegrationConnectionUpsert({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        exchange,
        stateHash,
      }),
    });
    const connectionId = connectionRows?.[0]?.id;
    if (connectionId) {
      await supabaseAdminRest("oauth_token_vault", {
        method: "PATCH",
        query: new URLSearchParams({
          token_reference: `eq.${exchange.vaultRecord.tokenReference}`,
          organization_id: `eq.${session.user.organizationId}`,
        }),
        body: { connection_id: connectionId },
      }).catch(() => undefined);
    }

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

  // A-97 (2026-08-06): this redirect used to unconditionally say "connected" even when
  // isSupabaseAdminConfigured() is false and the whole write block above never ran -- the OAuth
  // exchange itself succeeded, but nothing was persisted. Report the true outcome instead.
  const finalStatus = adminConfigured ? "connected" : "not_configured";
  return NextResponse.redirect(new URL(`/integrations?provider=${provider}&status=${finalStatus}`, url.origin));
}
