import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202607110001_sprint16_pilot_readiness_admin_hardening.sql"), "utf8");

describe("Sprint 16 pilot readiness migration", () => {
  it("adds tenant-scoped pilot readiness events with RLS", () => {
    expect(migration).toContain("create table if not exists public.pilot_readiness_events");
    expect(migration).toContain("alter table public.pilot_readiness_events enable row level security");
    expect(migration).toContain("create policy pilot_readiness_events_member_select");
    expect(migration).toContain("create policy pilot_readiness_events_member_insert");
    expect(migration).not.toContain("using (true)");
  });

  it("adds audit log indexes needed for exports and review filtering", () => {
    expect(migration).toContain("create index if not exists audit_logs_sprint16_resource_idx");
    expect(migration).toContain("create index if not exists audit_logs_sprint16_action_idx");
    expect(migration).toContain("create index if not exists pilot_readiness_events_org_step_idx");
  });
});
