// MC-4 (2026-08-02): scheduled fan-out sync for all connected Meta Business Suite and Threads
// accounts, every 6 hours (vercel.json). Bearer CRON_SECRET auth, same shape as
// cron/pilot-command-center-snapshot/route.ts. A single tenant's sync failure is logged and does
// not abort the rest of the fan-out.
import { NextResponse } from "next/server";
import { listConnectedSocialConnections } from "../../../../services/social/socialConnectionToken";
import { syncMetaBusinessContent } from "../../../../services/social/metaBusinessIngestion";
import { syncThreadsContent } from "../../../../services/social/threadsIngestion";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const limit = Number(process.env.AXXESS_SOCIAL_SYNC_FANOUT_LIMIT ?? 50);
  const results: Array<{ providerId: string; connectionId: string; organizationId: string; ok: boolean; detail?: unknown }> = [];

  const metaConnections = await listConnectedSocialConnections("meta_business", limit);
  for (const connection of metaConnections) {
    try {
      const result = await syncMetaBusinessContent(connection.organizationId, connection.id);
      results.push({ providerId: "meta_business", connectionId: connection.id, organizationId: connection.organizationId, ok: Boolean(result), detail: result });
    } catch (error) {
      results.push({ providerId: "meta_business", connectionId: connection.id, organizationId: connection.organizationId, ok: false, detail: (error as Error).message });
    }
  }

  const threadsConnections = await listConnectedSocialConnections("threads", limit);
  for (const connection of threadsConnections) {
    try {
      const result = await syncThreadsContent(connection.organizationId, connection.id);
      results.push({ providerId: "threads", connectionId: connection.id, organizationId: connection.organizationId, ok: Boolean(result), detail: result });
    } catch (error) {
      results.push({ providerId: "threads", connectionId: connection.id, organizationId: connection.organizationId, ok: false, detail: (error as Error).message });
    }
  }

  return NextResponse.json({ connectionsProcessed: results.length, results });
}
