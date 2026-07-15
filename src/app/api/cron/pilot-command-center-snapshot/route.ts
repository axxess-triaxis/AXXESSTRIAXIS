import { NextResponse } from "next/server";
import { persistCommandCenterSnapshot } from "../../../../services/platform/commandCenterScheduler";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const organizationId = process.env.AXXESS_COMMAND_CENTER_ORGANIZATION_ID;
  const userId = process.env.AXXESS_COMMAND_CENTER_USER_ID;
  if (!organizationId || !userId) {
    return NextResponse.json({
      persisted: false,
      reason: "AXXESS_COMMAND_CENTER_ORGANIZATION_ID and AXXESS_COMMAND_CENTER_USER_ID are required for scheduled snapshots.",
    });
  }

  const result = await persistCommandCenterSnapshot({
    organizationId,
    userId,
    userRole: "Organization Admin",
    env: process.env,
    seededPilotEvidence: process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true" || process.env.AXXESS_PILOT_COMMAND_CENTER_MODE === "preview",
  });

  return NextResponse.json(result);
}
