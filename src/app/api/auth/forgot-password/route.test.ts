import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src", "app", "api", "auth", "forgot-password", "route.ts"), "utf8");

describe("POST /api/auth/forgot-password", () => {
  it("logs the real Supabase failure reason server-side instead of swallowing it", () => {
    // Previously this route's catch block discarded the real error entirely -- a live SMTP
    // relay failure (e.g. Elastic Mail rejecting Supabase's send attempt) was undiagnosable
    // from anywhere but guessing. Fixed to log it the same way /api/auth/login does.
    expect(source).toContain("SupabaseAuthError");
    expect(source).toContain("console.error(`[auth/forgot-password] Supabase password recovery failed");
  });

  it("still returns the same safe generic message to the client, not the raw Supabase error", () => {
    expect(source).toContain('{ error: "Unable to start password recovery." }');
  });

  it("never logs the requested email address alongside the failure", () => {
    expect(source).not.toMatch(/console\.error\([^)]*\$\{email\}/);
  });
});
