import { describe, expect, it, vi } from "vitest";

// Staging run14 (2026-11-19): waiting for posthog.flush() was ~669 ms of a ~1,115 ms sign-in, and a
// hung outbound call there would hold the sign-in response. The flush now runs after the response.
const state = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => unknown>,
  releaseFlush: () => undefined as void,
  flushed: false,
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn((callback: () => unknown) => {
    state.afterCallbacks.push(callback);
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
const posthog = vi.hoisted(() => ({
  identify: vi.fn(),
  capture: vi.fn(),
  flush: vi.fn(() => new Promise<void>((resolve) => {
    state.releaseFlush = () => {
      state.flushed = true;
      resolve();
    };
  })),
}));
vi.mock("../../../../lib/posthog-server", () => ({ getPostHogClient: () => posthog }));

describe("POST /api/auth/login analytics", () => {
  it("responds without waiting for the PostHog flush, and still flushes after the response", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { POST } = await import("./route");

    const response = await Promise.race([
      POST(new Request("https://example.test/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "admin@axxess.test", password: "secret-password" }),
      })),
      new Promise<"blocked">((resolve) => setTimeout(() => resolve("blocked"), 500)),
    ]);

    expect(response).not.toBe("blocked");
    expect((response as Response).status).toBe(200);
    expect(posthog.identify).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith(expect.objectContaining({ event: "user_login" }));

    // The flush is handed to after(), which runs once the response is sent.
    expect(state.afterCallbacks).toHaveLength(1);
    const pending = state.afterCallbacks[0]();
    state.releaseFlush();
    await pending;
    expect(state.flushed).toBe(true);
  });
});
