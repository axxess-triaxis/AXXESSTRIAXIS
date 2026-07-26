# Knowledge Hub Document Architecture

Sprint 9 adds the enterprise document layer that future Institutional Memory, AI, and RAG features will use. This sprint does not add AI behavior.

## Scope

The Knowledge Hub supports:

- Documents
- Knowledge articles
- Categories
- Tags
- Search
- Recent activity
- Shared with me
- Favorites
- Archived documents

## Data Model

Document metadata lives in `public.documents`. File binaries live in the private Supabase Storage bucket named `axxess-documents`.

Related tables:

- `document_versions`: immutable version metadata for uploaded files.
- `document_categories`: tenant-scoped category hierarchy.
- `document_tags`: tenant-scoped tag dictionary.
- `document_tag_links`: normalized document-to-tag relationships.
- `document_permissions`: explicit sharing permissions.
- `document_favorites`: per-user favorites.
- `document_activity`: document action timeline.
- `knowledge_articles`: Markdown knowledge-base content.
- `knowledge_article_tags`: normalized article-to-tag relationships.

## Supported Types

The architecture recognizes PDF, DOCX, XLSX, PPTX, images, text, Markdown, links, and unknown file types. OCR is intentionally not included in Sprint 9.

## Workflows

Implemented foundations:

- Upload with metadata creation.
- Signed preview and download intent.
- Rename and metadata edit.
- Visibility update.
- Archive and restore.
- Soft delete.
- Category and tag management.
- Knowledge article draft and publish states.
- Activity records for document events.

## Permissions

Documents inherit organization membership and role boundaries. Guest users can only access documents through explicit/shared visibility paths. Manager and higher roles can manage taxonomy and document permissions.

See `docs/STORAGE.md` for private object access and `docs/SEARCH.md` for search behavior.

## Knowledge Hub Vs. Documents & Files (Sprint 2, 2026-07-24)

There are two separate document-facing surfaces in the product, and only one of them actually performs RAG indexing. This was found during Sprint 2 (Live Golden Path Execution) after a live walkthrough reported Knowledge Hub upload as fully working ("7 files uploaded, indexed") while a separate "Documents & Files" ingestion action appeared broken.

- **Knowledge Hub** (`src/features/knowledge-hub/KnowledgeHubSection.tsx`): uploads the raw file to Supabase Storage and creates a `documents` row with file metadata (name, size, mime type). **It never extracts or chunks the file's actual text content, and never writes to `rag_document_chunks`.** Its "Uploaded / Classified / Chunked / Indexed / Ready" status panel is computed client-side and is not backed by any real chunk-existence check -- a file shows as "Ready" the moment its metadata record exists, regardless of whether its content was ever indexed. A document uploaded only through Knowledge Hub is **not** retrievable by a real governed RAG question.
- **Documents & Files** (`src/features/documents/DocumentsSection.tsx`, `POST /api/documents/ingest` -> `ingestTenantDocument()` in `src/services/rag/tenantRagWorkflow.ts`): the only path in the codebase that chunks real document text, computes deterministic embeddings, and writes to `rag_document_chunks` -- this is what actually makes a document answerable by `/api/rag/query`.

**Practical implication:** to exercise the real golden path (ask a governed question and get a cited answer), a document's text must go through Documents & Files' "Index document" action, not (or not only) a Knowledge Hub upload. Making Knowledge Hub uploads also perform real chunking/embedding, and making its status panel reflect genuine indexing state instead of a cosmetic one, is a real gap worth closing in a future sprint -- it was not attempted in Sprint 2 to keep this sprint's scope to the smallest blocker in the golden path itself, not a broader module-completion effort.

**ZIP upload** (bulk ingestion) remains unimplemented -- it requires real archive extraction (an unzip library, iterating contained files, ingesting each individually), which is not a trivial, sprint-scoped change. Deferred to a future bulk-ingestion sprint, as flagged in `docs/readiness/TENANT_0_ONBOARDING_ATTEMPTS_2026_07_24.md`.

## Indexing a Knowledge Hub Document (RAG Remediation Sprint 1, 2026-07-26)

Before this sprint, the gap above was worse in practice than it sounds: Documents & Files' "Index document" form always *created a new, disconnected document record* from pasted title/text, even if the same document had already been uploaded through Knowledge Hub. There was no way to attach indexed text to an existing document -- only to spawn a second, unrelated one with a similar title.

`POST /api/documents/ingest` (`ingestTenantDocument()` in `src/services/rag/tenantRagWorkflow.ts`) now accepts an optional `documentId`. When set:

- The existing document is looked up via `documentsRepository.getById()` and verified to belong to the caller's organization (cross-tenant reindex attempts throw).
- Deleted documents cannot be reindexed.
- The document's own real `title`/`visibility`/`classification`/`tags`/`ownerId`/`categoryId` are reused -- the ingest form's title/visibility/classification/tags inputs are ignored in this mode, so indexed chunk metadata can never drift from the document's actual governed state.
- A new `document_versions` row is appended (version number computed from existing versions for that document, not hardcoded to 1).
- `document_activity` records an `"edited"` action with `metadata.event = "indexed"` (the `document_activity.action` DB check constraint does not have a dedicated `"indexed"` value; adding one would need its own migration, out of this sprint's scope).

`src/features/documents/DocumentsSection.tsx` exposes this as a document selector ("Index an uploaded document") populated from the tenant's real, non-archived, non-deleted documents (`selectableDocumentsForIndexing()`). Selecting "New document (paste text only)" (the default) preserves the original create-a-new-document behavior unchanged.

**Still not solved:** PDF/DOCX text extraction. Selecting a document does not auto-populate its text -- the HITL still pastes the text to index, with the UI now saying so explicitly ("Automatic text extraction from PDFs and other files isn't available yet"). What changed is that the resulting chunks attach to the correct, already-governed document record instead of creating an orphan duplicate.
