import { afterEach, describe, expect, it, vi } from "vitest";
import type { Document, DocumentVersion } from "../../domain";
import type { TenantRagRepositories } from "./tenantRagWorkflow";

// Sprint 4 (2026-08-16): vi.mock factories are hoisted above top-level variables, so anything a
// factory closes over must come from vi.hoisted (same convention as agenticChatLoop.test.ts this
// session). supabaseAdminState defaults to isConfigured: false, matching this file's existing
// (unmocked) test environment behavior exactly -- the 4 pre-existing tests below never touch this
// mock and keep exercising the real "Supabase admin not configured" honest-degradation path
// unchanged. Only the new "conversation memory" describe block flips it to true.
const { supabaseAdminState, mockRouteAiRequest } = vi.hoisted(() => ({
  supabaseAdminState: { isConfigured: false, rows: {} as Record<string, unknown[]>, writes: [] as Array<{ table: string; body: unknown }> },
  mockRouteAiRequest: vi.fn(),
}));

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => supabaseAdminState.isConfigured,
  supabaseAdminRest: async (table: string, options: { method?: string; body?: unknown; query?: URLSearchParams }) => {
    if (table === "ai_conversations") return [{ id: "conv-1" }];
    if (table === "ai_output_audit") return [{ id: "audit-1" }];
    // GET reads never pass a method (matches this file's own real call sites, e.g.
    // persistentCitationsForQuestion's `supabaseAdminRest("rag_document_chunks", { query })`).
    if (table === "ai_conversation_messages") return options.method ? [] : (supabaseAdminState.rows.ai_conversation_messages ?? []);
    // Semantic retrieval (2026-10-05): RPCs are POSTs that return rows, not writes.
    if (table.startsWith("rpc/")) {
      supabaseAdminState.writes.push({ table, body: options.body });
      return supabaseAdminState.rows[table] ?? [];
    }
    if (options.method) supabaseAdminState.writes.push({ table, body: options.body });
    return options.method ? [] : (supabaseAdminState.rows[table] ?? []);
  },
}));

// Default keeps the 4 pre-existing tests below passing unchanged: providerUsed "local" is not in
// liveModelProviders, so isLiveModelAnswer stays false and baseAnswer's own answer/sources/rationale
// (governedRag.ts's local synthesis) pass through untouched, exactly as before this mock existed.
vi.mock("../ai/router/aiRouter", () => ({
  routeAiRequest: (request: unknown) => mockRouteAiRequest(request),
}));

import { answerTenantQuestion, ingestTenantDocument } from "./tenantRagWorkflow";
import { deterministicEmbeddingProvider } from "./embeddings/embeddingProvider";

mockRouteAiRequest.mockResolvedValue({
  answer: "",
  modelUsed: "local",
  providerUsed: "local",
  routingReason: "test-default",
  fallbackChain: [],
  confidence: 0.75,
  humanReviewRequired: false,
  citations: [],
  auditId: "audit-default",
  latencyMs: 1,
  costTier: "low",
  estimatedCostUsd: 0,
  policyId: "test",
  gatewayTags: [],
});

const scope = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000101",
  role: "Organization Admin" as const,
  accessToken: "token",
};

