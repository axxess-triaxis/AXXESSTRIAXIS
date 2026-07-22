import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "scripts", "verify-two-tenant-isolation.mjs"), "utf8");

describe("two-tenant isolation harness (Sprint 5 -- WS2, gap-analysis Phase 4 follow-up)", () => {
  it("covers every resource type the sprint requires: projects, tasks, documents, knowledge articles, audit logs, workflow timeline events", () => {
    expect(source).toContain('const REQUIRED_COVERAGE = ["projects", "tasks", "documents", "knowledge_articles", "audit_logs", "workflow_timeline_events"];');
  });

  it("refuses to run without real Supabase credentials rather than silently no-op'ing or faking a pass", () => {
    expect(source).toContain("function requireConfig()");
    expect(source).toContain("process.exit(1)");
  });

  it("creates two genuinely separate organizations, each with its own real signed-in user", () => {
    expect(source).toContain("async function setUpTenant(label, runId)");
    expect(source).toContain("/rest/v1/organizations");
    expect(source).toContain("async function signIn(email, password)");
  });

  it("checks both cross-tenant read and cross-tenant write for every resource, using tenant B's own access token (real RLS, not application code)", () => {
    expect(source).toContain("async function checkResourceIsolation(tenantA, tenantB, config)");
    expect(source).toContain("result.crossTenantReadBlocked = !visibleToB;");
    expect(source).toContain("result.crossTenantWriteBlocked = !mutatedByB;");
    expect(source).toContain("userRequest(tenantB.accessToken");
  });

  it("only reports passed when every resource is covered with no failures, and fails loudly (non-zero exit) otherwise", () => {
    expect(source).toContain('status: failures.length === 0 && coverageMissing.length === 0 ? "passed" : "failed"');
    expect(source).toContain('if (summary.status !== "passed") process.exitCode = 1;');
  });

  it("cleans up every test tenant it creates (organizations cascade-delete their rows; auth users and profiles are removed explicitly)", () => {
    expect(source).toContain("async function cleanUpTenant(tenant)");
    expect(source).toContain("/rest/v1/organizations?id=eq.");
    expect(source).toContain("/auth/v1/admin/users/");
  });

  it("is registered as an explicit, opt-in package.json script (never runs as part of the default verification suite)", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    expect(packageJson.scripts["supabase:verify:two-tenant-isolation"]).toBe("node scripts/verify-two-tenant-isolation.mjs");
  });
});
