import { afterEach, describe, expect, it, vi } from "vitest";
import { isCallismaticConfigured, startAgentCall } from "./callismaticClient";

const request = { jobId: "job-1", leadId: "l1", organizationId: "org-1", phoneE164: "+919876543210", country: "IN", title: "Acme - Asha" };
const reply = (status: number, body?: unknown) => vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe("callismaticClient", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends nothing when not configured", async () => {
    vi.stubEnv("CALLISMATIC_URL", "");
    vi.stubEnv("CALLISMATIC_API_KEY", "");
    const fetchImpl = reply(202);
    expect(isCallismaticConfigured()).toBe(false);
    expect(await startAgentCall(request, fetchImpl)).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts the job with the key and treats 202 as accepted", async () => {
    vi.stubEnv("CALLISMATIC_URL", "https://callismatic.example/");
    vi.stubEnv("CALLISMATIC_API_KEY", "k");
    const fetchImpl = reply(202, { accepted: true });
    expect(await startAgentCall(request, fetchImpl)).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://callismatic.example/api/outbound-calls");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("k");
    expect(JSON.parse(String(init.body))).toEqual(expect.objectContaining({ job_id: "job-1", lead_id: "l1", organization_id: "org-1", phone_e164: "+919876543210" }));
  });

  it("passes Callismatic's short reason through, and falls back to the HTTP status", async () => {
    vi.stubEnv("CALLISMATIC_URL", "https://callismatic.example");
    vi.stubEnv("CALLISMATIC_API_KEY", "k");
    expect(await startAgentCall(request, reply(409, { error: "provider_unavailable" }))).toEqual({ ok: false, reason: "provider_unavailable" });
    expect(await startAgentCall(request, reply(500, { error: "Something long with spaces" }))).toEqual({ ok: false, reason: "http_500" });
    expect(await startAgentCall(request, vi.fn(async () => { throw new Error("down"); }))).toEqual({ ok: false, reason: "callismatic_unreachable" });
  });
});