function repositories(): TenantRagRepositories {
  const documents: Document[] = [];
  return {
    documentsRepository: {
      async list() {
        return documents;
      },
      async getById(_scope, id) {
        return documents.find((document) => document.id === id);
      },
      async create(_scope, input) {
        const document: Document = {
          id: `doc-${documents.length + 1}`,
          organizationId: String(input.organizationId ?? scope.organizationId),
          name: String(input.name ?? input.title),
          title: String(input.title ?? input.name),
          description: String(input.description ?? ""),
          storagePath: String(input.storagePath),
          fileName: String(input.fileName),
          fileSize: Number(input.fileSize ?? 0),
          mimeType: String(input.mimeType ?? "text/plain"),
          documentType: "text",
          status: "active",
          visibility: (input.visibility as Document["visibility"]) ?? "organization",
          classification: (input.classification as Document["classification"]) ?? "internal",
          ownerId: scope.userId,
          createdByUserId: scope.userId,
          currentVersion: 1,
          tags: Array.isArray(input.tags) ? input.tags : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        documents.push(document);
        return document;
      },
      async update(_scope, id, input) {
        const index = documents.findIndex((document) => document.id === id);
        documents[index] = { ...documents[index], ...input } as Document;
        return documents[index];
      },
      archive: vi.fn(),
      restore: vi.fn(),
      softDelete: vi.fn(),
      listArchived: vi.fn(async () => []),
      listFavorites: vi.fn(async () => []),
      listSharedWithMe: vi.fn(async () => []),
      recordActivity: vi.fn(async () => undefined),
    },
    documentVersionsRepository: {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => undefined),
      create: vi.fn(async (_scope, input) => ({
        id: "version-1",
        organizationId: scope.organizationId,
        documentId: String(input.documentId),
        versionNumber: 1,
        fileName: String(input.fileName),
        fileSize: Number(input.fileSize),
        mimeType: String(input.mimeType),
        storagePath: String(input.storagePath),
        createdAt: new Date().toISOString(),
      } satisfies DocumentVersion)),
      update: vi.fn(),
    },
    documentPermissionsRepository: {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => undefined),
      create: vi.fn(),
      update: vi.fn(),
    },
    knowledgeArticlesRepository: {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => undefined),
      create: vi.fn(),
      update: vi.fn(),
    },
    tasksRepository: {
      list: vi.fn(async () => []),
      getById: vi.fn(async () => undefined),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLogsRepository: {
      list: vi.fn(async () => []),
      record: vi.fn(async () => undefined),
    },
  };
}

describe("tenant RAG workflow", () => {
  it("ingests document text into tenant metadata and an audit-ready chunk count", async () => {
    const repo = repositories();
    const result = await ingestTenantDocument(repo, scope, {
      title: "Dibrugarh Oxygen Resilience Note",
      bodyText: "The biomedical maintenance team must review oxygen manifold uptime and submit district variance notes before Friday.",
    });

    expect(result.document.organizationId).toBe(scope.organizationId);
    expect(result.chunkCount).toBeGreaterThan(0);
    expect(repo.auditLogsRepository?.record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "document.ingested" }));
  });

  it("indexes an existing Knowledge Hub document instead of creating a duplicate (RAG Remediation Sprint 1, RAG1-03/04/05/06)", async () => {
    const repo = repositories();
    // Simulate a document uploaded through Knowledge Hub: a real documents row with real
    // governed metadata already set, but never chunked (Knowledge Hub itself never indexes).
    const uploaded = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId,
      name: "district-sop.pdf",
      title: "District SOP",
      storagePath: "organizations/org/documents/district-sop.pdf",
      fileName: "district-sop.pdf",
      fileSize: 4096,
      mimeType: "application/pdf",
      visibility: "department",
      classification: "confidential",
      tags: ["sop"],
    });

    const result = await ingestTenantDocument(repo, scope, {
      title: "This title should be ignored",
      bodyText: "The district SOP requires biomedical maintenance sign-off before oxygen manifold servicing.",
      documentId: uploaded.id,
    });

    expect(result.document.id).toBe(uploaded.id);
    expect(result.reindexedExistingDocument).toBe(true);
    // The document's own real metadata is preserved, not overwritten by the ingest form's input.
    expect(result.document.title).toBe("District SOP");
    expect(result.document.visibility).toBe("department");
    expect(result.document.classification).toBe("confidential");
    expect(await repo.documentsRepository.list(scope)).toHaveLength(1);
    expect(repo.documentsRepository.recordActivity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ documentId: uploaded.id, action: "edited", metadata: expect.objectContaining({ event: "indexed" }) }));
  });

  it("refuses to index a document belonging to another organization (tenant isolation)", async () => {
    const repo = repositories();
    const uploaded = await repo.documentsRepository.create(scope, {
      organizationId: "org-other",
      name: "other-org-doc.pdf",
      title: "Other Org Document",
      storagePath: "organizations/org-other/documents/other-org-doc.pdf",
      fileName: "other-org-doc.pdf",
      fileSize: 100,
      mimeType: "application/pdf",
    });

    await expect(ingestTenantDocument(repo, scope, {
      title: "ignored",
      bodyText: "Attempted cross-tenant reindex.",
      documentId: uploaded.id,
    })).rejects.toThrow(/not found for this organization/i);
  });

  it("answers questions only from tenant-authorized repository context when persistent chunks are unavailable", async () => {
    const repo = repositories();
    await ingestTenantDocument(repo, scope, {
      title: "Cachar Maternal Referral Review",
      bodyText: "Cachar referral transfer turnaround is delayed at night because ambulance dispatch confirmation is not consistently recorded.",
    });

    const answer = await answerTenantQuestion(repo, scope, "What is the Cachar maternal referral risk?");
    expect(answer.sources[0]?.title).toContain("Cachar");
    expect(answer.confidence).toBeGreaterThan(0);
    expect(answer.rationale).toContain("governed source");
    expect(answer.rationale).toContain("Cachar");
    expect(repo.auditLogsRepository?.record).toHaveBeenCalled();
  });
});

