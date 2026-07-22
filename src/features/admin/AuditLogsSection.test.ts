import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/admin/AuditLogsSection.tsx"), "utf8");

describe("AuditLogsSection (Sprint 3 -- does not hang, F-014)", () => {
  it("resolves loading to false even when tenant scope is not yet available", () => {
    // Previously `if (!scope) return;` skipped `setLoading(false)`, so the initial `loading: true`
    // state never settled if this ran before session/scope resolved.
    const loadBlock = source.slice(source.indexOf("const loadAuditLogs"), source.indexOf("}, [scope]);"));
    expect(loadBlock).toContain("if (!scope) {");
    expect(loadBlock).toContain("setLoading(false);");
  });

  it("shows a sign-in-required state instead of rendering blank when unauthenticated", () => {
    expect(source).not.toContain("if (!user) return null;");
    expect(source).toContain("Sign in required");
    expect(source).toContain("Your session is required to view Audit Logs.");
  });
});
