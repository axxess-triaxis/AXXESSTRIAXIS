import { beforeEach, describe, expect, it, vi } from "vitest";

type TestSession = { user: { id: string; organizationId: string; role: string }; accessToken: string };

const { adminRest, recordDeniedAttempt, state } = vi.hoisted(() => ({
  adminRest: vi.fn(async () => []),
  recordDeniedAttempt: vi.fn(async () => undefined),
  state: { session: null as TestSession | null },
}));

vi.mock("../../../../auth/serverSession", () => ({ getServerAuthSession: vi.fn(async () => state.session) }));
vi.mock("../../../../services/audit/auditEvents", () => ({ recordDeniedAttempt }));
vi.mock("../../../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: adminRest,
}));

import { GET, POST } from "./route";

function post(body: unknown) {
  return POST(new Request("http://localhost/api/rag/evaluation", { method: "POST", body: JSON.stringify(body) }));
}

function as(role: string) {
  state.session = { user: { id: "user-1", organizationId: "org-1", role }, accessToken: "token" };
}

const validObservations = {
  observations: [{ fixtureId: "oxygen-risk-citation", sourceIds: ["demo-risk-register"], confidence: 0.9 }],
};

beforeEach(() => {
  adminRest.mockClear();
  recordDeniedAttempt.mockClear();
  as("Organization Admin");
});

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
    const response = await post(validObservations);
    expect(response.status).toBe(200);
    expect(adminRest).toHaveBeenCalledWith("rag_release_gates", expect.objectContaining({
      body: expect.objectContaining({ status: "failed", release_blocking: true }),
    }));
  });

  // The route writes with the service role, so rag_release_gates_admin_access (RLS) never sees the caller.
  // These cases hold the route to the same two roles that policy names.
  describe("POST is limited to the roles in rag_release_gates_admin_access", () => {
    it.each(["Employee", "Executive", "Manager", "Consultant", "Guest"])("refuses %s with 403 and writes nothing", async (role) => {
      as(role);
      const response = await post(validObservations);
      expect(response.status).toBe(403);
      expect(adminRest).not.toHaveBeenCalled();
      expect(recordDeniedAttempt).toHaveBeenCalledTimes(1);
      expect(recordDeniedAttempt).toHaveBeenCalledWith(state.session, { route: "/api/rag/evaluation", method: "POST" });
    });

    it("refuses a non-admin before looking at the body", async () => {
      as("Employee");
      expect((await post({})).status).toBe(403);
      expect(adminRest).not.toHaveBeenCalled();
    });

    it.each(["Super Admin", "Organization Admin"])("records the result for %s", async (role) => {
      as(role);
      const response = await post(validObservations);
      expect(response.status).toBe(200);
      expect(adminRest).toHaveBeenCalledTimes(1);
      expect(adminRest).toHaveBeenCalledWith("rag_release_gates", expect.objectContaining({
        body: expect.objectContaining({ organization_id: "org-1", run_by_user_id: "user-1" }),
      }));
      expect(recordDeniedAttempt).not.toHaveBeenCalled();
    });

    it("answers 401 with no session and writes nothing", async () => {
      state.session = null;
      expect((await post(validObservations)).status).toBe(401);
      expect(adminRest).not.toHaveBeenCalled();
      expect(recordDeniedAttempt).not.toHaveBeenCalled();
    });
  });
});
