import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Document } from "../../domain";
import type { TenantRagRepositories } from "./tenantRagWorkflow";

const { admin } = vi.hoisted(() => ({
  admin: { rows: {} as Record<string, unknown[] | Error>, calls: [] as Array<{ table: string; body: unknown }> },
}));

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: async (table: string, options: { method?: string; body?: unknown; query?: URLSearchParams }) => {
    if (table === "ai_conversations") return [{ id: "conversation" }];
    if (options.method === "POST") admin.calls.push({ table, body: options.body });
    if (options.method && !table.startsWith("rpc/")) return [];
    const rows = admin.rows[table] ?? [];
    if (rows instanceof Error) throw rows;
    const ids = options.query?.get("id")?.match(/^in\.\((.*)\)$/)?.[1].split(",");
    return ids ? (rows as Array<{ id: string }>).filter((row) => ids.includes(row.id)) : rows;
  },
}));

vi.mock("../ai/router/aiRouter", () => ({
  routeAiRequest: async () => ({ answer: "", modelUsed: "local", providerUsed: "local", confidence: 0.75, humanReviewRequired: false }),
}));

import { answerTenantQuestion } from "./tenantRagWorkflow";

const scope = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000101",
  role: "Employee" as const,
  accessToken: "token",
};

function document(id: string, overrides: Partial<Document> = {}): Document {
  return {
    id, organizationId: scope.organizationId, name: id, title: id, description: "", storagePath: id, fileName: id, fileSize: 1,
    mimeType: "text/plain", documentType: "text", status: "active", visibility: "organization", classification: "internal",
    ownerId: "someone-else", currentVersion: 1, tags: [], createdAt: "", updatedAt: "", ...overrides,
  } as Document;
}

function chunk(documentId: string, text: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `chunk-${documentId}`, organization_id: scope.organizationId, document_id: documentId, chunk_index: 0, chunk_text: text,
    embedding_hash: [] as number[], visibility: "organization", role_allowlist: [] as string[], metadata: { title: documentId }, ...overrides,
  };
}

function repositories(documents: Document[], withFullText = true): TenantRagRepositories {
  return {
    documentsRepository: { list: async () => documents },
    documentVersionsRepository: {},
    documentPermissionsRepository: { list: async () => [] },
    knowledgeArticlesRepository: { list: async () => [] },
    ...(withFullText ? { ragFullTextSearchRepository: { searchDocuments: async () => [], searchArticles: async () => [] } } : {}),
  } as unknown as TenantRagRepositories;
}

function semanticBackend() {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    const { texts } = JSON.parse(String(init.body)) as { texts: string[] };
    return new Response(JSON.stringify({ embeddings: texts.map(() => Array.from({ length: 384 }, () => 0.05)) }), { status: 200 });
  }));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("EMBED_FUNCTION_SECRET", "test-secret");
  admin.rows["rpc/match_rag_document_chunks"] = [
    { id: "chunk-berth", similarity: 0.81 },
    { id: "chunk-crane", similarity: 0.8 },
    { id: "chunk-pilot", similarity: 0.79 },
  ];
  admin.rows.rag_document_chunks = [chunk("berth", "Berth text."), chunk("crane", "Crane text."), chunk("pilot", "Form HB-PIL-221.")];
  return [document("berth"), document("crane"), document("pilot")];
}

const rpcCalls = () => admin.calls.filter((call) => call.table === "rpc/search_rag_chunks_fulltext").map((call) => call.body as Record<string, unknown>);

afterEach(() => {
  admin.rows = {};
  admin.calls = [];
});

