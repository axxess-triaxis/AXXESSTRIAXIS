import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  syncResult: undefined as unknown,
  syncError: undefined as Error | undefined,
};

vi.mock("../../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: { record: async () => undefined },
}));

vi.mock("../../../../../services/social/metaBusinessIngestion", () => ({
  syncMetaBusinessContent: async () => {
    if (state.syncError) throw state.syncError;
    return state.syncResult;
  },
}));

import { POST } from "./route";

describe("POST /api/connectors/meta-business/sync", () => {
  afterEach(() => {
    state.session = null;
    state.syncResult = undefined;
    state.syncError = undefined;
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await POST(new Request("https://app.test", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
  });

  it("returns 404 when the tenant has no connected Meta Business Suite account", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    state.syncResult = undefined;
    const response = await POST(new Request("https://app.test", { method: "POST", body: "{}" }));
    expect(response.status).toBe(404);
  });

  it("returns the real sync counts on success", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    state.syncResult = { pagesSynced: 1, postsSynced: 4, campaignsSynced: 2 };
    const response = await POST(new Request("https://app.test", { method: "POST", body: "{}" }));
    const body = await response.json() as { postsSynced: number };
    expect(response.status).toBe(200);
    expect(body.postsSynced).toBe(4);
  });
});
