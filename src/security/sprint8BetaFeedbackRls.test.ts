import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260703083916_sprint8_beta_feedback.sql"),
  "utf8",
);

describe("Sprint 8 beta feedback migration", () => {
  it("creates the beta feedback table with required fields", () => {
    expect(migration).toContain("create table if not exists public.beta_feedback");
    expect(migration).toContain("feedback_type text not null");
    expect(migration).toContain("permission_to_contact boolean not null default false");
    expect(migration).toContain("metadata jsonb not null default '{}'::jsonb");
  });

  it("enables RLS and owner/admin access policies", () => {
    expect(migration).toContain("alter table public.beta_feedback enable row level security");
    expect(migration).toContain("create policy beta_feedback_owner_or_admin_select");
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("public.has_any_role(organization_id, array['Super Admin', 'Organization Admin']::public.app_role[])");
  });

  it("grants authenticated Data API access explicitly", () => {
    expect(migration).toContain("grant select, insert, update on public.beta_feedback to authenticated");
  });
});
