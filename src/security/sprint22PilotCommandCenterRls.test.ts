import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202607150001_sprint22_23_pilot_command_center.sql"), "utf8");

describe("Sprint 22/23 pilot command center migration", () => {
  it("adds tenant-scoped command-center evidence tables", () => {
    expect(migration).toContain("create table if not exists public.pilot_command_center_snapshots");
    expect(migration).toContain("create table if not exists public.ai_operation_reviews");
    expect(migration).toContain("create table if not exists public.connector_execution_queue");
    expect(migration).toContain("create table if not exists public.sandbox_policy_attestations");
    expect(migration).toContain("create table if not exists public.rag_evaluation_runs");
    expect(migration).toContain("organization_id uuid not null references public.organizations(id) on delete cascade");
  });

  it("enables RLS with explicit admin/member policies", () => {
    expect(migration).toContain("alter table public.pilot_command_center_snapshots enable row level security");
    expect(migration).toContain("alter table public.ai_operation_reviews enable row level security");
    expect(migration).toContain("alter table public.connector_execution_queue enable row level security");
    expect(migration).toContain("alter table public.sandbox_policy_attestations enable row level security");
    expect(migration).toContain("alter table public.rag_evaluation_runs enable row level security");
    expect(migration).toContain("create policy pilot_command_center_snapshots_admin_access");
    expect(migration).toContain("create policy ai_operation_reviews_member_select");
    expect(migration).toContain("create policy connector_execution_queue_admin_update");
    expect(migration).toContain("public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])");
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });
});
