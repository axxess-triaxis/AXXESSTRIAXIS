import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202607120001_sprint18_pilot_conversion_audit_exports.sql"), "utf8");

describe("Sprint 18 pilot conversion migration", () => {
  it("adds governed audit exports with tenant admin RLS", () => {
    expect(migration).toContain("create table if not exists public.audit_exports");
    expect(migration).toContain("alter table public.audit_exports enable row level security");
    expect(migration).toContain("create policy audit_exports_admin_select");
    expect(migration).toContain("create policy audit_exports_admin_insert");
    expect(migration).toContain("export_token_hash text not null");
    expect(migration).not.toContain("using (true)");
  });

  it("adds invitation delivery events without granting authenticated writes", () => {
    expect(migration).toContain("create table if not exists public.invitation_delivery_events");
    expect(migration).toContain("recipient_email_hash text");
    expect(migration).toContain("create policy invitation_delivery_events_admin_select");
    expect(migration).toContain("grant select on public.invitation_delivery_events to authenticated");
    expect(migration).not.toContain("grant select, insert on public.invitation_delivery_events to authenticated");
  });
});
