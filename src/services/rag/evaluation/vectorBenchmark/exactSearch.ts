// The benchmark's own answer key: brute-force cosine search over the rows a request may see. It uses no
// database, so neither pgvector nor MongoDB marks its own work.

import { mean } from "../retrievalMetrics";

export type VectorRow = { id: string; organizationId: string; documentId: string; vector: Float32Array };
/** The arguments of match_rag_document_chunks, which is what both databases are asked. */
export type BenchmarkRequest = { id: string; organizationId: string; documentIds: string[]; vector: number[]; limit: number; group?: string };
/** score is cosine similarity, best first. */
export type Hit = { id: string; score: number };
export type BenchmarkRun = { request: BenchmarkRequest; hits: Hit[]; milliseconds: number };

export function cosine(left: ArrayLike<number>, right: ArrayLike<number>) {
  let dot = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftSquares += left[index] * left[index];
    rightSquares += right[index] * right[index];
  }
  return dot / Math.sqrt(leftSquares * rightSquares);
}

function eligibleRows(rows: VectorRow[], request: BenchmarkRequest) {
  const documents = new Set(request.documentIds);
  return rows.filter((row) => row.organizationId === request.organizationId && documents.has(row.documentId));
}

export function exactTopK(rows: VectorRow[], request: BenchmarkRequest): Hit[] {
  return eligibleRows(rows, request)
    .map((row) => ({ id: row.id, score: cosine(row.vector, request.vector) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, request.limit);
}

/** Candidates that should never have been returned, before the application's own authorization runs. */
export function candidateProblems(byId: Map<string, VectorRow>, request: BenchmarkRequest, hits: Hit[]) {
  const documents = new Set(request.documentIds);
  const problems = { crossTenant: [] as string[], unlisted: [] as string[], unknown: [] as string[] };
  for (const { id } of hits) {
    const row = byId.get(id);
    if (!row) problems.unknown.push(id);
    else if (row.organizationId !== request.organizationId) problems.crossTenant.push(id);
    else if (!documents.has(row.documentId)) problems.unlisted.push(id);
  }
  return problems;
}

/** Nearest-rank percentile. */
export function percentile(values: number[], share: number) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil((share / 100) * sorted.length) - 1)];
}

export function scoreRun(rows: VectorRow[], runs: BenchmarkRun[]) {
  if (runs.length === 0) throw new Error("There are no requests to score.");
  const byId = new Map(rows.map((row) => [row.id, row]));
  const recalls: number[] = [];
  const totals = { returned: 0, expected: 0, shortResults: 0, crossTenant: 0, unlisted: 0, unknown: 0 };
  for (const { request, hits } of runs) {
    const expected = exactTopK(rows, request);
    const returned = new Set(hits.map((hit) => hit.id));
    // A request with nothing to find says nothing about recall.
    if (expected.length > 0) recalls.push(expected.filter((hit) => returned.has(hit.id)).length / expected.length);
    totals.returned += returned.size;
    totals.expected += expected.length;
    if (returned.size < expected.length) totals.shortResults += 1;
    const problems = candidateProblems(byId, request, hits);
    totals.crossTenant += problems.crossTenant.length;
    totals.unlisted += problems.unlisted.length;
    totals.unknown += problems.unknown.length;
  }
  const times = runs.map((run) => run.milliseconds);
  return { requests: runs.length, recall: mean(recalls), ...totals, p50: percentile(times, 50), p95: percentile(times, 95) };
}
