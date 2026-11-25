import type { TenantScope } from "../../repositories/interfaces";
import { supabaseAdminRest } from "../../repositories/supabaseAdmin";

// Full text over chunk bodies, any word matching (search_rag_chunks_fulltext, 2026-11-25). Ranking only:
// the SQL is limited to the document ids passed in, and callers still run their own authorization check
// on every returned row.

export type ChunkFullTextHit = {
  id: string;
  rank: number;
  /** 0 to 1: the share of the question's word weight found in this chunk (rare words weigh more). */
  coverage: number;
};

/** Best first. An empty list means no word matched. Null means the search could not run (for example
 * the migration is not applied), and the caller keeps its previous path. */
export async function searchChunksFullText(
  scope: TenantScope,
  documentIds: string[],
  question: string,
  limit: number,
): Promise<ChunkFullTextHit[] | null> {
  const hits = await supabaseAdminRest<ChunkFullTextHit[]>("rpc/search_rag_chunks_fulltext", {
    method: "POST",
    body: {
      p_organization_id: scope.organizationId,
      p_document_ids: documentIds,
      p_role: scope.role,
      p_query: question,
      p_limit: limit,
    },
  }).catch(() => null);
  return Array.isArray(hits) ? hits : null;
}
