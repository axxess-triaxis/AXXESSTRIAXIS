import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  metaConnections: [] as Array<{ id: string; organizationId: string }>,
  threadsConnections: [] as Array<{ id: string; organizationId: string }>,
  metaSyncResults: new Map<string, unknown>(),
  threadsSyncResults: new Map<string, unknown>(),
  metaSyncThrows: new Set<string>(),
};

vi.mock("../../../../services/social/socialConnectionToken", () => ({
  listConnectedSocialConnections: async (providerId: string) =>
    providerId === "meta_business" ? state.metaConnections : state.threadsConnections,
}));

vi.mock("../../../../services/social/metaBusinessIngestion", () => ({
  syncMetaBusinessContent: async (_orgId: string, connectionId: string) => {
    if (state.metaSyncThrows.has(connectionId)) throw new Error("Graph API rate limited.");
    return state.metaSyncResults.get(connectionId);
  },
}));

vi.mock("../../../../services/social/threadsIngestion", () => ({
  syncThreadsContent: async (_orgId: string, connectionId: string) => state.threadsSyncResults.get(connectionId),
}));

import { GET } from "./route";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

function request(bearer?: string) {
  return new Request("https://app.test/api/cron/social-connector-sync", {
    headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
  });
}

describe("GET /api/cron/social-connector-sync", () => {
  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
    state.metaConnections = [];
    state.threadsConnections = [];
    state.metaSyncResults = new Map();
    state.threadsSyncResults = new Map();
    state.metaSyncThrows = new Set();
    vi.clearAllMocks();
  });

  it("rejects when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(request("anything"));
    expect(response.status).toBe(503);
  });

  it("rejects an unauthenticated or wrong-secret request", async () => {
    process.env.CRON_SECRET = "expected-secret";
    const response = await GET(request("wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("fans out over every connected meta_business and threads connection across all tenants", async () => {
    process.env.CRON_SECRET = "expected-secret";
    state.metaConnections = [{ id: "conn-1", organizationId: "org-1" }];
    state.threadsConnections = [{ id: "conn-2", organizationId: "org-2" }];
    state.metaSyncResults.set("conn-1", { pagesSynced: 1, postsSynced: 2, campaignsSynced: 0 });
    state.threadsSyncResults.set("conn-2", { synced: 5, skipped: 0 });

    const response = await GET(request("expected-secret"));
    const body = await response.json() as { connectionsProcessed: number; results: Array<{ providerId: string; ok: boolean }> };
    expect(response.status).toBe(200);
    expect(body.connectionsProcessed).toBe(2);
    expect(body.results.every((result) => result.ok)).toBe(true);
  });

  it("logs one tenant's sync failure and still processes the rest, rather than aborting the whole fan-out", async () => {
    process.env.CRON_SECRET = "expected-secret";
    state.metaConnections = [{ id: "conn-fail", organizationId: "org-1" }, { id: "conn-ok", organizationId: "org-2" }];
    state.metaSyncThrows.add("conn-fail");
    state.metaSyncResults.set("conn-ok", { pagesSynced: 1, postsSynced: 1, campaignsSynced: 0 });

    const response = await GET(request("expected-secret"));
    const body = await response.json() as { results: Array<{ connectionId: string; ok: boolean; detail?: unknown }> };
    const failed = body.results.find((result) => result.connectionId === "conn-fail");
    const ok = body.results.find((result) => result.connectionId === "conn-ok");
    expect(failed?.ok).toBe(false);
    expect(failed?.detail).toBe("Graph API rate limited.");
    expect(ok?.ok).toBe(true);
  });
});
