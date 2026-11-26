import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOmnidamusConfigured, startAgentMessage, type AgentMessageRequest } from "./omnidamusClient";

// Message with agent -> Omnidamus POST /start (customer-fireable stack, PR 5, 2026-11-20).
const BASE: AgentMessageRequest = {
  jobId: "job-1", organizationId: "org-1", phoneE164: "+971501234567", channel: "whatsapp", line: "+971500000001",
  context: "Ask about the viewing.", whatsappPhoneNumberId: "pn-1", whatsappTemplate: "viewing_intro",
};

function fakeFetch(status: number, body: unknown = {}) {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { impl, requests };
}

describe("omnidamus client", () => {
  beforeEach(() => {
    vi.stubEnv("OMNIDAMUS_START_URL", "https://abc.lambda-url.ap-southeast-2.on.aws/");
    vi.stubEnv("OMNIDAMUS_START_API_KEY", "k".repeat(40));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("posts a WhatsApp start with the organization's sender and line, and the key header", async () => {
    const { impl, requests } = fakeFetch(202, { status: "started" });
    expect(await startAgentMessage(BASE, impl)).toEqual({ ok: true });
    const [{ url, init }] = requests;
    expect(url).toBe("https://abc.lambda-url.ap-southeast-2.on.aws/start");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("k".repeat(40));
    expect(JSON.parse(String(init.body))).toEqual({
      organization_id: "org-1", job_id: "job-1", line: "+971500000001", phone: "+971501234567", context: "Ask about the viewing.",
      channel: "whatsapp", template: "viewing_intro", template_params: [], whatsapp_origination_id: "pn-1",
    });
  });

  it("posts an SMS start with the opening text and origination identity", async () => {
    const { impl, requests } = fakeFetch(202);
    await startAgentMessage({ ...BASE, channel: "sms", smsOriginationIdentity: "SHARMA", smsOpeningText: "Hello" }, impl);
    expect(JSON.parse(String(requests[0].init.body))).toEqual(expect.objectContaining({
      channel: "sms_rcs", notification: "Hello", sms_origination_identity: "SHARMA",
    }));
  });

  it("returns Omnidamus's refusal reason, or the HTTP status when the body is unusable", async () => {
    expect(await startAgentMessage(BASE, fakeFetch(422, { error: "start_refused" }).impl)).toEqual({ ok: false, reason: "start_refused" });
    expect(await startAgentMessage(BASE, fakeFetch(500, { error: "<script>" }).impl)).toEqual({ ok: false, reason: "http_500" });
  });

  it("reports an unreachable Omnidamus and sends nothing when not configured", async () => {
    const failing = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
    expect(await startAgentMessage(BASE, failing)).toEqual({ ok: false, reason: "omnidamus_unreachable" });
    vi.stubEnv("OMNIDAMUS_START_API_KEY", "");
    expect(isOmnidamusConfigured()).toBe(false);
    const { impl, requests } = fakeFetch(202);
    expect(await startAgentMessage(BASE, impl)).toEqual({ ok: false, reason: "not_configured" });
    expect(requests).toEqual([]);
  });
});
