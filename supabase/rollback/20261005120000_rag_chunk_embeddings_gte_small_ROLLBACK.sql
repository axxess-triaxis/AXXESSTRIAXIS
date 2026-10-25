-- ROLLBACK for supabase/migrations/20261005120000_rag_chunk_embeddings_gte_small.sql
--
-- NOT a migration -- kept outside supabase/migrations/ so the CLI never auto-applies it.
--
-- Additive migration, so rollback is a plain drop. Safe with the application already deployed:
-- tenantRagWorkflow.ts treats a failed match_rag_document_chunks call, or a missing embedding
-- column, as "no semantic scores" and falls back to the embedding_hash scoring it always used.
-- Dropping the column discards computed embeddings; re-running the backfill
-- (scripts/backfill-rag-embeddings.mjs) after re-applying the migration recreates them.
-- The vector extension is left installed: other objects may come to depend on it, and an
-- unused extension costs nothing.

drop function if exists public.match_rag_document_chunks(uuid, uuid[], extensions.vector, int);
drop index if exists public.rag_document_chunks_embedding_hnsw_idx;
alter table public.rag_document_chunks drop column if exists embedding;