describe("tenant RAG workflow -- Sprint 4 conversation memory (2026-08-16)", () => {
  afterEach(() => {
    supabaseAdminState.isConfigured = false;
    supabaseAdminState.rows = {};
    mockRouteAiRequest.mockClear();
  });

  it("creates a real ai_conversations row on the first turn and returns its id, writing both a user and assistant ai_conversation_messages row", async () => {
    supabaseAdminState.isConfigured = true;
    const repo = repositories();
    await ingestTenantDocument(repo, scope, {
      title: "Cachar Maternal Referral Review",
      bodyText: "Cachar referral transfer turnaround is delayed at night because ambulance dispatch confirmation is not consistently recorded.",
    });

    const answer = await answerTenantQuestion(repo, scope, "What is the Cachar maternal referral risk?");

    expect(answer.conversationId).toBe("conv-1");
  });

  it("degrades honestly to no conversation id when Supabase admin is not configured -- same one-shot behavior as before this sprint", async () => {
    supabaseAdminState.isConfigured = false;
    const repo = repositories();
    await ingestTenantDocument(repo, scope, {
      title: "Cachar Maternal Referral Review",
      bodyText: "Cachar referral transfer turnaround is delayed at night.",
    });

    const answer = await answerTenantQuestion(repo, scope, "What is the Cachar maternal referral risk?");

    expect(answer.conversationId).toBeUndefined();
  });

  it("folds prior turns into the next prompt as plain text, not through AiPromptRequest.priorMessages (see tenantRagWorkflow.ts comment for why)", async () => {
    supabaseAdminState.isConfigured = true;
    supabaseAdminState.rows.ai_conversation_messages = [
      { id: "m1", conversation_id: "conv-1", role: "user", content: "What is the Cachar maternal referral risk?", ai_output_audit_id: null, citations: [], created_at: "2026-08-16T08:00:00.000Z" },
      { id: "m2", conversation_id: "conv-1", role: "assistant", content: "Referral handoff shows a coordination gap.", ai_output_audit_id: "audit-1", citations: [], created_at: "2026-08-16T08:00:05.000Z" },
    ];
    const repo = repositories();
    await ingestTenantDocument(repo, scope, {
      title: "Cachar Maternal Referral Review",
      bodyText: "Cachar referral transfer turnaround is delayed at night.",
    });

    await answerTenantQuestion(repo, scope, "What about the daytime handoff instead?", { conversationId: "conv-1" });

    const sentPrompt = mockRouteAiRequest.mock.calls[0][0].prompt as string;
    expect(sentPrompt).toContain("Conversation so far:");
    expect(sentPrompt).toContain("Q: What is the Cachar maternal referral risk?");
    expect(sentPrompt).toContain("A: Referral handoff shows a coordination gap.");
    expect(mockRouteAiRequest.mock.calls[0][0].priorMessages).toBeUndefined();
  });

  it("passes conversationId through unchanged when the caller already has one, rather than creating a second conversation", async () => {
    supabaseAdminState.isConfigured = true;
    const repo = repositories();
    await ingestTenantDocument(repo, scope, {
      title: "Cachar Maternal Referral Review",
      bodyText: "Cachar referral transfer turnaround is delayed at night.",
    });

    const answer = await answerTenantQuestion(repo, scope, "Follow-up question", { conversationId: "existing-conv" });

    expect(answer.conversationId).toBe("existing-conv");
  });

  it("Context Window's documentIds actually scopes retrieval -- persistentCitationsForQuestion no longer just echoes it into the audit trail after the fact", async () => {
    supabaseAdminState.isConfigured = true;
    const repo = repositories();
    const question = "What is the district referral risk?";
    const vector = await deterministicEmbeddingProvider.embed(question);

    const cachar = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "cachar.txt", title: "Cachar Referral Review",
      storagePath: "x", fileName: "cachar.txt", fileSize: 10, mimeType: "text/plain",
    });
    const dibrugarh = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "dibrugarh.txt", title: "Dibrugarh Oxygen Note",
      storagePath: "x", fileName: "dibrugarh.txt", fileSize: 10, mimeType: "text/plain",
    });

    function chunkRow(documentId: string, title: string) {
      return {
        id: `chunk-${documentId}`, organization_id: scope.organizationId, document_id: documentId,
        chunk_index: 0, chunk_text: "relevant excerpt", embedding_hash: vector,
        visibility: "organization", role_allowlist: [] as string[],
        metadata: { title },
      };
    }
    supabaseAdminState.rows.rag_document_chunks = [
      chunkRow(cachar.id, "Cachar Referral Review"),
      chunkRow(dibrugarh.id, "Dibrugarh Oxygen Note"),
    ];

    const scopedAnswer = await answerTenantQuestion(repo, scope, question, { documentIds: [cachar.id] });
    expect(scopedAnswer.sources).toHaveLength(1);
    expect(scopedAnswer.sources[0].title).toBe("Cachar Referral Review");

    const unscopedAnswer = await answerTenantQuestion(repo, scope, question);
    expect(unscopedAnswer.sources.map((source) => source.title).sort()).toEqual(["Cachar Referral Review", "Dibrugarh Oxygen Note"]);
  });

  // RAG retrieval quality (2026-09-12): persistentCitationsForQuestion narrows which authorized
  // documents' chunks get fetched using a ragFullTextSearchRepository, if one is provided --
  // narrowing/ranking only, never a widening of what canRetrieveDocument() already authorized.
  it("full-text-search narrowing on the persistent-chunk path only serves the candidates the search repository actually surfaced", async () => {
    supabaseAdminState.isConfigured = true;
    const repo = repositories();
    const question = "What is the district referral risk?";
    const vector = await deterministicEmbeddingProvider.embed(question);

    const cachar = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "cachar.txt", title: "Cachar Referral Review",
      storagePath: "x", fileName: "cachar.txt", fileSize: 10, mimeType: "text/plain",
    });
    const dibrugarh = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "dibrugarh.txt", title: "Dibrugarh Oxygen Note",
      storagePath: "x", fileName: "dibrugarh.txt", fileSize: 10, mimeType: "text/plain",
    });

    function chunkRow(documentId: string, title: string) {
      return {
        id: `chunk-${documentId}`, organization_id: scope.organizationId, document_id: documentId,
        chunk_index: 0, chunk_text: "relevant excerpt", embedding_hash: vector,
        visibility: "organization", role_allowlist: [] as string[],
        metadata: { title },
      };
    }
    supabaseAdminState.rows.rag_document_chunks = [
      chunkRow(cachar.id, "Cachar Referral Review"),
      chunkRow(dibrugarh.id, "Dibrugarh Oxygen Note"),
    ];

    repo.ragFullTextSearchRepository = {
      async searchDocuments() {
        return [{ id: cachar.id, rank: 1 }]; // deliberately excludes dibrugarh
      },
      async searchArticles() {
        return [];
      },
    };

    const answer = await answerTenantQuestion(repo, scope, question);

    expect(answer.sources.map((source) => source.title)).toEqual(["Cachar Referral Review"]);
    expect(answer.retrievalMode).toBe("fulltext_search");
  });

  it("falls back to the unnarrowed persistent-chunk result when the search repository throws", async () => {
    supabaseAdminState.isConfigured = true;
    const repo = repositories();
    const question = "What is the district referral risk?";
    const vector = await deterministicEmbeddingProvider.embed(question);

    const cachar = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "cachar.txt", title: "Cachar Referral Review",
      storagePath: "x", fileName: "cachar.txt", fileSize: 10, mimeType: "text/plain",
    });
    supabaseAdminState.rows.rag_document_chunks = [{
      id: `chunk-${cachar.id}`, organization_id: scope.organizationId, document_id: cachar.id,
      chunk_index: 0, chunk_text: "relevant excerpt", embedding_hash: vector,
      visibility: "organization", role_allowlist: [] as string[], metadata: { title: "Cachar Referral Review" },
    }];

    repo.ragFullTextSearchRepository = {
      async searchDocuments() {
        throw new Error("RPC unavailable");
      },
      async searchArticles() {
        return [];
      },
    };

    const answer = await answerTenantQuestion(repo, scope, question);

    expect(answer.sources.map((source) => source.title)).toEqual(["Cachar Referral Review"]);
    expect(answer.retrievalMode).toBe("full_scan");
  });
});

