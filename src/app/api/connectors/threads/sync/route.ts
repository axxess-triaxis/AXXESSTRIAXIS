// MC-4 (2026-08-02): manual "Sync now" for a tenant's connected Threads account.
// organization_id is derived from the authenticated server session, never accepted from the client.
import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { syncThreadsContent } from "../../../../../services/social/threadsIngestion";

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { connectionId?: string };
  const result = await syncThreadsContent(session.user.organizationId, body.connectionId).catch((error: Error) => ({ error: error.message }));

  if (!result) return NextResponse.json({ error: "Connect Threads before syncing." }, { status: 404 });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 502 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  await auditLogsRepository.record(scope, {
    action: "connector.threads.content.synced",
    resourceType: "integration_connection",
    category: "integrations",
    metadata: result,
  }).catch(() => undefined);

  return NextResponse.json(result);
}
