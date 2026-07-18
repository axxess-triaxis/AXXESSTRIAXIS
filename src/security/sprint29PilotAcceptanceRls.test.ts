import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260718114500_sprint29_pilot_tenant_acceptance_live_ops.sql"), "utf8");

describe("Sprint 29 pilot acceptance RLS", () => {
  it("adds pilot acceptance, checklist, and live-ops evidence tables", () => {
    expect(migration).toContain("create table if not exists public.pilot_tenant_acceptance_runs");
    expect(migration).toContain("create table if not exists public.pilot_acceptance_checklist_items");
    expect(migration).toContain("create table if not exists public.pilot_live_ops_events");
  });

  it("enables RLS, explicit grants, and admin/member policies", () => {
    [
      "pilot_tenant_acceptance_runs",
      "pilot_acceptance_checklist_items",
      "pilot_live_ops_events",
    ].forEach((table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant select, insert, update on public.${table} to authenticated`);
      expect(migration).toContain(`grant all on public.${table} to service_role`);
    });

    expect(migration).toContain("create policy pilot_tenant_acceptance_runs_member_select");
    expect(migration).toContain("create policy pilot_tenant_acceptance_runs_admin_insert");
    expect(migration).toContain("create policy pilot_acceptance_checklist_items_member_select");
    expect(migration).toContain("create policy pilot_live_ops_events_admin_insert");
    expect(migration).toContain("public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])");
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });
});
