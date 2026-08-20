import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/app/api/connectors/gmail/messages/list/route.ts"), "utf8");

describe("Gmail mailbox list API", () => {
  it("uses server session, Supabase admin runtime, and token vault before listing messages", () => {
    expect(source).toContain("getServerAuthSession(true)");
    expect(source).toContain("isSupabaseAdminConfigured");
    expect(source).toContain("isTokenVaultConfigured");
    expect(source).toContain("openTokenBundle");
  });

  it("returns provider-gated responses without failing the UI when credentials are missing", () => {
    expect(source).toContain("providerGated");
    expect(source).toContain("messages: []");
    expect(source).toContain("fetchGmailMailboxMessages");
  });

  it("scopes the connection and token vault lookups to the signed-in user's organization", () => {
    expect(source).toContain("session.user.organizationId");
    expect(source).toContain('provider_id: "eq.gmail"');
  });
});
