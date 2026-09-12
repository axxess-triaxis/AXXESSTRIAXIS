-- RAG retrieval quality (2026-09-12): governedRag.ts and tenantRagWorkflow.ts both fetch every
-- document/article an org has and score them in JS with a hand-rolled token-overlap function --
-- no embeddings, no database-side ranking. Meanwhile documents.search_vector/knowledge_articles.
-- search_vector (Sprint 9, 202607040001_sprint9_knowledge_hub.sql) already have GIN indexes and
-- have never been queried by anything (grepped all of src/ for ts_rank/websearch_to_tsquery/
-- search_vector -- zero hits). These two functions expose that existing, paid-for infrastructure
-- for candidate-set ranking. They intentionally return only (id, rank) -- row data and the real
-- authorization gate (canRetrieveDocument() in governedRag.ts, which excludes archived/deleted
-- status and restricted classification for non-elevated roles -- neither of which this repo's own
-- RLS select policies reference) still live entirely in the application layer. Confirmed by reading
-- documents_sprint9_select in the Sprint 9 migration: it never mentions classification or status,
-- so it is measurably more permissive than canRetrieveDocument() -- these functions must only ever
-- narrow/rank a candidate set, never stand in as the authorization check.

create or replace function public.search_documents_fulltext(
  p_organization_id uuid,
  p_query text,
  p_limit int default 25
)
returns table (id uuid, rank real)
language sql
stable
security invoker
set search_path = public
as $$
  select d.id, ts_rank_cd(d.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.documents d
  where d.organization_id = p_organization_id
    and d.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit greatest(p_limit, 0);
$$;

create or replace function public.search_knowledge_articles_fulltext(
  p_organization_id uuid,
  p_query text,
  p_limit int default 25
)
returns table (id uuid, rank real)
language sql
stable
security invoker
set search_path = public
as $$
  select a.id, ts_rank_cd(a.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.knowledge_articles a
  where a.organization_id = p_organization_id
    and a.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit greatest(p_limit, 0);
$$;

-- security invoker (the default, stated explicitly): called with a user JWT, documents/
-- knowledge_articles RLS still applies underneath exactly as a direct table query would. Called
-- with the service-role key (the agent-tool path, which already bypasses RLS for every other
-- admin-REST call in this codebase), the explicit p_organization_id filter is the real boundary --
-- matching the existing trust model elsewhere, not a new bypass.
grant execute on function public.search_documents_fulltext(uuid, text, int) to authenticated, service_role;
grant execute on function public.search_knowledge_articles_fulltext(uuid, text, int) to authenticated, service_role;

comment on function public.search_documents_fulltext(uuid, text, int) is
  'Ranked candidate ids from documents.search_vector for RAG retrieval narrowing. Ranking/narrowing only -- callers must still apply canRetrieveDocument() before using any result. websearch_to_tsquery is used because it never throws on malformed raw user input.';
comment on function public.search_knowledge_articles_fulltext(uuid, text, int) is
  'Ranked candidate ids from knowledge_articles.search_vector for RAG retrieval narrowing. Ranking/narrowing only -- callers must still apply the same document-layer authorization checks before using any result.';
