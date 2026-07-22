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
});
