import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260718133000_sprint30_customer_success_live_ops.sql"), "utf8");

describe("Sprint 30 customer-success live-ops RLS", () => {
  it("adds customer-success snapshot, recovery, SLA, and regional key tables", () => {
    expect(migration).toContain("create table if not exists public.customer_success_live_ops_snapshots");
    expect(migration).toContain("create table if not exists public.customer_success_recovery_items");
    expect(migration).toContain("create table if not exists public.customer_success_sla_timers");
    expect(migration).toContain("create table if not exists public.regional_key_policies");
  });

  it("enables RLS, explicit grants, and admin/member policies", () => {
    [
      "customer_success_live_ops_snapshots",
      "customer_success_recovery_items",
      "customer_success_sla_timers",
      "regional_key_policies",
    ].forEach((table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant select, insert, update on public.${table} to authenticated`);
      expect(migration).toContain(`grant all on public.${table} to service_role`);
    });

    expect(migration).toContain("create policy customer_success_live_ops_snapshots_member_select");
    expect(migration).toContain("create policy customer_success_recovery_items_admin_insert");
    expect(migration).toContain("create policy customer_success_sla_timers_admin_update");
    expect(migration).toContain("create policy regional_key_policies_member_select");
    expect(migration).toContain("public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])");
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });
});
