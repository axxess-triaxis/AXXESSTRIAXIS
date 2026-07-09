import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202607090001_sprint12_security_compliance_foundation.sql"), "utf8");

describe("Sprint 12 security and compliance migration", () => {
  it("adds enterprise IAM roles and hierarchy tables", () => {
    expect(migration).toContain("alter type public.app_role add value if not exists 'Department Admin'");
    expect(migration).toContain("create table if not exists public.departments");
    expect(migration).toContain("create table if not exists public.workspaces");
    expect(migration).toContain("create table if not exists public.workspace_members");
  });

  it("adds privacy, compliance, AI governance, and vector manifest evidence tables", () => {
    expect(migration).toContain("create table if not exists public.privacy_requests");
    expect(migration).toContain("create table if not exists public.compliance_policies");
    expect(migration).toContain("create table if not exists public.prompt_registry");
    expect(migration).toContain("create table if not exists public.ai_output_audit");
    expect(migration).toContain("create table if not exists public.vector_index_manifests");
  });

  it("enables RLS and avoids authentication-only authorization", () => {
    expect(migration).toContain("alter table public.security_audit_events enable row level security");
    expect(migration).toContain("alter table public.ai_output_audit enable row level security");
    expect(migration).toContain("public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin', 'Auditor']");
    expect(migration).not.toContain("using (true)");
  });
});
