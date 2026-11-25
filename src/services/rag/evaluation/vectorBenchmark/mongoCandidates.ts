// MongoDB's version of match_rag_document_chunks, for the benchmark only. No application code imports this,
// and it has no MongoDB import itself: it builds plain objects for the driver to send.

import { cosine, type BenchmarkRequest, type Hit, type VectorRow } from "./exactSearch";

export const BENCHMARK_DATABASE = "rag_benchmark";
export const BENCHMARK_INDEX = "rag_benchmark_vectors";
const MAX_NUM_CANDIDATES = 10_000;
const CANDIDATES_PER_RESULT = 20;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export type PipelineOptions = { exact: boolean; dropFilters?: Array<"organization" | "document"> };
export type BenchmarkTarget = { kind: "local" | "atlas"; host: string; database: string };

/** The script creates and drops a collection, so it must never be pointed at anything else. */
export function assertBenchmarkTarget({ kind, host, database }: BenchmarkTarget) {
  if (database !== BENCHMARK_DATABASE) throw new Error(`The benchmark only writes to the ${BENCHMARK_DATABASE} database, not ${database}.`);
  if (kind === "local" && !LOCAL_HOSTS.has(host)) throw new Error(`${host} is not a local host.`);
  if (kind === "atlas" && !host.endsWith(".mongodb.net")) throw new Error(`${host} is not an Atlas host.`);
}

export function vectorIndexDefinition(dimensions: number) {
  return {
    fields: [
      { type: "vector", path: "embedding", numDimensions: dimensions, similarity: "cosine" },
      { type: "filter", path: "organizationId" },
      { type: "filter", path: "documentId" },
    ],
  };
}

export function vectorSearchPipeline(request: BenchmarkRequest, { exact, dropFilters = [] }: PipelineOptions) {
  const clauses = [
    ...(dropFilters.includes("organization") ? [] : [{ organizationId: request.organizationId }]),
    ...(dropFilters.includes("document") ? [] : [{ documentId: { $in: request.documentIds } }]),
  ];
  return [
    {
      $vectorSearch: {
        index: BENCHMARK_INDEX,
        path: "embedding",
        queryVector: request.vector,
        limit: request.limit,
        ...(exact ? { exact: true } : { numCandidates: Math.min(request.limit * CANDIDATES_PER_RESULT, MAX_NUM_CANDIDATES) }),
        ...(clauses.length > 0 ? { filter: { $and: clauses } } : {}),
      },
    },
    { $project: { _id: 1, score: { $meta: "vectorSearchScore" } } },
  ];
}

/** Assumed: score = (1 + cosine) / 2. scoreProblems checks it on every result, and the run stops if it is wrong. */
export function atlasScoreToCosine(score: number) {
  return 2 * score - 1;
}

export function scoreProblems(byId: Map<string, VectorRow>, request: BenchmarkRequest, hits: Hit[], tolerance: number) {
  return hits.flatMap(({ id, score }) => {
    const row = byId.get(id);
    if (!row) return [`${request.id}: unknown row ${id}`];
    const expected = cosine(row.vector, request.vector);
    return Math.abs(expected - score) <= tolerance ? [] : [`${request.id}: ${id} scored ${score.toFixed(5)}, cosine is ${expected.toFixed(5)}`];
  });
}
