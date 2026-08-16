// Sprint 1 real Social Alerts (2026-08-17): scheduled daily Brand24 mention sync, same
// Bearer CRON_SECRET auth shape as cron/social-connector-sync/route.ts -- kept as its own route
// rather than folded into that one, since Brand24 syncs once globally (a single admin-level API
// key, no per-tenant OAuth connection to fan out over) then matches internally over rules, a
// different enough shape to keep separate.
import { NextResponse } from "next/server";
import { syncBrand24Mentions } from "../../../../services/alerts/brand24Ingestion";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await syncBrand24Mentions();
  return NextResponse.json(result);
}
