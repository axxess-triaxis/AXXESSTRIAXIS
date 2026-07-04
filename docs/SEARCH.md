# Knowledge Search Architecture

Sprint 9 implements enterprise search without AI, embeddings, or RAG.

## Current Search

Search covers:

- Document title
- Document description
- Filename
- MIME type
- Tags
- Category
- Knowledge article title
- Knowledge article summary
- Knowledge article Markdown body

The migration adds PostgreSQL `tsvector` columns and GIN indexes to:

- `public.documents.search_vector`
- `public.knowledge_articles.search_vector`

The repository layer exposes `knowledgeSearchRepository.search(scope, query)`, which keeps the UI independent from the underlying search implementation.

## Query Scopes

Supported scopes:

- `all`
- `documents`
- `articles`
- `recent`
- `favorites`
- `shared`
- `archived`

The UI also supports local fallback filtering when Supabase tables are not populated.

## Future Semantic Search

The search abstraction is intentionally separate from the UI so Sprint 10 or later can add:

- Embeddings
- Hybrid lexical and semantic ranking
- RAG retrieval pipelines
- Per-tenant vector indexes
- Permission-aware retrieval

Any future semantic search must preserve the same tenant and document permission filters enforced by the relational tables.
