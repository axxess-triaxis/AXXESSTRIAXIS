import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "auth", "resend-confirmation", "route.ts"), "utf8");

describe("POST /api/auth/resend-confirmation", () => {
  it("requires an email", () => {
    expect(source).toContain("if (!email) {");
    expect(source).toContain('{ error: "Email is required." }, { status: 400 }');
  });

  it("calls Supabase's resend endpoint for the signup confirmation type", () => {
    expect(source).toContain('callSupabaseAuth("resend", { type: "signup", email })');
  });

  it("always returns the same success response regardless of whether the account exists or the resend succeeded, to avoid account enumeration", () => {
    const catchBlock = source.slice(source.indexOf("} catch (error) {"), source.indexOf("// Always return"));
    expect(catchBlock).not.toContain("NextResponse.json");
    expect(source).toContain('NextResponse.json({ ok: true, message: "If an account exists for that email, a new confirmation link has been sent." });');
  });
});
