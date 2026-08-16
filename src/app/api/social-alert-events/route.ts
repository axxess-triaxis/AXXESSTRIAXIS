import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import { tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import { listSocialAlertEvents } from "../../../repositories/socialAlertEventsRepository";

// Sprint 1 real Social Alerts (2026-08-17). organization_id/userId are derived from the
// authenticated server session -- never accepted from the client. Mirrors GET /api/social-alert-rules.
export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const events = await listSocialAlertEvents(scope);
  return NextResponse.json({ events });
}
