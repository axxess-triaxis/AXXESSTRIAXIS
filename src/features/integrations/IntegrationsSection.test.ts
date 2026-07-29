import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/integrations/IntegrationsSection.tsx"), "utf8");

describe("IntegrationsSection (Sprint 3 -- does not hang, no raw backend error text)", () => {
  it("never throws the raw backend error/message string for any connector action", () => {
    expect(source).not.toContain("throw new Error(result.message ?? \"Microsoft mailbox listing failed.\")");
    expect(source).not.toContain("throw new Error(result.error ?? \"Email import failed.\")");
    expect(source).not.toContain("throw new Error(result.message ?? \"Notion page listing failed.\")");
    expect(source).not.toContain("throw new Error(result.error ?? \"Notion page preview failed.\")");
    expect(source).not.toContain("throw new Error(result.error ?? \"Notion page import failed.\")");
    expect(source).not.toContain("throw new Error(result.error ?? result.message ?? \"Saving credentials failed.\")");
  });

  it("maps unauthorized/forbidden connector failures to safe, specific copy and logs the raw detail", () => {
    expect(source).toContain("Sign in to list Microsoft mailbox messages.");
    expect(source).toContain("Sign in to import email.");
    expect(source).toContain("Sign in to list Notion pages.");
    expect(source).toContain("Sign in to preview this Notion page.");
    expect(source).toContain("Sign in to import this Notion page.");
    expect(source).toContain("Sign in to configure connector credentials.");
    expect(source).toContain("Your role does not have permission to configure connector credentials.");
    const consoleErrorCount = (source.match(/console\.error\(/g) ?? []).length;
    expect(consoleErrorCount).toBeGreaterThanOrEqual(6);
  });

  it("never exposes the raw credential-save error string, since this panel handles provider secrets", () => {
    const saveBlock = source.slice(source.indexOf("async function saveCredentials"), source.indexOf("async function revokeCredentials"));
    expect(saveBlock).not.toContain("throw new Error(result.error ?? result.message");
    expect(saveBlock).toContain("Saving connector credentials failed.");
  });

  it("gates the illustrative sample mailbox messages behind demo mode, not shown to real tenants (SA-2b, 2026-07-29)", () => {
    // A real tenant who connected a real Gmail/Microsoft account and hadn't loaded a real inbox
    // yet used to see the seeded NEMH sample messages (@nemh.example) as if they were their own --
    // indistinguishable, no "example" labeling. Same failure class as A-28/DEMO_DATA_LEAKAGE_AUDIT.md.
    const mailboxBlock = source.slice(source.indexOf("const mailboxMessages ="), source.indexOf("const mailboxMessages =") + 400);
    expect(mailboxBlock).toContain("isDemoModeEnabled()");
    expect(mailboxBlock).toContain("selectedMailboxMessages");
  });

  it("shows an honest empty state for a real tenant with no loaded mailbox messages", () => {
    expect(source).toContain("Connect Gmail or Microsoft above, then load your inbox to see real messages here.");
  });
});
