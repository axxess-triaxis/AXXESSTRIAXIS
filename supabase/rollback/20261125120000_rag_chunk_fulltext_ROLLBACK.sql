-- Rolls back 20261125120000_rag_chunk_fulltext.sql. No data is lost: chunk_tsv is generated from
-- chunk_text and metadata. tenantRagWorkflow.ts returns to its previous path when the function is missing.
drop function if exists public.search_rag_chunks_fulltext(uuid, uuid[], text, text, int);
drop index if exists public.rag_document_chunks_tsv_idx;
alter table public.rag_document_chunks drop column if exists chunk_tsv;
