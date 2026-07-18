import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/api/connectors/microsoft/messages/list/route.ts"), "utf8");

describe("Microsoft mailbox list API", () => {
  it("uses server session, Supabase admin runtime, and token vault before listing messages", () => {
    expect(source).toContain("getServerAuthSession(true)");
    expect(source).toContain("isSupabaseAdminConfigured");
    expect(source).toContain("isTokenVaultConfigured");
    expect(source).toContain("openTokenBundle");
  });

  it("returns provider-gated responses without failing the UI when credentials are missing", () => {
    expect(source).toContain("providerGated");
    expect(source).toContain("messages: []");
    expect(source).toContain("fetchMicrosoftGraphMailboxMessages");
  });
});
