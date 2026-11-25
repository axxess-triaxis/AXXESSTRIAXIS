// Deliberate breakages of the real retrieval source, used to show that the RAG release gate notices.
// Each edit is applied in memory while Vite loads the module; no file on disk changes. An edit whose
// target text is not found exactly once is an error, so a mutation cannot quietly stop doing anything
// after a refactor: update it here in the same change.

const WORKFLOW = "src/services/rag/tenantRagWorkflow.ts";
const GOVERNED = "src/services/rag/governedRag.ts";
const HASH = "src/services/rag/embeddings/embeddingProvider.ts";
const SEMANTIC = "src/services/rag/embeddings/semanticEmbeddings.ts";
const GUARD = "src/security/tenantGuard.ts";
const CHUNK_FULLTEXT = "src/services/rag/chunkFullText.ts";

export const MUTATIONS = [
  {
    id: "semantic-embeddings-unavailable",
    modes: ["semantic"],
    description: "embedTexts always returns null, so semantic search silently degrades.",
    edits: [[SEMANTIC, "if (!isSemanticEmbeddingConfigured(env) || texts.length === 0) return null;", "return null;"]],
  },
  {
    id: "semantic-vectors-corrupted",
    modes: ["semantic"],
    description: "Question vectors are reversed before they reach pgvector.",
    edits: [[WORKFLOW, "p_query_embedding: toPgVector(questionVectors[0]),", "p_query_embedding: toPgVector([...questionVectors[0]].reverse()),"]],
  },
  {
    id: "ranking-reversed",
    modes: ["hash", "fulltext", "semantic"],
    description: "The worst matches are returned first.",
    edits: [[WORKFLOW, ".sort((left, right) => right.order - left.order)", ".sort((left, right) => left.order - right.order)"]],
  },
  {
    id: "retrieval-returns-nothing",
    modes: ["semantic"],
    description: "Every citation is dropped after ranking.",
    edits: [[WORKFLOW, ".slice(0, limit)\n    .map(({ row, score })", ".slice(0, 0)\n    .map(({ row, score })"]],
  },
  {
    id: "hash-collapsed",
    modes: ["hash"],
    description: "Every token hashes to the same dimension, so all chunks score the same.",
    edits: [[HASH, "vector[hash % vector.length] += 1;", "vector[0] += 1;"]],
  },
  {
    id: "fulltext-returns-nothing",
    modes: ["fulltext"],
    description: "Chunk full text never returns a hit, so the mode falls back to the title-and-description search.",
    edits: [[CHUNK_FULLTEXT, "return Array.isArray(hits) ? hits : null;", "return Array.isArray(hits) ? hits.slice(0, 0) : null;"]],
  },
  {
    id: "fulltext-question-dropped",
    modes: ["fulltext"],
    description: "Full text searches for a fixed word instead of the question.",
    edits: [[CHUNK_FULLTEXT, "p_query: question,", "p_query: \"staff\","]],
  },
  {
    id: "document-authorization-removed",
    modes: ["semantic"],
    description: "canRetrieveDocument allows every document in the organization and the chunk role check is skipped.",
    edits: [
      [GOVERNED, "if (document.status === \"deleted\" || document.status === \"archived\") return false;", "return true;"],
      [WORKFLOW, "if (row.role_allowlist.length > 0 && !row.role_allowlist.includes(scope.role)) return false;", ""],
    ],
  },
  {
    id: "tenant-isolation-removed",
    modes: ["hash"],
    description:
      "Documents are read with the service role and no organization filter, and the chunk filter, the organization check and the tenant assertion are gone. All four layers have to go before another tenant's text can be returned.",
    edits: [
      [
        WORKFLOW,
        "repositories.documentsRepository.list(scope, { pageSize: 2500 }),",
        "supabaseAdminRest<any[]>(\"documents\", { query: new URLSearchParams({ select: \"*\", limit: \"1000\" }) }).then((rows) => rows.map((row) => ({ ...row, organizationId: row.organization_id, ownerId: row.owner_user_id }))),",
      ],
      [WORKFLOW, "    organization_id: `eq.${scope.organizationId}`,\n    document_id: `in.", "    document_id: `in."],
      [GOVERNED, "if (document.organizationId !== scope.organizationId) return false;", ""],
      [GUARD, "export function assertTenantBoundary(context: TenantRequestContext, resource: TenantScopedResource): void {", "export function assertTenantBoundary(context: TenantRequestContext, resource: TenantScopedResource): void {\n  return;"],
    ],
  },
];

/** A Vite plugin that applies one mutation, plus a check that every edit really happened. */
export function mutationPlugin(mutation) {
  const pending = new Set(mutation.edits);
  return {
    plugin: {
      name: `rag-gate-mutation:${mutation.id}`,
      enforce: "pre",
      transform(code, id) {
        const file = id.replaceAll("\\", "/").split("?")[0];
        let mutated = code.replaceAll("\r\n", "\n");
        let changed = false;
        for (const edit of mutation.edits) {
          const [target, find, replacement] = edit;
          if (!file.endsWith(`/${target}`)) continue;
          const occurrences = mutated.split(find).length - 1;
          if (occurrences !== 1) throw new Error(`Mutation ${mutation.id}: expected one match in ${target}, found ${occurrences}: ${find}`);
          mutated = mutated.replace(find, () => replacement);
          pending.delete(edit);
          changed = true;
        }
        return changed ? { code: mutated, map: null } : null;
      },
    },
    assertApplied() {
      if (pending.size > 0) throw new Error(`Mutation ${mutation.id}: not applied in ${[...pending].map(([target]) => target).join(", ")}.`);
    },
  };
}
