// MC-3 (2026-08-02): polled by useWhatsAppLiveEvents to surface new WhatsApp events as a live
// pop-up. organization_id is derived from the authenticated server session, never accepted from
// the client -- mirrors financial-watch/route.ts's GET shape.
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { listWhatsAppBusinessEventsSince } from "../../../../../repositories/whatsappEventsRepository";

export async function GET(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const since = url.searchParams.get("since") ?? new Date(Date.now() - 60_000).toISOString();

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const events = await listWhatsAppBusinessEventsSince(scope, since);
  return NextResponse.json({ events });
}
