import { NextResponse } from "next/server";
import {
  persistAllTenantCommandCenterSnapshots,
  persistCommandCenterSnapshot,
} from "../../../../services/platform/commandCenterScheduler";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const seededPilotEvidence = process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true" || process.env.AXXESS_PILOT_COMMAND_CENTER_MODE === "preview";
  if (process.env.AXXESS_COMMAND_CENTER_FANOUT !== "false") {
    const fanOut = await persistAllTenantCommandCenterSnapshots({
      env: process.env,
      seededPilotEvidence,
      limit: Number(process.env.AXXESS_COMMAND_CENTER_FANOUT_LIMIT ?? 50),
    });
    if (fanOut.tenantsProcessed > 0 || !process.env.AXXESS_COMMAND_CENTER_ORGANIZATION_ID || !process.env.AXXESS_COMMAND_CENTER_USER_ID) {
      return NextResponse.json(fanOut);
    }
  }

  const organizationId = process.env.AXXESS_COMMAND_CENTER_ORGANIZATION_ID;
  const userId = process.env.AXXESS_COMMAND_CENTER_USER_ID;
  if (!organizationId || !userId) {
    return NextResponse.json({
      persisted: false,
      reason: "No active tenant fan-out targets were found and AXXESS_COMMAND_CENTER_ORGANIZATION_ID / AXXESS_COMMAND_CENTER_USER_ID fallback is not configured.",
    });
  }
  const result = await persistCommandCenterSnapshot({
    organizationId,
    userId,
    userRole: "Organization Admin",
    env: process.env,
    seededPilotEvidence,
  });

  return NextResponse.json(result);
}
