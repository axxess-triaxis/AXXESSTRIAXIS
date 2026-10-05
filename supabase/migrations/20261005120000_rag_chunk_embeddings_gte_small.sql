-- Real semantic retrieval for RAG (founder decision 2026-10-05: free models, RAG testable for
-- real). Until now rag_document_chunks.embedding_hash held a 16-dimension token hash
-- (embeddingProvider.ts deterministicEmbeddingProvider) -- a lexical signal, not meaning. This adds
-- a real 384-dimension embedding from Supabase's built-in gte-small model (computed by the `embed`
-- Edge Function, supabase/functions/embed), stored in pgvector.
--
-- Purely additive: a nullable column, an index, one function. embedding_hash and the existing
-- retrieval path stay untouched -- a chunk with no embedding yet (not backfilled, or the Edge
-- Function was unavailable at ingest) is still scored by its hash exactly as before.
--
-- Same contract as 20260912180011_rag_fulltext_search_functions.sql: the function only ranks a
-- candidate set and returns (id, similarity). Authorization -- canRetrieveDocument(), role
-- allowlists, the tenant-boundary assertion -- stays in tenantRagWorkflow.ts.

create extension if not exists vector with schema extensions;

alter table public.rag_document_chunks
  add column if not exists embedding extensions.vector(384);

-- Cosine distance (gte-small vectors are normalized). HNSW builds incrementally, so it doesn't
-- need a populated table first, unlike ivfflat.
create index if not exists rag_document_chunks_embedding_hnsw_idx
  on public.rag_document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_rag_document_chunks(
  p_organization_id uuid,
  p_document_ids uuid[],
  p_query_embedding extensions.vector(384),
  p_limit int default 50
)
returns table (id uuid, similarity double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select c.id, 1 - (c.embedding <=> p_query_embedding) as similarity
  from public.rag_document_chunks c
  where c.organization_id = p_organization_id
    and c.document_id = any(p_document_ids)
    and c.embedding is not null
  order by c.embedding <=> p_query_embedding
  limit least(greatest(p_limit, 0), 200);
$$;

-- service_role only: the only caller is tenantRagWorkflow.ts through the admin REST client, where
-- the explicit p_organization_id filter plus the application-layer checks are the boundary.
-- Not granted to authenticated -- chunk text must not be reachable around canRetrieveDocument().
revoke all on function public.match_rag_document_chunks(uuid, uuid[], extensions.vector, int) from public, anon, authenticated;
grant execute on function public.match_rag_document_chunks(uuid, uuid[], extensions.vector, int) to service_role;
