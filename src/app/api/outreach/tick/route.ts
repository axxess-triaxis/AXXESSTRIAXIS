import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { loadSendHealth, loadTickState, recordContactAttempt, updateEnrollment } from "../../../../repositories/outboundRepository";
import { sendViaResend } from "../../../../services/email/resendSend";
import { runOutreachTick } from "../../../../services/outbound/outreachTick";
import { decideDailyBudget } from "../../../../services/outbound/sendRamp";

// Scheduled outreach sender (GTM plan 2026-11-11, Day 2). Called by a scheduler with
// `Authorization: Bearer <OUTREACH_TICK_SECRET>`. Off unless OUTREACH_SENDING_ENABLED=true.
// Single organization for now (OUTREACH_ORGANIZATION_ID, Tenant 0). The daily budget defaults
// to 20 for domain warm-up and is capped at 200.
// Day 4: OUTREACH_DAILY_SEND_BUDGET is now the ceiling. The day's budget comes from the ramp rule
// (services/outbound/sendRamp.ts): it rises at most 50% a day while 7-day bounces stay under 2% and
// complaints under 0.1%, and sending pauses (budget 0, nothing sent) when either limit is reached.
const REQUIRED = [
  "OUTREACH_ORGANIZATION_ID",
  "OUTREACH_FROM",
  "OUTREACH_SENDER_NAME",
  "OUTREACH_SENDER_COMPANY",
  "OUTREACH_SENDER_ADDRESS",
  "OUTREACH_UNSUBSCRIBE_SECRET",
  "OUTREACH_RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

function authorized(request: Request) {
  const secret = process.env.OUTREACH_TICK_SECRET;
  if (!secret || secret.length < 32) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (process.env.OUTREACH_SENDING_ENABLED !== "true") return NextResponse.json({ skipped: "sending_disabled" });

  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) return NextResponse.json({ error: "Outreach is not configured.", missing }, { status: 503 });

  // Every REQUIRED name was checked as present just above.
  const env = Object.fromEntries(REQUIRED.map((name) => [name, process.env[name] as string])) as Record<(typeof REQUIRED)[number], string>;
  const ceiling = Number.parseInt(process.env.OUTREACH_DAILY_SEND_BUDGET ?? "20", 10);
  const organizationId = env.OUTREACH_ORGANIZATION_ID;
  const now = new Date();
  const ramp = decideDailyBudget({ ceiling, ...(await loadSendHealth(organizationId, now)) });
  if (ramp.budget === 0) {
    console.warn("[outreach] sending paused by the ramp rule", { reason: ramp.reason });
    return NextResponse.json({ sent: 0, stopped: 0, deferred: 0, failed: 0, budget: 0, reason: ramp.reason });
  }

  const summary = await runOutreachTick({
    loadState: loadTickState,
    sendEmail: (email, key) => sendViaResend(env.OUTREACH_RESEND_API_KEY, email, key),
    recordAttempt: recordContactAttempt,
    updateEnrollment: (id, patch) => updateEnrollment(organizationId, id, patch),
    config: {
      organizationId,
      from: env.OUTREACH_FROM,
      sender: { name: env.OUTREACH_SENDER_NAME, company: env.OUTREACH_SENDER_COMPANY, postalAddress: env.OUTREACH_SENDER_ADDRESS },
      appUrl: env.NEXT_PUBLIC_APP_URL,
      unsubscribeSecret: env.OUTREACH_UNSUBSCRIBE_SECRET,
      dailySendBudget: ramp.budget,
    },
    now: () => now,
  });
  return NextResponse.json({ ...summary, budget: ramp.budget, reason: ramp.reason });
}
