import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260716132406_sprint28_pilot_release_gates_integrations.sql"), "utf8");

describe("Sprint 28 pilot release migration", () => {
  it("adds first-class workflow action and Microsoft import tables", () => {
    expect(migration).toContain("create table if not exists public.approval_requests");
    expect(migration).toContain("create table if not exists public.stakeholder_notes");
    expect(migration).toContain("create table if not exists public.project_updates");
    expect(migration).toContain("create table if not exists public.microsoft_selected_message_imports");
    expect(migration).toContain("create table if not exists public.dashboard_snapshot_deltas");
    expect(migration).toContain("create table if not exists public.audit_export_timeline_links");
  });

  it("enables RLS, explicit grants, and tenant/role-scoped policies", () => {
    [
      "approval_requests",
      "stakeholder_notes",
      "project_updates",
      "microsoft_selected_message_imports",
      "dashboard_snapshot_deltas",
      "audit_export_timeline_links",
    ].forEach((table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    });
    expect(migration).toContain("create policy approval_requests_member_select");
    expect(migration).toContain("create policy stakeholder_notes_member_insert");
    expect(migration).toContain("create policy project_updates_member_update");
    expect(migration).toContain("create policy microsoft_selected_message_imports_member_select");
    expect(migration).toContain("create policy dashboard_snapshot_deltas_admin_select");
    expect(migration).toContain("create policy audit_export_timeline_links_admin_insert");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });
});
