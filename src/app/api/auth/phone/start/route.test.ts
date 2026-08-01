import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "auth", "phone", "start", "route.ts"), "utf8");

describe("POST /api/auth/phone/start (phone OTP request)", () => {
  it("requires a phone number", () => {
    expect(source).toContain("if (!phone) {");
    expect(source).toContain('{ error: "A phone number is required." }, { status: 400 }');
  });

  it("returns a clear, honest error instead of attempting Supabase when phone auth is disabled", () => {
    expect(source).toContain("if (!phoneAuthEnabled()) {");
    expect(source).toContain('{ error: "Phone sign-in is not enabled for this deployment." }, { status: 400 }');
  });

  it("requests the OTP through Supabase Auth's otp endpoint via callSupabaseAuth", () => {
    expect(source).toContain('callSupabaseAuth("otp", { phone })');
  });

  it("logs the real Supabase failure reason server-side instead of swallowing it", () => {
    expect(source).toContain("SupabaseAuthError");
    expect(source).toContain("console.error(`[auth/phone/start] Supabase OTP request failed");
  });
});
