import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/admin/OrganizationAdminSection.tsx"), "utf8");

describe("OrganizationAdminSection (Sprint 3 -- does not hang, F-014)", () => {
  it("resolves loading to false even when tenant scope is not yet available", () => {
    // Previously `if (!scope || !user) return;` skipped resetting `loading`, so the state's
    // initial `loading: true` never settled if this ran before session/scope resolved -- a genuine
    // (if narrow) indefinite-loading path. Now it always settles to a terminal state.
    const loadBlock = source.slice(source.indexOf("const loadAdminState"), source.indexOf("}, [scope, user]);"));
    expect(loadBlock).toContain("if (!scope || !user) {");
    expect(loadBlock).toContain("setState((current) => ({ ...current, loading: false }));");
  });

  it("shows a sign-in-required state instead of rendering blank when unauthenticated", () => {
    expect(source).not.toContain("if (!user) return null;");
    expect(source).toContain("Sign in required");
    expect(source).toContain("Your session is required to view Organization Admin.");
  });
});

describe("OrganizationAdminSection pilot controls (Sprint 5 -- Department/Workspace honesty fix)", () => {
  it("does not claim the Department map control is Ready, since no department-permission mapping code exists", () => {
    const controlsBlock = source.slice(source.indexOf("const pilotControls"), source.indexOf("export function OrganizationAdminSection"));
    const departmentLine = controlsBlock
      .split("\n")
      .find((line) => line.includes("Department map"));
    expect(departmentLine).toBeDefined();
    expect(departmentLine).not.toContain('status: "Ready"');
    expect(departmentLine).toContain('status: "Not built"');
  });
});
