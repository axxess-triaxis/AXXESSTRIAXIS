// @vitest-environment node
import { describe, expect, it } from "vitest";
import { candidateProblems, cosine, exactTopK, percentile, scoreRun, type BenchmarkRequest, type VectorRow } from "./exactSearch";
import { assertBenchmarkTarget, atlasScoreToCosine, scoreProblems, vectorSearchPipeline, vectorIndexDefinition } from "./mongoCandidates";
import { recordMatchRequests } from "./recordRequests";
import { buildScaleCorpus, buildScaleRequests } from "./scaleCorpus";

const row = (id: string, organizationId: string, documentId: string, vector: number[]): VectorRow =>
  ({ id, organizationId, documentId, vector: Float32Array.from(vector) });

const rows = [
  row("a", "org1", "doc1", [1, 0]),
  row("b", "org1", "doc2", [0.8, 0.6]),
  row("c", "org1", "doc3", [0, 1]),
  row("d", "org2", "doc9", [1, 0]),
];
const request = (overrides: Partial<BenchmarkRequest> = {}): BenchmarkRequest =>
  ({ id: "q", organizationId: "org1", documentIds: ["doc1", "doc2"], vector: [1, 0], limit: 50, ...overrides });

describe("exact search", () => {
  it("ranks only rows of the organization and the listed documents", () => {
    expect(exactTopK(rows, request()).map((hit) => hit.id)).toEqual(["a", "b"]);
    expect(exactTopK(rows, request({ limit: 1 })).map((hit) => hit.id)).toEqual(["a"]);
  });

  it("does not return another tenant's document even when it is listed", () => {
    expect(exactTopK(rows, request({ documentIds: ["doc1", "doc9"] })).map((hit) => hit.id)).toEqual(["a"]);
  });

  it("normalizes both vectors", () => {
    expect(cosine(Float32Array.from([2, 0]), [5, 0])).toBeCloseTo(1, 6);
    expect(cosine(Float32Array.from([1, 0]), [-3, 0])).toBeCloseTo(-1, 6);
  });
});

describe("run scoring", () => {
  const byId = new Map(rows.map((entry) => [entry.id, entry]));

  it("counts rows that exist but were not returned", () => {
    const result = scoreRun(rows, [{ request: request(), hits: [{ id: "a", score: 1 }], milliseconds: 4 }]);
    expect(result).toMatchObject({ requests: 1, recall: 0.5, returned: 1, expected: 2, shortResults: 1, crossTenant: 0, unlisted: 0 });
  });

  it("separates another tenant's rows from unlisted documents", () => {
    expect(candidateProblems(byId, request(), [{ id: "d", score: 1 }, { id: "c", score: 0 }, { id: "zz", score: 0 }]))
      .toEqual({ crossTenant: ["d"], unlisted: ["c"], unknown: ["zz"] });
  });

  it("does not let duplicate rows raise recall", () => {
    const hits = [{ id: "a", score: 1 }, { id: "a", score: 1 }];
    expect(scoreRun(rows, [{ request: request(), hits, milliseconds: 1 }])).toMatchObject({ recall: 0.5, returned: 1 });
  });

  it("refuses to score nothing", () => {
    expect(() => scoreRun(rows, [])).toThrow(/no requests/i);
  });

  it("reports nearest-rank percentiles", () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([5, 1, 3, 2, 4], 95)).toBe(5);
  });
});

describe("MongoDB candidates", () => {
  it("pre-filters by organization and document", () => {
    const [stage] = vectorSearchPipeline(request(), { exact: false });
    expect(stage.$vectorSearch).toMatchObject({
      filter: { $and: [{ organizationId: "org1" }, { documentId: { $in: ["doc1", "doc2"] } }] },
      limit: 50,
      numCandidates: 1000,
    });
  });

  it("omits numCandidates in exact mode and caps it at the documented maximum", () => {
    const [exact] = vectorSearchPipeline(request(), { exact: true });
    expect(exact.$vectorSearch).toMatchObject({ exact: true });
    expect(exact.$vectorSearch).not.toHaveProperty("numCandidates");
    const [large] = vectorSearchPipeline(request({ limit: 900 }), { exact: false });
    expect(large.$vectorSearch).toMatchObject({ numCandidates: 10000 });
  });

  it("can drop each filter for the deliberate breakages only", () => {
    const filterOf = (dropFilters: Array<"organization" | "document">) => vectorSearchPipeline(request(), { exact: true, dropFilters })[0].$vectorSearch;
    expect(filterOf(["organization"])).toMatchObject({ filter: { $and: [{ documentId: { $in: ["doc1", "doc2"] } }] } });
    expect(filterOf(["document"])).toMatchObject({ filter: { $and: [{ organizationId: "org1" }] } });
    expect(filterOf(["organization", "document"])).not.toHaveProperty("filter");
  });

  it("indexes the vector and both filter fields", () => {
    expect(vectorIndexDefinition(384).fields).toEqual([
      { type: "vector", path: "embedding", numDimensions: 384, similarity: "cosine" },
      { type: "filter", path: "organizationId" },
      { type: "filter", path: "documentId" },
    ]);
  });

  it("reports scores that do not match independently computed cosine", () => {
    const byId = new Map(rows.map((entry) => [entry.id, entry]));
    const good = [{ id: "b", score: atlasScoreToCosine(0.9) }];
    expect(scoreProblems(byId, request(), good, 1e-4)).toEqual([]);
    expect(scoreProblems(byId, request(), [{ id: "b", score: 0.9 }], 1e-4)).toHaveLength(1);
  });

  it("only accepts a local host, or Atlas when it is asked for by name, and one database name", () => {
    expect(() => assertBenchmarkTarget({ kind: "local", host: "127.0.0.1", database: "rag_benchmark" })).not.toThrow();
    expect(() => assertBenchmarkTarget({ kind: "local", host: "example.mongodb.net", database: "rag_benchmark" })).toThrow(/local/);
    expect(() => assertBenchmarkTarget({ kind: "atlas", host: "example.mongodb.net", database: "rag_benchmark" })).not.toThrow();
    expect(() => assertBenchmarkTarget({ kind: "atlas", host: "mongodb.net.evil.test", database: "rag_benchmark" })).toThrow(/Atlas/);
    expect(() => assertBenchmarkTarget({ kind: "local", host: "127.0.0.1", database: "production" })).toThrow(/rag_benchmark/);
  });
});

