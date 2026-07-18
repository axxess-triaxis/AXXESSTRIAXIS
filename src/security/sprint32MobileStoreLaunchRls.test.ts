import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260718143000_sprint32_mobile_store_launch.sql"), "utf8");

describe("Sprint 32 mobile store launch RLS", () => {
  it("adds release runs, listing packs, reviewer accounts, health events, and rollout tables", () => {
    expect(migration).toContain("create table if not exists public.mobile_release_runs");
    expect(migration).toContain("create table if not exists public.mobile_store_listings");
    expect(migration).toContain("create table if not exists public.mobile_reviewer_accounts");
    expect(migration).toContain("create table if not exists public.mobile_crash_events");
    expect(migration).toContain("create table if not exists public.mobile_rollout_events");
  });

  it("enables RLS, explicit grants, and organization-admin write policies", () => {
    [
      "mobile_release_runs",
      "mobile_store_listings",
      "mobile_reviewer_accounts",
      "mobile_crash_events",
      "mobile_rollout_events",
    ].forEach((table) => {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant select, insert, update on public.${table} to authenticated`);
      expect(migration).toContain(`grant all on public.${table} to service_role`);
    });

    expect(migration).toContain("create policy mobile_release_runs_member_select");
    expect(migration).toContain("create policy mobile_store_listings_admin_insert");
    expect(migration).toContain("create policy mobile_reviewer_accounts_admin_update");
    expect(migration).toContain("create policy mobile_crash_events_member_select");
    expect(migration).toContain("create policy mobile_rollout_events_admin_insert");
    expect(migration).toContain("public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])");
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });
});
