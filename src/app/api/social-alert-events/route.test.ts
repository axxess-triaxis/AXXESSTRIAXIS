import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  events: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../../repositories/socialAlertEventsRepository", () => ({
  listSocialAlertEvents: async () => state.events,
}));

import { GET } from "./route";

function user(id: string, role: string, organizationId = "org-1") {
  return { id, organizationId, role };
}

describe("GET /api/social-alert-events", () => {
  afterEach(() => {
    state.session = null;
    state.events = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns a genuinely empty list for a tenant with no matched events, not fabricated ones", async () => {
    state.session = { user: user("user-1", "Manager") };
    state.events = [];
    const response = await GET();
    const body = await response.json() as { events: unknown[] };
    expect(response.status).toBe(200);
    expect(body.events).toEqual([]);
  });

  it("returns real events when they exist", async () => {
    state.session = { user: user("user-1", "Manager") };
    state.events = [{ id: "event-1", title: "District hospital reports oxygen shortage" }];
    const response = await GET();
    const body = await response.json() as { events: Array<{ id: string }> };
    expect(body.events).toHaveLength(1);
    expect(body.events[0].id).toBe("event-1");
  });
});
