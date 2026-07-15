import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/202607150002_sprint24_live_review_oauth_sandbox_gates.sql"), "utf8");

describe("Sprint 24 live operations migration", () => {
  it("adds OAuth, sandbox runner, and RAG gate evidence tables", () => {
    expect(migration).toContain("create table if not exists public.oauth_connection_states");
    expect(migration).toContain("create table if not exists public.sandbox_runner_invocations");
    expect(migration).toContain("create table if not exists public.rag_release_gates");
    expect(migration).toContain("add column if not exists token_expires_at");
    expect(migration).toContain("add column if not exists oauth_state_hash");
  });

  it("keeps new evidence tables RLS protected and role scoped", () => {
    expect(migration).toContain("alter table public.oauth_connection_states enable row level security");
    expect(migration).toContain("alter table public.sandbox_runner_invocations enable row level security");
    expect(migration).toContain("alter table public.rag_release_gates enable row level security");
    expect(migration).toContain("create policy oauth_connection_states_owner_or_admin");
    expect(migration).toContain("create policy sandbox_runner_invocations_admin_access");
    expect(migration).toContain("create policy rag_release_gates_admin_access");
    expect(migration).toContain("public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])");
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });
});