describe("recorded requests", () => {
  it("records only the similarity search, with its response, and passes everything through", async () => {
    const replies: Record<string, string> = {
      "http://127.0.0.1:1/rest/v1/rpc/match_rag_document_chunks": JSON.stringify([{ id: "a", similarity: 0.9 }]),
      "http://127.0.0.1:1/rest/v1/documents": "[]",
    };
    const original = async (input: unknown) => new Response(replies[String(input)], { status: 200 });
    const recorder = recordMatchRequests(original as typeof fetch);
    const body = JSON.stringify({ p_organization_id: "org1", p_document_ids: ["doc1"], p_query_embedding: "[1,0]", p_limit: 50 });
    const response = await recorder.fetch("http://127.0.0.1:1/rest/v1/rpc/match_rag_document_chunks", { method: "POST", body });
    expect(await response.json()).toEqual([{ id: "a", similarity: 0.9 }]);
    await recorder.fetch("http://127.0.0.1:1/rest/v1/documents");
    expect(recorder.recorded).toEqual([
      { request: { id: "r1", organizationId: "org1", documentIds: ["doc1"], vector: [1, 0], limit: 50 }, hits: [{ id: "a", score: 0.9 }] },
    ]);
  });

  it("fails on an unsuccessful similarity search instead of recording an empty one", async () => {
    const recorder = recordMatchRequests((async () => new Response("no", { status: 500 })) as typeof fetch);
    await recorder.fetch("http://127.0.0.1:1/rest/v1/rpc/match_rag_document_chunks", {
      method: "POST",
      body: JSON.stringify({ p_organization_id: "o", p_document_ids: [], p_query_embedding: "[1]", p_limit: 5 }),
    });
    expect(recorder.failures).toEqual(["500"]);
    expect(recorder.recorded).toEqual([]);
  });
});

describe("scale corpus", () => {
  const base = [[1, 0, 0, 0], [0, 1, 0, 0]];
  const corpus = buildScaleCorpus(base, 2000, 7);

  it("is the same for the same seed and differs for another", () => {
    expect(buildScaleCorpus(base, 2000, 7)).toEqual(corpus);
    expect(buildScaleCorpus(base, 2000, 8).rows[0].id).not.toBe(corpus.rows[0].id);
  });

  it("has the requested size, unique ids and unit vectors", () => {
    expect(corpus.rows).toHaveLength(2000);
    expect(new Set(corpus.rows.map((entry) => entry.id)).size).toBe(2000);
    for (const entry of corpus.rows.slice(0, 50)) expect(Math.hypot(...entry.vector)).toBeCloseTo(1, 5);
  });

  it("is skewed: one tenant near 90 percent and several under 0.5 percent", () => {
    const shares = corpus.tenants.map((tenant) => corpus.rows.filter((entry) => entry.organizationId === tenant.id).length / 2000);
    expect(Math.max(...shares)).toBeCloseTo(0.9, 1);
    expect(shares.filter((share) => share < 0.005).length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...shares)).toBeGreaterThan(0);
  });

  it("keeps every document inside one tenant", () => {
    const owner = new Map<string, string>();
    for (const entry of corpus.rows) {
      expect(owner.get(entry.documentId) ?? entry.organizationId).toBe(entry.organizationId);
      owner.set(entry.documentId, entry.organizationId);
    }
  });

  it("asks with short and long document lists, and probes with one foreign document", () => {
    const requests = buildScaleRequests(corpus, base, 7);
    expect(new Set(requests.map((entry) => entry.group))).toEqual(new Set(["large-short", "large-long", "small-short", "small-long", "probe"]));
    const owner = new Map(corpus.rows.map((entry) => [entry.documentId, entry.organizationId]));
    for (const entry of requests) {
      const foreign = entry.documentIds.filter((id) => owner.get(id) !== entry.organizationId);
      expect(foreign.length).toBe(entry.group === "probe" ? 1 : 0);
    }
  });
});
