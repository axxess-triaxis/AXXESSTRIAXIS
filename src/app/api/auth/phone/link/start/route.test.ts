import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { accessToken: string; user: { id: string; organizationId: string; role: string } },
  phoneAuthEnabled: true,
  linkStartError: undefined as Error | undefined,
};

vi.mock("../../../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
  linkPhoneStartServerSide: async () => {
    if (state.linkStartError) throw state.linkStartError;
  },
}));

vi.mock("../../../../../../auth/authApi", () => ({
  phoneAuthEnabled: () => state.phoneAuthEnabled,
}));

import { SupabaseAuthError } from "../../../../../../auth/supabaseAuthError";
import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("https://app.test/api/auth/phone/link/start", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/auth/phone/link/start", () => {
  afterEach(() => {
    state.session = null;
    state.phoneAuthEnabled = true;
    state.linkStartError = undefined;
    vi.clearAllMocks();
  });

  it("requires an authenticated session -- this is a linking action, not a sign-in", async () => {
    const response = await POST(request({ phone: "+911234567890" }));
    expect(response.status).toBe(401);
  });

  it("rejects a missing phone number", async () => {
    state.session = { accessToken: "access-1", user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    const response = await POST(request({}));
    expect(response.status).toBe(400);
  });

  it("rejects when phone auth is not enabled for this deployment", async () => {
    state.session = { accessToken: "access-1", user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    state.phoneAuthEnabled = false;
    const response = await POST(request({ phone: "+911234567890" }));
    expect(response.status).toBe(400);
  });

  it("succeeds and returns ok:true", async () => {
    state.session = { accessToken: "access-1", user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    const response = await POST(request({ phone: "+911234567890" }));
    const body = await response.json() as { ok: boolean };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("surfaces Supabase's real error message (authenticated context, safe to show), unlike the unauthenticated sign-in routes' generic message", async () => {
    state.session = { accessToken: "access-1", user: { id: "user-1", organizationId: "org-1", role: "Manager" } };
    state.linkStartError = new SupabaseAuthError(422, "phone_exists", "A user with this phone number already exists");
    const response = await POST(request({ phone: "+911234567890" }));
    const body = await response.json() as { error: string };
    expect(response.status).toBe(502);
    expect(body.error).toBe("A user with this phone number already exists");
  });
});
