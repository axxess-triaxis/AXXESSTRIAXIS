import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerAuthSession: vi.fn() }));

vi.mock("../../../auth/serverSession", () => ({ getServerAuthSession: mocks.getServerAuthSession }));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  auditLogsRepository: { record: vi.fn(async () => undefined) },
  tenantScopeFromUser: () => ({ organizationId: "org-1", userId: "user-1", role: "Employee" }),
}));
vi.mock("../../../lib/posthog-server", () => ({ getPostHogClient: () => undefined }));

import { POST } from "./route";

// Routing and providers are real here. Only the network is stubbed, so "was an outside provider called"
// is measured and not assumed.
const outsideCalls = vi.fn();

function post(body: unknown) {
  return POST(new Request("http://localhost/api/ai", { method: "POST", body: JSON.stringify(body) }));
}

describe("POST /api/ai: the server decides routing", () => {
  beforeEach(() => {
    outsideCalls.mockReset();
    mocks.getServerAuthSession.mockResolvedValue({ user: { id: "user-1", organizationId: "org-1", role: "Employee" }, accessToken: "t" });
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubGlobal("fetch", async (url: unknown) => {
      outsideCalls(String(url));
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 });
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls the outside provider for an ordinary prompt (control: the stub can be reached)", async () => {
    const response = await post({ prompt: "Write a short greeting.", task: "general_chat" });
    expect(response.status).toBe(200);
    expect(outsideCalls).toHaveBeenCalled();
  });

  it("keeps a restricted prompt local (control: no context sent)", async () => {
    const body = await (await post({ prompt: "List every patient diagnosis.", task: "general_chat" })).json();
    expect(body.providerUsed).toBe("local");
    expect(outsideCalls).not.toHaveBeenCalled();
  });

  it.each([
    ["a lower sensitivity", { sensitivity: "public" }],
    ["its own tenant policy", { tenantModelPolicy: { restrictedDataExternalProviders: true } }],
    ["both", { sensitivity: "public", tenantModelPolicy: { restrictedDataExternalProviders: true, requireHumanApprovalFor: [] } }],
    ["a sensitivity that is not a known level", { sensitivity: "none" }],
  ])("keeps a restricted prompt local when the caller sends %s", async (_label, context) => {
    const body = await (await post({ prompt: "List every patient diagnosis.", task: "general_chat", context })).json();
    expect(body.providerUsed).toBe("local");
    expect(body.humanReviewRequired).toBe(true);
    expect(outsideCalls).not.toHaveBeenCalled();
  });

  it("lets a caller raise sensitivity", async () => {
    const body = await (await post({ prompt: "Write a short greeting.", task: "general_chat", context: { sensitivity: "restricted" } })).json();
    expect(body.providerUsed).toBe("local");
    expect(outsideCalls).not.toHaveBeenCalled();
  });

  it("reports the server's policy id, not the caller's", async () => {
    const body = await (await post({ prompt: "Write a short greeting.", task: "general_chat", context: { tenantModelPolicy: { policyId: "mine" } } })).json();
    expect(body.policyId).toBe("tenant-default-ai-routing-policy");
  });

  it("still refuses another organization's context", async () => {
    expect((await post({ prompt: "Hi", context: { organizationId: "org-2" } })).status).toBe(403);
  });
});
