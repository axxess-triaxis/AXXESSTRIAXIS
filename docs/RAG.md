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

## RAG Remediation Sprint 2 (2026-07-26): Answer Quality, Confidence Explainability, Review-to-Work Fidelity

**Architecture finding (WS1):** neither RAG path in this codebase calls a real external language model. `src/services/ai/providers/index.ts`'s `remotePlaceholderProvider` is an explicit stub ("Live completion calls remain provider-gated until production credentials... are enabled"). Every answer is a deterministic local extractive summary of retrieved chunk text (`summarizeText()` over the real citation excerpts), computed by `contextAnswer()` (persistent path, `tenantRagWorkflow.ts`) or `answerWithGovernedRag()` (in-memory path, `governedRag.ts`). Critically, `routeAiRequest()`'s own generated text was already being called but its `.answer` output was discarded -- only its `confidence`/`modelUsed`/routing metadata were ever used; the actually-displayed answer text always came from the deterministic local summary, not the router's output. This is now documented rather than left implicit.

**Fixed:** `contextAnswer()` previously closed every persistent-path answer with "The strongest evidence relates to {keywords extracted from question + context}" -- echoing the *question's own* keywords back at the reader in a way that reads as an independent finding even on weak matches. Removed; replaced with a source-attribution clause naming the actual document(s) used.

**Added (`src/services/rag/confidenceExplanation.ts`, new):** every `RagAnswer` now carries a `confidenceExplanation` object -- source match strength, relevant chunk count, source authorization status, citation coverage, `answerMode` (`"local_extractive_summary"` or `"no_authorized_source"` -- the honest "no real model provider" state the sprint required), and human-review requirement. Confidence for a real match is capped at `LOCAL_SYNTHESIS_CONFIDENCE_CEILING` (0.85) specifically because no external model verified the answer -- previously the local formula could reach 0.96, implying a certainty level this system cannot actually back. The explanation is surfaced in AI Workspace next to the confidence badge and persisted in `ai_operation_reviews.metadata` for audit.

**Fixed (WS3, A-63):** `AiReviewInboxItem` never carried the original question, and downstream records created from an approved review (task/approval/stakeholder-note/project-update/meeting) only ever got a one-sentence answer excerpt plus citation titles -- never the question itself. `tenantRagWorkflow.ts`'s `answerTenantQuestion()` now writes `question`/`fullAnswer`/`confidenceExplanation` into `ai_operation_reviews.metadata` (existing JSONB column, no migration), and `liveTenantWorkflow.ts`'s `createApprovedAction()` includes the question and full answer in every created record's description, plus `confidenceExplanation` in the structured `metadata` for the three record types (approval request, stakeholder note, project update) whose domain types support it. Task and Meeting have no `metadata` column in their domain types (a real schema constraint, not addressed this sprint) -- they get the enriched description text, not structured metadata.

**Fixed (WS4, A-64/A-59):** the guided-demo tour's "Next" button was labeled with the *current* step's own action name (e.g. "Ask AI Workspace") but its `onClick` advanced to the *next* step's section (e.g. Tasks & Workflow) -- a single root cause reproducing both A-64 ("Ask AI Workspace" landing on Tasks & Workflow) and A-59 ("Review approval queue" landing on Analytics). Every step's own `cta` text already named its own section correctly; the bug was purely in which step's `cta` the button displayed. Fixed in `useGuidedDemo.ts`/`GuidedDemoBanner.tsx` by showing the destination step's own `cta` as the label, with zero change to the actual navigation logic.

**What did not change / remains unresolved:** no real external LLM was integrated -- out of this sprint's "do not rewrite the RAG architecture" scope. A-55's root cause (whether templated-looking answers are a generator defect or an honest reflection of thin indexed content) still requires a live HITL retest on production with a real freshly-indexed document, which this environment cannot perform. See `docs/readiness/RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md` for full evidence, exact test results, and the retest steps.

## Sprint 14 Repository Foundation

Sprint 14 adds ingestion, embedding, vector store, evaluation, and repository modules under `src/services/rag` and `src/repositories/rag`.

The Supabase migration `202607100001_sprint14_rag_integrations_alerts.sql` introduces:

- RAG ingestion runs
- RAG document chunks
- Embedding metadata
- Organization-scoped policies

The runtime remains safe when remote model providers are unavailable because deterministic local embeddings and in-memory vector storage are available for tests, investor preview, and clean development tenants.
