import { afterEach, describe, expect, it, vi } from "vitest";

// Executive Dashboard Sprint ED-2: getSocialAlertProviderStatus()/socialAlertsEnabled() read real
// process.env provider credentials and must be evaluated server-side -- this route is the correct
// place for the Dashboard's External Signals tile to get an accurate answer, since AlertsSection.tsx
// evaluates the same functions client-side (where they cannot see the real server environment).
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

import { GET } from "./route";

describe("GET /api/social-alerts/status", () => {
  afterEach(() => {
    state.session = null;
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns real, server-evaluated provider status for the caller's tenant", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" } };
    const response = await GET();
    const body = await response.json() as { enabled: boolean; providers: unknown[]; anyLiveProviderConfigured: boolean };

    expect(response.status).toBe(200);
    expect(typeof body.enabled).toBe("boolean");
    expect(Array.isArray(body.providers)).toBe(true);
    // No X/Facebook credentials are configured in this test environment -- an honest false, not a
    // fabricated true.
    expect(body.anyLiveProviderConfigured).toBe(false);
  });
});