describe("chunk full text", () => {
  it("serves a question from chunk bodies in rank order and shows coverage as the score", async () => {
    admin.rows["rpc/search_rag_chunks_fulltext"] = [
      { id: "chunk-pilot", rank: 5.1, coverage: 0.4 },
      { id: "chunk-spill", rank: 1.2, coverage: 0.9 },
    ];
    admin.rows.rag_document_chunks = [chunk("spill", "Boom placement."), chunk("pilot", "Ladder checklist form.")];

    const answer = await answerTenantQuestion(repositories([document("pilot"), document("spill")]), scope, "ladder form");

    expect(answer.retrievalMode).toBe("fulltext_search");
    expect(answer.sources.map((source) => [source.sourceId, source.score])).toEqual([["pilot", 0.4], ["spill", 0.9]]);
  });

  it("searches only documents the user may read, with the user's role", async () => {
    admin.rows["rpc/search_rag_chunks_fulltext"] = [{ id: "chunk-open", rank: 1, coverage: 0.5 }];
    admin.rows.rag_document_chunks = [chunk("open", "Open text.")];

    await answerTenantQuestion(
      repositories([document("open"), document("secret", { classification: "restricted" }), document("old", { status: "archived" })]),
      scope, "anything",
    );

    expect(rpcCalls()).toEqual([expect.objectContaining({ p_organization_id: scope.organizationId, p_document_ids: ["open"], p_role: "Employee" })]);
  });

  it("drops a role-restricted chunk even if the search returns it", async () => {
    admin.rows["rpc/search_rag_chunks_fulltext"] = [{ id: "chunk-board", rank: 9, coverage: 1 }];
    admin.rows.rag_document_chunks = [chunk("board", "Board minutes text.", { role_allowlist: ["Super Admin"] })];

    const answer = await answerTenantQuestion(repositories([document("board")]), scope, "board minutes");

    expect(JSON.stringify(answer)).not.toContain("Board minutes text");
  });

  it("refuses a chunk of another organization", async () => {
    admin.rows["rpc/search_rag_chunks_fulltext"] = [{ id: "chunk-open", rank: 1, coverage: 0.5 }];
    admin.rows.rag_document_chunks = [chunk("open", "Foreign text.", { organization_id: "00000000-0000-4000-8000-0000000000ff" })];

    await expect(answerTenantQuestion(repositories([document("open")]), scope, "foreign")).rejects.toThrow();
  });

  it("keeps the previous path when the function is missing, and is not used without a full-text repository", async () => {
    admin.rows["rpc/search_rag_chunks_fulltext"] = new Error("404 function not found");
    admin.rows.rag_document_chunks = [chunk("open", "Open text.", { embedding_hash: Array.from({ length: 16 }, () => 0.25) })];

    const withoutMigration = await answerTenantQuestion(repositories([document("open")]), scope, "open text");
    expect(withoutMigration.retrievalMode).toBe("full_scan");
    expect(withoutMigration.sources).toHaveLength(1);
    expect(rpcCalls()).toHaveLength(1);

    await answerTenantQuestion(repositories([document("open")], false), scope, "open text");
    expect(rpcCalls()).toHaveLength(1);
  });

  it("is executable by the service role only", () => {
    const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/20261125120000_rag_chunk_fulltext.sql"), "utf8");
    expect(sql).toMatch(/revoke all on function public\.search_rag_chunks_fulltext\([^)]*\) from public, anon, authenticated;/);
    expect(sql.match(/grant execute on function public\.search_rag_chunks_fulltext\([^)]*\) to (.*);/)?.[1]).toBe("service_role");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("c.organization_id = p_organization_id");
    expect(sql).toContain("c.document_id = any(p_document_ids)");
  });
});

describe("rank fusion in the semantic path", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("ranks the document holding the exact code first and keeps similarity as the score", async () => {
    const documents = semanticBackend();
    admin.rows["rpc/search_rag_chunks_fulltext"] = [{ id: "chunk-pilot", rank: 6, coverage: 0.95 }];

    const answer = await answerTenantQuestion(repositories(documents), scope, "form HB-PIL-221");

    expect(answer.retrievalMode).toBe("semantic");
    expect(answer.sources.map((source) => [source.sourceId, source.score])).toEqual([["pilot", 0.79], ["berth", 0.81], ["crane", 0.8]]);
  });

  it.each([["fails", new Error("404")], ["matches nothing", []]])("keeps the similarity order when full text %s", async (_label, result) => {
    const documents = semanticBackend();
    admin.rows["rpc/search_rag_chunks_fulltext"] = result;

    const answer = await answerTenantQuestion(repositories(documents), scope, "form HB-PIL-221");

    expect(answer.sources.map((source) => source.sourceId)).toEqual(["berth", "crane", "pilot"]);
  });

  it("leaves role-restricted chunks out of the evidence", async () => {
    const documents = semanticBackend();
    admin.rows["rpc/match_rag_document_chunks"] = [
      { id: "chunk-board", similarity: 0.97 },
      ...(admin.rows["rpc/match_rag_document_chunks"] as unknown[]),
    ];
    admin.rows.rag_document_chunks = [
      ...(admin.rows.rag_document_chunks as unknown[]),
      { ...chunk("berth", "Board text."), id: "chunk-board", role_allowlist: ["Super Admin"] },
    ];
    admin.rows["rpc/search_rag_chunks_fulltext"] = [{ id: "chunk-berth", rank: 1, coverage: 0.7 }];

    const answer = await answerTenantQuestion(repositories(documents), scope, "board");

    expect(answer.retrievalEvidence).toMatchObject({ topSimilarity: 0.81, candidates: 3, semanticTopCoverage: 0.7 });
  });

  it("never fuses in a chunk the user may not read", async () => {
    const documents = [...semanticBackend(), document("secret", { classification: "restricted" })];
    admin.rows.rag_document_chunks = [...(admin.rows.rag_document_chunks as unknown[]), chunk("secret", "Secret text.")];
    admin.rows["rpc/search_rag_chunks_fulltext"] = [{ id: "chunk-secret", rank: 9, coverage: 1 }];

    const answer = await answerTenantQuestion(repositories(documents), scope, "secret");

    expect(JSON.stringify(answer)).not.toContain("Secret text");
    expect(answer.sources.map((source) => source.sourceId)).toEqual(["berth", "crane", "pilot"]);
  });
});

