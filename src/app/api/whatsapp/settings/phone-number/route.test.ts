import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  isConfigured: true,
  existingConnection: undefined as { id: string; metadata: Record<string, unknown> } | undefined,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
};

vi.mock("../../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    if (options.method === "PATCH") {
      if (!state.existingConnection) return [];
      return [{ id: state.existingConnection.id, metadata: (options.body as { metadata: unknown }).metadata }];
    }
    return state.existingConnection ? [state.existingConnection] : [];
  },
}));

import { PATCH } from "./route";

function patchRequest(body: Record<string, unknown>) {
  return new Request("https://app.test/api/whatsapp/settings/phone-number", { method: "PATCH", body: JSON.stringify(body) });
}

describe("PATCH /api/whatsapp/settings/phone-number", () => {
  afterEach(() => {
    state.session = null;
    state.isConfigured = true;
    state.existingConnection = undefined;
    state.calls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await PATCH(patchRequest({ wabaPhoneNumberId: "12345" }));
    expect(response.status).toBe(401);
  });

  it("rejects non-admin roles", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    const response = await PATCH(patchRequest({ wabaPhoneNumberId: "12345" }));
    expect(response.status).toBe(403);
  });

  it("rejects a missing phone number", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" } };
    const response = await PATCH(patchRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 404 when the tenant has no whatsapp_business connection yet", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" } };
    state.existingConnection = undefined;
    const response = await PATCH(patchRequest({ wabaPhoneNumberId: "12345" }));
    expect(response.status).toBe(404);
  });

  it("merges wabaPhoneNumberId into existing metadata without discarding other fields", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" } };
    state.existingConnection = { id: "conn-1", metadata: { someOtherField: "keep-me" } };
    const response = await PATCH(patchRequest({ wabaPhoneNumberId: "12345" }));
    expect(response.status).toBe(200);
    const patchCall = state.calls.find((call) => call.options.method === "PATCH");
    const body = patchCall?.options.body as { metadata: Record<string, unknown> };
    expect(body.metadata).toEqual({ someOtherField: "keep-me", wabaPhoneNumberId: "12345" });
  });
});
