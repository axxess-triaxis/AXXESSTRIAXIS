# Governed RAG

Sprint 11 adds the first governed retrieval-augmented generation layer for AXXESS.

## Capabilities

- Document chunking
- Lexical retrieval fallback
- Embeddings-ready abstraction boundary
- Source citations
- Metadata filtering by category and tag
- Tenant-aware retrieval
- Permission-aware retrieval
- Confidence score
- Human review flag
- Answer audit log writes
- Sources used display in AI Workspace

## Permission Model

RAG never retrieves across unauthorized documents.

Filtering considers:

- Organization
- Document status
- Visibility
- Classification
- Owner
- Explicit document permissions
- User role

Restricted documents require elevated roles and automatically flag human review on generated answers.

## Current Retrieval

The current implementation uses deterministic local token similarity. This keeps investor preview and offline development reliable without downloading external models. The service is structured so production embeddings can be introduced later without changing UI contracts.

## Audit

Each generated answer attempts to record:

- Query text
- Confidence
- Human review status
- Source IDs used
- Actor and organization through the audit repository

## Next Steps

- Add production embedding provider adapters.
- Persist chunk indexes per tenant.
- Add document-level department mappings.
- Add evaluation fixtures for answer quality and citation grounding.

## RAG Remediation Sprint 1 (2026-07-26): Source Integrity and Knowledge Hub-to-Index Path

Two real gaps surfaced by a live HITL walkthrough (`docs/readiness/AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md`) were fixed:

1. **Archived documents were still retrievable.** `canRetrieveDocument()` in `src/services/rag/governedRag.ts` excluded only `status === "deleted"`, not `"archived"` -- so archiving a stale or placeholder document via the existing Knowledge Hub UI had no effect on live RAG retrieval. Now both statuses are excluded, so Archive is a real, safe cleanup path for removing a document from governed retrieval without deleting it.
2. **No way to index an already-uploaded Knowledge Hub document.** `ingestTenantDocument()` in `src/services/rag/tenantRagWorkflow.ts` previously always created a brand-new, disconnected `documents` row from pasted title/text -- there was no way to attach indexed text to a document a user had already uploaded through Knowledge Hub. `ingestTenantDocument()` now accepts an optional `documentId`; when set, it reuses the existing document's real metadata (title, owner, visibility, classification, tags, category) instead of trusting the ingest form's inputs, so indexed chunk metadata can never drift from the document's actual governed state. Cross-tenant reindex attempts are rejected. `src/features/documents/DocumentsSection.tsx` exposes this as a document selector.

**What did not change:** there is still no PDF/DOCX text-extraction pipeline anywhere in this codebase. Selecting an uploaded document does not auto-extract its text -- the HITL still pastes the text to index. This sprint made the resulting chunks attach to the correct, real document instead of creating an orphan; it did not add extraction. See `docs/readiness/RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md` for full evidence and retest steps, and the roadmap doc for the deferred RAG-2 scope (answer-generation quality, confidence-score explainability, review-to-work content carryover).

## Sprint 14 Repository Foundation

Sprint 14 adds ingestion, embedding, vector store, evaluation, and repository modules under `src/services/rag` and `src/repositories/rag`.

The Supabase migration `202607100001_sprint14_rag_integrations_alerts.sql` introduces:

- RAG ingestion runs
- RAG document chunks
- Embedding metadata
- Organization-scoped policies

The runtime remains safe when remote model providers are unavailable because deterministic local embeddings and in-memory vector storage are available for tests, investor preview, and clean development tenants.
