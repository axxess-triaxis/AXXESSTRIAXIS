import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { accessToken: string; user: { id: string; organizationId: string; role: string } },
  phoneAuthEnabled: true,
  linkedUser: undefined as { id: string; organizationId: string; role: string } | undefined,
  verifyError: undefined as Error | undefined,
};

vi.mock("../../../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
  linkPhoneVerifyServerSide: async () => {
    if (state.verifyError) throw state.verifyError;
    return state.linkedUser;
  },
}));

vi.mock("../../../../../../auth/authApi", () => ({
  phoneAuthEnabled: () => state.phoneAuthEnabled,
}));

vi.mock("../../../../../../repositories/supabaseEnterpriseRepositories", () => ({
  auditLogsRepository: { record: async () => undefined },
}));

import { SupabaseAuthError } from "../../../../../../auth/supabaseAuthError";
import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("https://app.test/api/auth/phone/link/verify", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/auth/phone/link/verify", () => {
  afterEach(() => {
    state.session = null;
    state.phoneAuthEnabled = true;
    state.linkedUser = undefined;
    state.verifyError = undefined;
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await POST(request({ phone: "+911234567890", token: "123456" }));
    expect(response.status).toBe(401);
  });

  it("rejects a missing phone or token", async () => {
    state.session = { accessToken: "access-1", user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    const response = await POST(request({ phone: "+911234567890" }));
    expect(response.status).toBe(400);
  });

  it("returns the SAME existing user/tenant on success -- never creates or implies a new one", async () => {
    state.session = { accessToken: "access-1", user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    state.linkedUser = { id: "user-1", organizationId: "org-1", role: "Manager" };
    const response = await POST(request({ phone: "+911234567890", token: "123456" }));
    const body = await response.json() as { user: { id: string; organizationId: string } };
    expect(response.status).toBe(200);
    expect(body.user).toEqual({ id: "user-1", organizationId: "org-1", role: "Manager" });
  });

  it("surfaces the real Supabase error (e.g. phone already claimed by a stray identity) rather than a generic message", async () => {
    state.session = { accessToken: "access-1", user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    state.verifyError = new SupabaseAuthError(422, "phone_exists", "A user with this phone number already exists");
    const response = await POST(request({ phone: "+911234567890", token: "123456" }));
    const body = await response.json() as { error: string };
    expect(response.status).toBe(502);
    expect(body.error).toBe("A user with this phone number already exists");
  });
});
