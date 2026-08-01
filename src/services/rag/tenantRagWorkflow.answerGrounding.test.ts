import { afterEach, describe, expect, it, vi } from "vitest";

// RAG Remediation Sprint 2 (WS1/A-55): proves real indexed-document content drives the answer
// text through the *persistent* Supabase-backed citation path (persistentCitationsForQuestion),
// which the pre-existing tenantRagWorkflow.test.ts suite does not exercise -- that suite runs with
// isSupabaseAdminConfigured() false, so every answer there falls through to the local in-memory
// fallback (answerWithGovernedRag) instead. Isolated into its own file for the same reason
// tenantRagWorkflow.reviewInboxBridge.test.ts is: vi.mock is file-scoped, and this suite needs
// isSupabaseAdminConfigured() true while the main suite deliberately needs it false.
vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: vi.fn(async (table: string, options?: { query?: URLSearchParams }) => {
    if (table === "ai_output_audit") return [{ id: "audit-row-1" }];
    if (table === "rag_document_chunks") {
      const documentIdFilter = options?.query?.get("document_id") ?? "";
      return mockChunkRows.filter((row) => documentIdFilter.includes(row.document_id));
    }
    return [];
  }),
}));

import { deterministicEmbeddingProvider } from "./embeddings/embeddingProvider";
import type { TenantRagRepositories } from "./tenantRagWorkflow";
import { answerTenantQuestion } from "./tenantRagWorkflow";
import type { Document } from "../../domain";

const scope = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000101",
  role: "Employee" as const,
  accessToken: "token",
};

const otherOrgScope = { ...scope, organizationId: "00000000-0000-4000-8000-000000000002" };

const REAL_CHUNK_TEXT = "Biomedical maintenance variance remains the leading oxygen resilience risk for Dibrugarh and adjoining referral corridors.";
const STALE_PLACEHOLDER_TEXT = "Tenant 0 dummy data";

let mockChunkRows: Array<{
  id: string;
  organization_id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding_hash: number[];
  visibility: string;
  role_allowlist: string[];
  metadata: { title?: string };
}> = [];

function document(overrides: Partial<Document> & { id: string; title: string }): Document {
  return {
    organizationId: scope.organizationId,
    name: overrides.title,
    storagePath: `organizations/org/documents/${overrides.id}.txt`,
    mimeType: "text/plain",
    status: "active",
    visibility: "organization",
    classification: "internal",
    ownerId: scope.userId,
    tags: [],
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
    ...overrides,
  };
}

