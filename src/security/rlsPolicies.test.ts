import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "202607030001_sprint6_server_auth_repositories.sql"),
  "utf8",
);

describe("Sprint 6 RLS migration", () => {
  it("creates invitation RLS policies scoped to organization admins", () => {
    expect(migration).toContain("create table if not exists public.invitations");
    expect(migration).toContain("create policy invitations_admin_select");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']");
  });

  it("keeps audit logs tenant-scoped and export-ready", () => {
    expect(migration).toContain("add column if not exists category text");
    expect(migration).toContain("add column if not exists request_id text");
    expect(migration).toContain("create policy audit_logs_member_insert");
    expect(migration).toContain("public.is_org_member(organization_id)");
  });

  it("adds automatic audit triggers for core business changes", () => {
    expect(migration).toContain("project.created");
    expect(migration).toContain("task.updated");
    expect(migration).toContain("meeting.created");
    expect(migration).toContain("role.changed");
    expect(migration).toContain("permission.changed");
    expect(migration).toContain("audit_role_permissions_changes");
  });

  it("explicitly grants Data API access while relying on RLS for row access", () => {
    expect(migration).toContain("grant usage on schema public to authenticated");
    expect(migration).toContain("public.projects");
    expect(migration).toContain("public.invitations");
  });
});
