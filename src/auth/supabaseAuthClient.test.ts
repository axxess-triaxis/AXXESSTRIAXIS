import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchServerSession, signInWithPassword } from "./supabaseAuthClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("client Supabase auth facade", () => {
  it("signs in through the server route without returning tokens", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      user: {
        id: "user_1",
        organizationId: "org_1",
        role: "Employee",
        email: "employee@example.com",
      },
    }), { status: 200 })));

    const session = await signInWithPassword("employee@example.com", "password");

    expect(session.user.email).toBe("employee@example.com");
    expect(session).not.toHaveProperty("accessToken");
    expect(session).not.toHaveProperty("refreshToken");
  });

  it("returns null when the server session route reports unauthorized", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    await expect(fetchServerSession()).resolves.toBeNull();
  });
});
