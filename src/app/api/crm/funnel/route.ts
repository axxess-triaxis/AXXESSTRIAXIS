import { NextResponse } from "next/server";
import { loadFunnel } from "../../../../repositories/funnelRepository";
import { loadSendHealth } from "../../../../repositories/outboundRepository";
import { recordDeniedAttempt } from "../../../../services/audit/auditEvents";
import { decideDailyBudget, rate } from "../../../../services/outbound/sendRamp";
import { requireCrmAccess } from "../leadAccess";

// Outreach funnel and sending health (GTM plan 2026-11-11, Day 4). Senior roles only.
//   GET /api/crm/funnel?days=30   (1 to 365, default 30)
// Counts come only from named tables; meetings, trials and paid are reported as not tracked.
// The ramp block is the same rule the outreach tick uses, so the page shows what the sender will do.
export async function GET(request: Request) {
  const access = await requireCrmAccess("/api/crm/funnel", "GET");
  if (access instanceof NextResponse) return access;
  if (!access.senior) {
    await recordDeniedAttempt(access.session, { route: "/api/crm/funnel", method: "GET" });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const requested = Number.parseInt(new URL(request.url).searchParams.get("days") ?? "30", 10);
  const days = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 365) : 30;
  const now = new Date();
  const [funnel, health] = await Promise.all([loadFunnel(access.scope, days, now), loadSendHealth(access.scope.organizationId, now)]);

  const ceiling = Number.parseInt(process.env.OUTREACH_DAILY_SEND_BUDGET ?? "20", 10);
  const decision = decideDailyBudget({ ceiling, ...health });
  const sent7d = health.sentPerDay.reduce((sum, n) => sum + n, 0);
  return NextResponse.json({
    ...funnel,
    ramp: {
      ...decision,
      sendingEnabled: process.env.OUTREACH_SENDING_ENABLED === "true",
      sent7d,
      bounceRate7d: rate(health.bounces7d, sent7d),
      complaintRate7d: rate(health.complaints7d, sent7d),
    },
  });
}
