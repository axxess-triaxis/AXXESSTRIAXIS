// Records each similarity search the real retrieval code makes, with what pgvector returned. The private
// MongoDB run answers the same requests, so it needs no Supabase stack of its own.

import type { BenchmarkRequest, Hit } from "./exactSearch";

export type RecordedSearch = { request: BenchmarkRequest; hits: Hit[] };
type MatchBody = { p_organization_id: string; p_document_ids: string[]; p_query_embedding: string; p_limit: number };

const MATCH_PATH = "/rest/v1/rpc/match_rag_document_chunks";

export function recordMatchRequests(original: typeof fetch) {
  const recorded: RecordedSearch[] = [];
  const failures: string[] = [];
  const recordingFetch: typeof fetch = async (input, init) => {
    const response = await original(input, init);
    const url = input instanceof Request ? input.url : String(input);
    if (!new URL(url).pathname.endsWith(MATCH_PATH)) return response;
    if (!response.ok) {
      failures.push(String(response.status));
      return response;
    }
    const body = JSON.parse(String(init?.body)) as MatchBody;
    const rows = await response.clone().json() as Array<{ id: string; similarity: number }>;
    recorded.push({
      request: {
        id: `r${recorded.length + 1}`,
        organizationId: body.p_organization_id,
        documentIds: body.p_document_ids,
        vector: JSON.parse(body.p_query_embedding) as number[],
        limit: body.p_limit,
      },
      hits: rows.map((row) => ({ id: row.id, score: row.similarity })),
    });
    return response;
  };
  return { fetch: recordingFetch, recorded, failures };
}
