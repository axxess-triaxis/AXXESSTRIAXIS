import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls: Array<{ config: Record<string, unknown> }> = [];
vi.mock("../../../../services/outbound/outreachTick", () => ({
  runOutreachTick: async (deps: { config: Record<string, unknown> }) => { calls.push({ config: deps.config }); return { sent: 2, stopped: 1, deferred: 0, failed: 0 }; },
}));
vi.mock("../../../../repositories/outboundRepository", () => ({
  loadTickState: async () => ({}), recordContactAttempt: async () => undefined, updateEnrollment: async () => undefined,
}));
vi.mock("../../../../services/email/resendSend", () => ({ sendViaResend: async () => ({ id: "x" }) }));

import { POST } from "./route";

const ENV = {
  OUTREACH_SENDING_ENABLED: "true",
  OUTREACH_TICK_SECRET: "tick-secret-for-tests-0123456789abcdef",
  OUTREACH_ORGANIZATION_ID: "org-1",
  OUTREACH_FROM: "Asha <asha@go.example.com>",
  OUTREACH_SENDER_NAME: "Asha Rao",
  OUTREACH_SENDER_COMPANY: "Triaxis Ventures Private Limited",
  OUTREACH_SENDER_ADDRESS: "Guwahati, India",
  OUTREACH_UNSUBSCRIBE_SECRET: "unsubscribe-secret-for-tests-0123456789",
  OUTREACH_RESEND_API_KEY: "re_test",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
};
const call = (auth?: string) => POST(new Request("http://localhost/api/outreach/tick", { method: "POST", headers: auth ? { authorization: auth } : {} }));

describe("POST /api/outreach/tick", () => {
  beforeEach(() => { Object.assign(process.env, ENV); });
  afterEach(() => { for (const k of [...Object.keys(ENV), "OUTREACH_DAILY_SEND_BUDGET"]) delete process.env[k]; calls.length = 0; });

  it("returns 401 without the right bearer secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("does nothing while sending is switched off", async () => {
    process.env.OUTREACH_SENDING_ENABLED = "false";
    const response = await call(`Bearer ${ENV.OUTREACH_TICK_SECRET}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ skipped: "sending_disabled" });
    expect(calls).toEqual([]);
  });

  it("returns 503 naming missing settings, never their values", async () => {
    delete process.env.OUTREACH_SENDER_ADDRESS;
    delete process.env.OUTREACH_RESEND_API_KEY;
    const response = await call(`Bearer ${ENV.OUTREACH_TICK_SECRET}`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Outreach is not configured.", missing: ["OUTREACH_SENDER_ADDRESS", "OUTREACH_RESEND_API_KEY"] });
    expect(calls).toEqual([]);
  });

  it("runs one tick with a capped daily budget and returns the summary", async () => {
    process.env.OUTREACH_DAILY_SEND_BUDGET = "5000";
    const response = await call(`Bearer ${ENV.OUTREACH_TICK_SECRET}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 2, stopped: 1, deferred: 0, failed: 0 });
    expect(calls[0].config).toMatchObject({ organizationId: "org-1", dailySendBudget: 200, appUrl: "https://app.example.com" });
  });

  it("defaults the daily budget to 20 for warm-up", async () => {
    await call(`Bearer ${ENV.OUTREACH_TICK_SECRET}`);
    expect(calls[0].config.dailySendBudget).toBe(20);
  });
});
