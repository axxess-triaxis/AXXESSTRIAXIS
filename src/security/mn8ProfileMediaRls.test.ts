import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260824120000_profile_media_avatar_logo.sql"),
  "utf8",
);

// MN-8 (2026-08-24): docs/readiness/ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md items
// 13-14. Static assertions against the migration text, matching this repo's established RLS-test
// pattern (see sprint9KnowledgeHubRls.test.ts) rather than a live database.
describe("MN-8 profile media (avatar/logo) migration", () => {
  it("adds the new columns with the documented naming/casing decision", () => {
    expect(migration).toContain("add column if not exists avatar_path text");
    expect(migration).toContain("availability text not null default 'public'");
    expect(migration).toContain("check (availability in ('public', 'private', 'inactive'))");
  });

  it("creates a dedicated public bucket, not a path prefix in axxess-documents", () => {
    expect(migration).toContain("'axxess-avatars'");
    expect(migration).toContain("public = true");
    expect(migration).toContain("4194304");
    expect(migration).not.toContain("'axxess-documents'");
  });

  it("gates avatar writes to the caller's own userId subfolder, any role", () => {
    expect(migration).toContain("create policy axxess_avatars_storage_avatar_insert");
    expect(migration).toContain("(storage.foldername(name))[4] = auth.uid()::text");
    expect(migration).toContain("(storage.foldername(name))[5] = 'avatar'");
  });

  it("gates logo writes to Super Admin/Organization Admin, same tenant", () => {
    expect(migration).toContain("create policy axxess_avatars_storage_logo_insert");
    expect(migration).toContain("array['Super Admin', 'Organization Admin']::public.app_role[]");
    expect(migration).toContain("(storage.foldername(name))[3] = 'logo'");
  });

  it("uses tenant/role predicates, not auth.role() or a permissive using(true)", () => {
    expect(migration).toContain("public.is_org_member(");
    expect(migration).toContain("public.has_any_role(");
    expect(migration).toContain("to authenticated");
    expect(migration).not.toContain("auth.role()");
    expect(migration).not.toContain("using (true)");
  });
});
