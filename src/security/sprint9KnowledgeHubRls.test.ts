import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "202607040001_sprint9_knowledge_hub.sql"),
  "utf8",
);

describe("Sprint 9 Knowledge Hub migration", () => {
  it("creates the document and knowledge tables", () => {
    expect(migration).toContain("create table if not exists public.document_versions");
    expect(migration).toContain("create table if not exists public.document_categories");
    expect(migration).toContain("create table if not exists public.document_tags");
    expect(migration).toContain("create table if not exists public.document_permissions");
    expect(migration).toContain("create table if not exists public.knowledge_articles");
  });

  it("adds PostgreSQL search vectors and indexes", () => {
    expect(migration).toContain("add column if not exists search_vector tsvector generated always as");
    expect(migration).toContain("documents_sprint9_search_idx");
    expect(migration).toContain("knowledge_articles_sprint9_search_idx");
  });

  it("keeps Supabase Storage private with signed URL-ready policies", () => {
    expect(migration).toContain("'axxess-documents'");
    expect(migration).toContain("public = false");
    expect(migration).toContain("create policy axxess_documents_storage_select");
    expect(migration).toContain("create policy axxess_documents_storage_insert");
    expect(migration).not.toContain("public = true");
  });

  it("enables RLS and explicit authenticated grants", () => {
    expect(migration).toContain("alter table public.documents enable row level security");
    expect(migration).toContain("alter table public.document_permissions enable row level security");
    expect(migration).toContain("alter table public.knowledge_articles enable row level security");
    expect(migration).toContain("grant select, insert, update, delete on");
    expect(migration).toContain("public.document_activity");
  });

  it("uses tenant and role predicates rather than auth.role checks", () => {
    expect(migration).toContain("public.is_org_member(organization_id)");
    expect(migration).toContain("public.has_any_role(organization_id");
    expect(migration).toContain("to authenticated");
    expect(migration).not.toContain("auth.role()");
  });
});
