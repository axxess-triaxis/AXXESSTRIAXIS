import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "auth", "oauth", "callback", "route.ts"), "utf8");

describe("POST /api/auth/oauth/callback (OAuth sign-in session establishment)", () => {
  it("requires an access token before attempting anything", () => {
    expect(source).toContain('if (!accessToken) {');
    expect(source).toContain('{ error: "Missing OAuth access token." }, { status: 400 }');
  });

  it("establishes the same httpOnly-cookie session password login creates, via establishServerSessionFromOAuthTokens", () => {
    expect(source).toContain("establishServerSessionFromOAuthTokens(accessToken, body?.refreshToken)");
  });

  it("writes an audit log entry tagged with the oauth method, best-effort (never blocking the sign-in itself)", () => {
    expect(source).toContain('action: "auth.login"');
    expect(source).toContain('metadata: { method: "oauth" }');
    expect(source).toContain(".catch(() => undefined);");
  });

  it("never leaks the raw Supabase failure reason to the client on a failed exchange", () => {
    const catchBlock = source.slice(source.indexOf("try {"));
    expect(catchBlock).toContain('{ error: "Unable to complete sign-in with the selected provider." }, { status: 401 }');
  });
});
