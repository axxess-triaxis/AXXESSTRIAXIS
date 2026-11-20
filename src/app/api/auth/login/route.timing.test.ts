import { afterEach, describe, expect, it, vi } from "vitest";

// Staging 2026-11-19: about 1 in 20 sign-ins stalled ~21 s after Vercel logged the login 200.
// The request log has no duration, so the route now reports how long each phase took.
// after() needs a real request scope; here it just runs the callback.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn((callback: () => unknown) => {
    void callback();
  }),
}));
vi.mock("../../../../auth/serverSession", () => ({
  signInServerSide: vi.fn(async () => ({
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: "user-1", email: "admin@axxess.test", role: "Organization Admin", organizationId: "org-1" },
  })),
}));
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  auditLogsRepository: { record: vi.fn(async () => undefined) },
}));
vi.mock("../../../../lib/posthog-server", () => ({
  getPostHogClient: () => ({ identify: vi.fn(), capture: vi.fn(), flush: vi.fn(async () => undefined) }),
}));

describe("POST /api/auth/login timing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a Server-Timing header and logs one timing line without credentials", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { POST } = await import("./route");

    const response = await POST(new Request("https://example.test/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@axxess.test", password: "secret-password" }),
    }));

    expect(response.status).toBe(200);
    const header = response.headers.get("Server-Timing") ?? "";
    for (const phase of ["signin", "audit", "analytics", "total"]) {
      expect(header).toMatch(new RegExp(`${phase};dur=\\d+`));
    }

    const lines = info.mock.calls.map((call) => String(call[0]));
    const timingLine = lines.find((line) => line.startsWith("[auth/login] timing"));
    expect(timingLine).toMatch(/signin=\d+ms audit=\d+ms analytics=\d+ms total=\d+ms/);
    expect(timingLine).not.toContain("secret-password");
    expect(timingLine).not.toContain("admin@axxess.test");
  });
});
