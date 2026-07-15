import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202607150003_sprint25_token_vault_gmail_rag_gates.sql"), "utf8");

describe("Sprint 25 token vault and Gmail import migration", () => {
  it("adds token vault, selected Gmail import, and fan-out evidence tables", () => {
    expect(migration).toContain("create table if not exists public.oauth_token_vault");
    expect(migration).toContain("create table if not exists public.gmail_selected_message_imports");
    expect(migration).toContain("create table if not exists public.command_center_snapshot_runs");
    expect(migration).toContain("encrypted_payload jsonb not null");
  });

  it("keeps the token vault service-role-only and protects tenant evidence with RLS", () => {
    expect(migration).toContain("alter table public.oauth_token_vault enable row level security");
    expect(migration).toContain("alter table public.gmail_selected_message_imports enable row level security");
    expect(migration).toContain("alter table public.command_center_snapshot_runs enable row level security");
    expect(migration).toContain("revoke all on public.oauth_token_vault from anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("create policy gmail_selected_message_imports_member_select");
    expect(migration).not.toMatch(/grant\s+select[^;]+oauth_token_vault[^;]+authenticated/i);
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });
});
