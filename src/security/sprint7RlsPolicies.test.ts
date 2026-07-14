import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260703083915_sprint7_crud_workflows.sql"),
  "utf8",
);

describe("Sprint 7 CRUD and RLS migration", () => {
  it("adds editable workflow fields for projects, tasks, meetings, and notifications", () => {
    expect(migration).toContain("add column if not exists description text");
    expect(migration).toContain("add column if not exists priority public.task_priority");
    expect(migration).toContain("add column if not exists attendee_ids uuid[]");
    expect(migration).toContain("add column if not exists type text");
  });

  it("keeps notification creation RLS-scoped to organization members", () => {
    expect(migration).toContain("create policy notifications_sprint7_member_insert");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("with check (public.is_org_member(organization_id))");
  });

  it("audits meeting updates as well as meeting creates", () => {
    expect(migration).toContain("drop trigger if exists audit_meetings_changes");
    expect(migration).toContain("after insert or update on public.meetings");
  });

  it("adds indexed tenant filters for workflow E2E paths", () => {
    expect(migration).toContain("projects_sprint7_owner_status_idx");
    expect(migration).toContain("tasks_sprint7_program_idx");
    expect(migration).toContain("notifications_sprint7_type_idx");
  });
});
