import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  events: [] as unknown[],
  sinceUsed: undefined as string | undefined,
};

vi.mock("../../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../../repositories/whatsappEventsRepository", () => ({
  listWhatsAppBusinessEventsSince: async (_scope: unknown, since: string) => {
    state.sinceUsed = since;
    return state.events;
  },
}));

import { GET } from "./route";

describe("GET /api/whatsapp/events/recent", () => {
  afterEach(() => {
    state.session = null;
    state.events = [];
    state.sinceUsed = undefined;
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await GET(new Request("https://app.test/api/whatsapp/events/recent"));
    expect(response.status).toBe(401);
  });

  it("passes the since query param through to the repository", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    const response = await GET(new Request("https://app.test/api/whatsapp/events/recent?since=2026-08-02T00:00:00.000Z"));
    expect(response.status).toBe(200);
    expect(state.sinceUsed).toBe("2026-08-02T00:00:00.000Z");
  });

  it("defaults 'since' to roughly a minute ago when omitted", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    await GET(new Request("https://app.test/api/whatsapp/events/recent"));
    expect(state.sinceUsed).toBeDefined();
    expect(Date.now() - new Date(state.sinceUsed as string).getTime()).toBeLessThan(120_000);
  });

  it("returns real events for the caller's own organization only", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    state.events = [{ id: "evt-1", organizationId: "org-1" }];
    const response = await GET(new Request("https://app.test/api/whatsapp/events/recent"));
    const body = await response.json() as { events: unknown[] };
    expect(body.events).toEqual(state.events);
  });
});
