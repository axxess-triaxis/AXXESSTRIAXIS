import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminRest, session } = vi.hoisted(() => ({
  adminRest: vi.fn(async () => []),
  session: { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" }, accessToken: "token" },
}));

vi.mock("../../../../auth/serverSession", () => ({ getServerAuthSession: vi.fn(async () => session) }));
vi.mock("../../../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: adminRest,
}));

import { GET, POST } from "./route";

function post(body: unknown) {
  return POST(new Request("http://localhost/api/rag/evaluation", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => adminRest.mockClear());

describe("RAG evaluation API", () => {
  it.each([
    ["no body fields", {}],
    ["an empty list", { observations: [] }],
    ["a value that is not a list", { observations: "passed" }],
    ["a malformed observation", { observations: [{ fixtureId: "oxygen-risk-citation" }] }],
  ])("records nothing and returns 400 for %s", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(adminRest).not.toHaveBeenCalled();
  });

  it("does not report a pass when nothing has been measured", async () => {
    const payload = await (await GET()).json() as { result: unknown };
    expect(JSON.stringify(payload)).not.toContain("\"passed\"");
    expect(payload.result).toBeNull();
  });

  it("records a failure, not a pass, when only some fixtures were observed", async () => {
    const response = await post({
      observations: [{ fixtureId: "oxygen-risk-citation", sourceIds: ["demo-risk-register"], confidence: 0.9 }],
    });
    expect(response.status).toBe(200);
    expect(adminRest).toHaveBeenCalledWith("rag_release_gates", expect.objectContaining({
      body: expect.objectContaining({ status: "failed", release_blocking: true }),
    }));
  });
});