function repositories(documents: Document[]): TenantRagRepositories {
  return {
    documentsRepository: {
      list: vi.fn(async () => documents),
      getById: vi.fn(async (_s, id) => documents.find((d) => d.id === id)),
      create: vi.fn(), update: vi.fn(), archive: vi.fn(), restore: vi.fn(), softDelete: vi.fn(),
      listArchived: vi.fn(async () => []), listFavorites: vi.fn(async () => []), listSharedWithMe: vi.fn(async () => []),
      recordActivity: vi.fn(),
    },
    documentVersionsRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    documentPermissionsRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    knowledgeArticlesRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    tasksRepository: { list: vi.fn(async () => []), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLogsRepository: { list: vi.fn(async () => []), record: vi.fn(async () => ({ id: "audit-log-1" }) as never) },
  };
}

describe("answerTenantQuestion grounding against real indexed content (RAG Remediation Sprint 2, WS1)", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockChunkRows = [];
  });

  it("returns an answer grounded in the real indexed chunk, with no query-keyword-echo clause", async () => {
    const embedding = await deterministicEmbeddingProvider.embed(REAL_CHUNK_TEXT);
    mockChunkRows = [{
      id: "chunk-1",
      organization_id: scope.organizationId,
      document_id: "doc-1",
      chunk_index: 0,
      chunk_text: REAL_CHUNK_TEXT,
      embedding_hash: embedding,
      visibility: "organization",
      role_allowlist: [],
      metadata: { title: "District Oxygen Resilience Note" },
    }];
    const repo = repositories([document({ id: "doc-1", title: "District Oxygen Resilience Note" })]);

    const answer = await answerTenantQuestion(repo, scope, "What is the oxygen resilience risk for Dibrugarh?");

    expect(answer.sources[0]?.title).toBe("District Oxygen Resilience Note");
    expect(answer.answer).toContain("Dibrugarh");
    expect(answer.answer).not.toMatch(/strongest evidence relates to/i);
    expect(answer.confidenceExplanation.answerMode).toBe("local_extractive_summary");
  });

  // This is the direct, end-to-end proof that RAG Remediation Sprint 1's fix (canRetrieveDocument
  // excluding archived documents, see governedRag.ts) combined with Sprint 2's real-grounding fix
  // actually solves the founder's reported symptom: once the stale "Pitch deck" document is
  // archived (the HITL retest step from the Sprint 1 closeout), its chunk never reaches the answer
  // at all, and the answer is grounded only in the real, active document.
  it("excludes an archived stale-placeholder document's chunk once it is archived, per the Sprint 1 HITL retest step", async () => {
    const realEmbedding = await deterministicEmbeddingProvider.embed(REAL_CHUNK_TEXT);
    const staleEmbedding = await deterministicEmbeddingProvider.embed(STALE_PLACEHOLDER_TEXT);
    mockChunkRows = [
      {
        id: "chunk-real", organization_id: scope.organizationId, document_id: "doc-1", chunk_index: 0,
        chunk_text: REAL_CHUNK_TEXT, embedding_hash: realEmbedding, visibility: "organization", role_allowlist: [],
        metadata: { title: "District Oxygen Resilience Note" },
      },
      {
        id: "chunk-stale", organization_id: scope.organizationId, document_id: "doc-stale", chunk_index: 0,
        chunk_text: STALE_PLACEHOLDER_TEXT, embedding_hash: staleEmbedding, visibility: "organization", role_allowlist: [],
        metadata: { title: "Pitch deck" },
      },
    ];
    const repo = repositories([
      document({ id: "doc-1", title: "District Oxygen Resilience Note" }),
      document({ id: "doc-stale", title: "Pitch deck", status: "archived" }),
    ]);

    const answer = await answerTenantQuestion(repo, scope, "What is the oxygen resilience risk for Dibrugarh?");

    expect(answer.sources.map((source) => source.title)).not.toContain("Pitch deck");
    expect(answer.answer).not.toContain("Tenant 0 dummy data");
  });

  it("gives an honest no-fabrication answer when no document exists for this tenant at all", async () => {
    // Deliberately no documents and no chunks -- answerTenantQuestion falls back from the
    // persistent-chunk path to governedRag.ts's document-metadata-based path when citations come
    // back empty (see the module comment above), so a "no match" test must ensure *both* paths
    // have nothing to match, not just an empty rag_document_chunks result.
    const repo = repositories([]);

    const answer = await answerTenantQuestion(repo, scope, "What is the oxygen resilience risk for Dibrugarh?");

    expect(answer.sources).toHaveLength(0);
    expect(answer.confidence).toBe(0);
    expect(answer.confidenceExplanation.answerMode).toBe("no_authorized_source");
    expect(answer.answer).toMatch(/no authorized institutional source matched/i);
  });

  // The next two tests deliberately do not assert `sources` is empty: answerTenantQuestion falls
  // back to governedRag.ts's document-metadata-based retrieval whenever the persistent-chunk path
  // returns zero citations (see the module comment above), and this codebase's deterministic
  // 16-dimension hash embedding has a real, measurable collision rate -- an authorized document's
  // own title can legitimately (if coincidentally) match an unrelated query through that fallback.
  // That is a separate, independently-authorized retrieval, not a leak. What must never happen,
  // and what these tests actually verify, is that the specific excluded chunk's own text -- the
  // cross-tenant/restricted content itself -- never appears anywhere in the answer.

  it("never includes another tenant's indexed chunk content, even if it were returned under a shared document id", async () => {
    const embedding = await deterministicEmbeddingProvider.embed(REAL_CHUNK_TEXT);
    // Defends persistentCitationsForQuestion's own row-level `row.organization_id ===
    // scope.organizationId` check: this tenant legitimately owns "doc-1" (so it passes the
    // authorized-documents gate and the row query includes doc-1), but the chunk row claims a
    // different organization_id -- simulating a cross-tenant data leak at the storage layer, which
    // the application-layer filter must still reject regardless of how the row arrived.
    mockChunkRows = [{
      id: "chunk-cross-org", organization_id: otherOrgScope.organizationId, document_id: "doc-1", chunk_index: 0,
      chunk_text: REAL_CHUNK_TEXT, embedding_hash: embedding, visibility: "organization", role_allowlist: [],
      metadata: { title: "Cross-Tenant Leak Attempt" },
    }];
    const repo = repositories([document({ id: "doc-1", title: "District Oxygen Resilience Note" })]);

    const answer = await answerTenantQuestion(repo, scope, "What is the oxygen resilience risk for Dibrugarh?");

    expect(answer.sources.every((source) => source.excerpt !== REAL_CHUNK_TEXT)).toBe(true);
    expect(answer.answer).not.toContain("adjoining referral corridors");
  });

  it("never includes a chunk's content when it is restricted to a role the caller does not have", async () => {
    const embedding = await deterministicEmbeddingProvider.embed(REAL_CHUNK_TEXT);
    mockChunkRows = [{
      id: "chunk-restricted", organization_id: scope.organizationId, document_id: "doc-1", chunk_index: 0,
      chunk_text: REAL_CHUNK_TEXT, embedding_hash: embedding, visibility: "organization",
      role_allowlist: ["Super Admin", "Organization Admin"],
      metadata: { title: "Restricted Oxygen Note" },
    }];
    const repo = repositories([document({ id: "doc-1", title: "Restricted Oxygen Note" })]);

    // scope.role is "Employee", not in the chunk's role_allowlist.
    const answer = await answerTenantQuestion(repo, scope, "What is the oxygen resilience risk for Dibrugarh?");

    expect(answer.sources.every((source) => source.excerpt !== REAL_CHUNK_TEXT)).toBe(true);
    expect(answer.answer).not.toContain("adjoining referral corridors");
  });
});
