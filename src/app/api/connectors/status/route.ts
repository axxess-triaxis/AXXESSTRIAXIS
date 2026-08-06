import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import type { ConnectorProviderId } from "../../../../services/integrations/connectorContract";

// A-97 (2026-08-06): the OAuth callback redirects to /integrations?provider=X&status=connected
// after a real, successful connection, but nothing in the UI ever checked live connection state --
// so a user who connected Gmail saw no visible change and re-attempted, reading as an "endless
// loop." This route gives the client a real, per-provider connected/not-connected read so the
// Integrations page can show it, instead of the client having to infer it from a side effect
// (like Microsoft's "Load Microsoft inbox" button succeeding).

type IntegrationConnectionRow = {
  provider_id: string;
  status: string;
  connected_at: string | null;
};

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const requested = url.searchParams.getAll("provider") as ConnectorProviderId[];
  const providers = requested.length ? requested : (["gmail", "microsoft", "notion"] as ConnectorProviderId[]);

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ connections: [] });
  }

  const rows = await supabaseAdminRest<IntegrationConnectionRow[]>("integration_connections", {
    query: new URLSearchParams({
      select: "provider_id,status,connected_at",
      organization_id: `eq.${session.user.organizationId}`,
      provider_id: `in.(${providers.join(",")})`,
      status: "eq.connected",
    }),
  }).catch(() => []);

  return NextResponse.json({
    connections: (rows ?? []).map((row) => ({ providerId: row.provider_id, connectedAt: row.connected_at })),
  });
}
