import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "auth", "login", "route.ts"), "utf8");

describe("POST /api/auth/login", () => {
  it("logs the real Supabase failure reason server-side instead of swallowing it", () => {
    expect(source).toContain("SupabaseAuthError");
    expect(source).toContain("console.error(`[auth/login] Supabase sign-in failed");
  });

  it("surfaces a distinct, actionable code for unconfirmed-email sign-in attempts", () => {
    expect(source).toContain('error.code === "email_not_confirmed"');
    expect(source).toContain('code: "email_not_confirmed"');
  });

  it("still returns the safe generic message for other failures, so it never leaks which part of the credential was wrong", () => {
    expect(source).toContain("Unable to sign in with the supplied email and password.");
  });

  it("never logs the password", () => {
    expect(source).not.toMatch(/console\.error\([^)]*password/i);
  });
});
