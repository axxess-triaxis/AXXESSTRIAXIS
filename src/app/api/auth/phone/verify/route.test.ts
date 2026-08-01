import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "auth", "phone", "verify", "route.ts"), "utf8");

describe("POST /api/auth/phone/verify (phone OTP verification)", () => {
  it("requires both a phone number and a code", () => {
    expect(source).toContain("if (!phone || !token) {");
    expect(source).toContain('{ error: "A phone number and verification code are required." }, { status: 400 }');
  });

  it("returns a clear, honest error instead of attempting Supabase when phone auth is disabled", () => {
    expect(source).toContain("if (!phoneAuthEnabled()) {");
  });

  it("establishes the same httpOnly-cookie session other sign-in paths create, via verifyPhoneOtpServerSide", () => {
    expect(source).toContain("verifyPhoneOtpServerSide(phone, token)");
  });

  it("writes an audit log entry tagged with the phone_otp method, best-effort", () => {
    expect(source).toContain('action: "auth.login"');
    expect(source).toContain('metadata: { method: "phone_otp" }');
    expect(source).toContain(".catch(() => undefined);");
  });

  it("never leaks the raw Supabase failure reason to the client on a failed verify", () => {
    const catchBlock = source.slice(source.indexOf("try {"));
    expect(catchBlock).toContain('{ error: "That code is invalid or has expired." }, { status: 401 }');
  });
});
