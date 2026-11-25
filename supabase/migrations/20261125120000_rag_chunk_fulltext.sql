-- Full text over RAG chunk bodies (2026-11-25). search_documents_fulltext requires every word of the
-- question (websearch_to_tsquery) and reads only the title and a two-sentence description, so on the
-- golden set it served 9 of 108 questions (docs/readiness/RAG_RETRIEVAL_GATE_CLOSEOUT_2026_11_24.md).
-- This searches the chunk text and title, and matches any word, ranked by how rare each word is.
--
-- Additive: one generated column, one index, one function. The generated column rewrites
-- rag_document_chunks once, under an exclusive lock, when this is applied. Until it is applied the
-- function does not exist and tenantRagWorkflow.ts keeps its previous path.
--
-- Same contract as match_rag_document_chunks: ranks candidates and returns ids only, limited to the
-- document ids the application already authorized. Role-restricted chunks are left out here as well, so
-- word rarity and coverage never depend on text the asking user may not read. Authorization itself
-- stays in tenantRagWorkflow.ts.

alter table public.rag_document_chunks
  add column if not exists chunk_tsv tsvector
  generated always as (
    to_tsvector('english'::regconfig, coalesce(metadata ->> 'title', '') || ' ' || coalesce(chunk_text, ''))
  ) stored;

create index if not exists rag_document_chunks_tsv_idx
  on public.rag_document_chunks using gin (chunk_tsv);

-- rank: BM25 without length normalization, over the authorized chunks.
-- coverage: 0 to 1, the share of the question's word weight found in this chunk. A word found in no
-- authorized chunk counts at full weight, so an unknown term lowers coverage.
create or replace function public.search_rag_chunks_fulltext(
  p_organization_id uuid,
  p_document_ids uuid[],
  p_role text,
  p_query text,
  p_limit int default 50
)
returns table (id uuid, rank double precision, coverage double precision)
language sql
stable
security invoker
set search_path = public
as $$
  with query_terms as materialized (
    select t.lexeme from unnest(to_tsvector('english'::regconfig, left(coalesce(p_query, ''), 2000))) as t
  ),
  or_query as materialized (
    select string_agg('''' || replace(replace(q.lexeme, chr(92), repeat(chr(92), 2)), '''', '''''') || '''', ' | ')::tsquery as tsq
    from query_terms q
  ),
  permitted as materialized (
    select c.id, c.chunk_tsv
    from public.rag_document_chunks c
    where c.organization_id = p_organization_id
      and c.document_id = any(p_document_ids)
      and (cardinality(c.role_allowlist) = 0 or p_role = any(c.role_allowlist))
  ),
  hits as materialized (
    select p.id, t.lexeme, coalesce(array_length(t.positions, 1), 1)::double precision as occurrences
    from permitted p
    cross join or_query o
    cross join lateral unnest(p.chunk_tsv) as t
    join query_terms q on q.lexeme = t.lexeme
    where p.chunk_tsv @@ o.tsq
  ),
  weights as materialized (
    select q.lexeme,
      ln(1 + ((select count(*) from permitted) - coalesce(d.chunks, 0) + 0.5) / (coalesce(d.chunks, 0) + 0.5))::double precision as weight
    from query_terms q
    left join (select h.lexeme, count(*) as chunks from hits h group by h.lexeme) d on d.lexeme = q.lexeme
  )
  select h.id,
    sum(w.weight * h.occurrences * 2.2 / (h.occurrences + 1.2)) as rank,
    sum(w.weight) / nullif((select sum(total.weight) from weights total), 0) as coverage
  from hits h
  join weights w on w.lexeme = h.lexeme
  group by h.id
  order by rank desc, h.id
  limit least(greatest(p_limit, 0), 200);
$$;

-- service_role only, like match_rag_document_chunks: chunk text must not be reachable, even as a ranking
-- signal, around canRetrieveDocument().
revoke all on function public.search_rag_chunks_fulltext(uuid, uuid[], text, text, int) from public, anon, authenticated;
grant execute on function public.search_rag_chunks_fulltext(uuid, uuid[], text, text, int) to service_role;

comment on function public.search_rag_chunks_fulltext(uuid, uuid[], text, text, int) is
  'Ranked chunk ids for RAG, any word matching, limited to authorized document ids. Ranking only: callers must still apply canRetrieveDocument().';