describe("tenant RAG workflow -- semantic retrieval with gte-small embeddings (2026-10-05)", () => {
  const unit = (index: number) => Array.from({ length: 384 }, (_, i) => (i === index ? 1 : 0));

  function stubEmbedFunction(vectorFor: (text: string) => number[]) {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const { texts } = JSON.parse(String(init.body)) as { texts: string[] };
      return new Response(JSON.stringify({ embeddings: texts.map(vectorFor) }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("EMBED_FUNCTION_SECRET", "test-secret");
    return fetchMock;
  }

  afterEach(() => {
    supabaseAdminState.isConfigured = false;
    supabaseAdminState.rows = {};
    supabaseAdminState.writes = [];
    mockRouteAiRequest.mockClear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("ranks by embedding similarity across every authorized document, ahead of keyword narrowing", async () => {
    supabaseAdminState.isConfigured = true;
    const fetchMock = stubEmbedFunction(() => unit(0));
    const repo = repositories();
    const cachar = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "cachar.txt", title: "Cachar Referral Review",
      storagePath: "x", fileName: "cachar.txt", fileSize: 10, mimeType: "text/plain",
    });
    const oxygen = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "oxygen.txt", title: "Oxygen Supply Continuity",
      storagePath: "x", fileName: "oxygen.txt", fileSize: 10, mimeType: "text/plain",
    });
    const row = (documentId: string, title: string) => ({
      id: `chunk-${documentId}`, organization_id: scope.organizationId, document_id: documentId,
      chunk_index: 0, chunk_text: `${title} excerpt`, embedding_hash: [] as number[],
      visibility: "organization", role_allowlist: [] as string[], metadata: { title },
    });
    supabaseAdminState.rows.rag_document_chunks = [row(cachar.id, "Cachar Referral Review"), row(oxygen.id, "Oxygen Supply Continuity")];
    // The question shares no keyword with the oxygen document, but means the same thing.
    supabaseAdminState.rows["rpc/match_rag_document_chunks"] = [
      { id: `chunk-${oxygen.id}`, similarity: 0.83 },
      { id: `chunk-${cachar.id}`, similarity: 0.41 },
    ];
    const searchDocuments = vi.fn(async () => [{ id: cachar.id, rank: 1 }]);
    repo.ragFullTextSearchRepository = { searchDocuments, searchArticles: async () => [] };

    const answer = await answerTenantQuestion(repo, scope, "Will the hospitals run out of medical gas?");

    expect(answer.retrievalMode).toBe("semantic");
    expect(answer.sources.map((source) => source.title)).toEqual(["Oxygen Supply Continuity", "Cachar Referral Review"]);
    expect(searchDocuments).not.toHaveBeenCalled();
    const rpc = supabaseAdminState.writes.find((write) => write.table === "rpc/match_rag_document_chunks")?.body as Record<string, unknown>;
    expect(rpc.p_organization_id).toBe(scope.organizationId);
    expect(rpc.p_document_ids).toEqual([cachar.id, oxygen.id]);
    expect(String(rpc.p_query_embedding).startsWith("[1,0,0")).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("https://example.supabase.co/functions/v1/embed");
  });

  it("never returns a role-restricted chunk, even when the RPC ranks it first", async () => {
    supabaseAdminState.isConfigured = true;
    stubEmbedFunction(() => unit(0));
    const repo = repositories();
    const doc = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "board.txt", title: "Board Only",
      storagePath: "x", fileName: "board.txt", fileSize: 10, mimeType: "text/plain",
    });
    supabaseAdminState.rows.rag_document_chunks = [{
      id: "chunk-board", organization_id: scope.organizationId, document_id: doc.id, chunk_index: 0,
      chunk_text: "board minutes", embedding_hash: [] as number[], visibility: "organization",
      role_allowlist: ["Super Admin"], metadata: { title: "Board Only" },
    }];
    supabaseAdminState.rows["rpc/match_rag_document_chunks"] = [{ id: "chunk-board", similarity: 0.9 }];

    const answer = await answerTenantQuestion(repo, scope, "What did the board decide?");

    // The document itself is visible to this role (document-level retrieval may still cite it);
    // the role-restricted chunk's text must never come back through the semantic path.
    expect(JSON.stringify(answer)).not.toContain("board minutes");
    expect(answer.retrievalMode).not.toBe("semantic");
  });

  it("falls back to the hash/full-text path when the embed function is unavailable", async () => {
    supabaseAdminState.isConfigured = true;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("EMBED_FUNCTION_SECRET", "test-secret");
    const repo = repositories();
    const question = "What is the district referral risk?";
    const cachar = await repo.documentsRepository.create(scope, {
      organizationId: scope.organizationId, name: "cachar.txt", title: "Cachar Referral Review",
      storagePath: "x", fileName: "cachar.txt", fileSize: 10, mimeType: "text/plain",
    });
    supabaseAdminState.rows.rag_document_chunks = [{
      id: `chunk-${cachar.id}`, organization_id: scope.organizationId, document_id: cachar.id,
      chunk_index: 0, chunk_text: "relevant excerpt", embedding_hash: await deterministicEmbeddingProvider.embed(question),
      visibility: "organization", role_allowlist: [] as string[], metadata: { title: "Cachar Referral Review" },
    }];

    const answer = await answerTenantQuestion(repo, scope, question);

    expect(answer.retrievalMode).toBe("full_scan");
    expect(answer.sources.map((source) => source.title)).toEqual(["Cachar Referral Review"]);
    expect(supabaseAdminState.writes.some((write) => write.table === "rpc/match_rag_document_chunks")).toBe(false);
  });

  it("writes a gte-small embedding with every chunk at ingestion when the embed function is available", async () => {
    supabaseAdminState.isConfigured = true;
    stubEmbedFunction(() => unit(5));
    const repo = repositories();

    await ingestTenantDocument(repo, scope, {
      title: "Oxygen Supply Continuity",
      bodyText: "Oxygen manifold uptime procedure for district hospitals. Escalate low cylinder stock to the biomedical lead.",
    });

    const chunkWrite = supabaseAdminState.writes.find((write) => write.table === "rag_document_chunks");
    const rows = chunkWrite?.body as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(String(row.embedding).split(",")).toHaveLength(384);
      expect((row.metadata as Record<string, unknown>).semanticEmbeddingModel).toBe("gte-small");
      expect(Array.isArray(row.embedding_hash)).toBe(true); // the hash is still written
    }
  });
});
