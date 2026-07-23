import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "auth", "sign-up", "route.ts"), "utf8");

describe("POST /api/auth/sign-up", () => {
  it("logs the real Supabase error server-side instead of swallowing it", () => {
    expect(source).toContain("SupabaseAuthError");
    expect(source).toContain("console.error(`[auth/sign-up] Supabase sign-up failed");
  });

  it("returns a distinct, actionable response when the account already exists", () => {
    expect(source).toContain('error.code === "user_already_exists"');
    expect(source).toContain('code: "user_already_exists"');
    expect(source).toContain("status: 409");
  });

  it("still returns a safe generic error for unrecognized failures", () => {
    expect(source).toContain("Unable to create account. Check Supabase Auth settings and email confirmation configuration.");
  });

  it("never logs the password", () => {
    expect(source).not.toMatch(/console\.error\([^)]*password/i);
  });
});