describe("abstention", () => {
  const hashed = { embedding_hash: Array.from({ length: 16 }, () => 0.25) };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function weakSemantic() {
    const documents = semanticBackend().map((item) => ({ ...item, description: "where to park bicycles" }));
    admin.rows["rpc/match_rag_document_chunks"] = [{ id: "chunk-berth", similarity: 0.76 }, { id: "chunk-crane", similarity: 0.75 }];
    admin.rows["rpc/search_rag_chunks_fulltext"] = [];
    return documents;
  }

  it("returns no sources, asks for review, and does not fall back to titles and descriptions", async () => {
    const answer = await answerTenantQuestion(repositories(weakSemantic()), scope, "Where do I park bicycles?");

    expect(answer.sources).toEqual([]);
    expect(answer.humanReviewRequired).toBe(true);
    expect(answer.confidence).toBe(0);
    expect(answer.answer).toContain("No authorized institutional source matched");
    expect(answer.retrievalMode).toBe("semantic");
    expect(answer.retrievalEvidence).toMatchObject({ topSimilarity: 0.76, topCoverage: 0 });
  });

  it("flags a middling match for review and still shows its sources", async () => {
    const documents = weakSemantic();
    admin.rows["rpc/match_rag_document_chunks"] = [{ id: "chunk-berth", similarity: 0.81 }, { id: "chunk-crane", similarity: 0.8 }];

    const answer = await answerTenantQuestion(repositories(documents), scope, "Where do I park bicycles?");

    expect(answer.sources).toHaveLength(2);
    expect(answer.humanReviewRequired).toBe(true);
  });

  it("does not abstain on documents the user attached to the question", async () => {
    const answer = await answerTenantQuestion(repositories(weakSemantic()), scope, "Summarise this", { documentIds: ["berth", "crane"] });

    expect(answer.sources).toHaveLength(2);
    expect(answer.humanReviewRequired).toBe(true);
  });

  it("does not abstain in the semantic path when full text could not run", async () => {
    const documents = weakSemantic();
    admin.rows["rpc/search_rag_chunks_fulltext"] = new Error("404 function not found");

    expect((await answerTenantQuestion(repositories(documents), scope, "Where do I park bicycles?")).sources).toHaveLength(2);
  });

  it("abstains in full-text mode when no word of the question is in any readable chunk, title or description", async () => {
    admin.rows["rpc/search_rag_chunks_fulltext"] = [];
    admin.rows.rag_document_chunks = [chunk("crane", "Crane text.", hashed)];

    const answer = await answerTenantQuestion(repositories([document("crane")]), scope, "bicycles");

    expect(answer.sources).toEqual([]);
    expect(answer.humanReviewRequired).toBe(true);
    expect(answer.retrievalMode).toBe("fulltext_search");
    expect(answer.retrievalEvidence).toEqual({ candidates: 0, topCoverage: 0 });
  });

  it("still uses titles and descriptions when nothing has been indexed as chunks", async () => {
    admin.rows["rpc/search_rag_chunks_fulltext"] = [];
    admin.rows.rag_document_chunks = [];

    const answer = await answerTenantQuestion(repositories([document("bicycles", { description: "where to park bicycles" })]), scope, "bicycles");

    expect(answer.sources).toHaveLength(1);
  });
});
