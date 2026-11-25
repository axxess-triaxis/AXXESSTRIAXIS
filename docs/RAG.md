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

> Historical (Sprint 11). Semantic retrieval was added 2026-10-05; measured results are under
> "Retrieval quality gate" below.

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

## Retrieval quality gate (2026-11-24)

`pnpm run rag:release-gate` measures the real retrieval path. It replaced a gate that scored observations
built from its own fixtures and so could not fail.

**What runs.** `.github/workflows/rag-release-gate.yml` starts a local Supabase stack on the runner: the
real migrations, PostgREST, Auth, pgvector and the `embed` function (gte-small). The harness creates three
synthetic tenants, signs in as synthetic users, indexes 56 documents with `ingestTenantDocument`, and asks
108 questions with `answerTenantQuestion`, the function behind `POST /api/rag/query`. No hosted project and
no model provider is contacted, and the harness refuses any URL that is not local.

**Modes.** `semantic` (embed function configured), `fulltext` (not configured: full-text search narrows,
the token hash ranks) and `hash` (token hash over every authorized document). These are the ways production
itself degrades.

**Measured 2026-11-24** on commit `5b1e7dcf`, CI run 45451898878:

| Mode | Recall at 5 | MRR | nDCG at 5 | No-answer correct | Cross-tenant leaks | Unauthorized leaks |
|---|---|---|---|---|---|---|
| hash | 0.5600 | 0.4018 | 0.4407 | 0/16 | 0 | 0 |
| fulltext | 0.5733 | 0.4436 | 0.4756 | 0/16 | 0 | 0 |
| semantic | 0.9867 | 0.9116 | 0.9303 | 0/16 | 0 | 0 |
| *random order, calculated* | *0.3511* | *0.1603* | *0.2070* | | | |

**What fails the build.** Any cross-tenant or unauthorized-document leak, any query error, any chunk without
an embedding, any question not asked, or a metric below `golden/v1/thresholds.json` (the measured baseline
minus one question). CI also runs `--self-test`, which breaks the real source in memory in eight ways and
fails unless each is caught. With no backend the script exits 2 and reports `not_measured`.

**Leaks** are judged by an access oracle written from the golden set, not by `canRetrieveDocument`, and by
searching the answer and excerpts for sentences of forbidden documents.

**Limits.** The data is synthetic, small (13 to 18 readable documents per user), English, clean and written
by one author together with the questions. The numbers compare changes on this set. They do not predict
quality on customer documents. At that commit retrieval never abstained and full text served 9 of 108
questions; see the next section for what changed. Details and the raw table:
`docs/readiness/RAG_RETRIEVAL_GATE_CLOSEOUT_2026_11_24.md`.

**Changing it.** Keep `golden/v1` and `golden/v2` frozen so results stay comparable; add `v3` for new questions. If a change
improves retrieval, re-measure and raise the thresholds in the same pull request. If a refactor makes a
self-test edit stop matching, the gate fails and names it: update `scripts/rag-gate-mutations.mjs`.

**Run it locally** (needs Docker): put `EMBED_FUNCTION_SECRET` in `supabase/functions/.env`, run
`pnpm exec supabase start`, then set `RAG_GATE_SUPABASE_URL`, `RAG_GATE_ANON_KEY` and
`RAG_GATE_SERVICE_ROLE_KEY` from `pnpm exec supabase status -o env` and `RAG_GATE_EMBED_SECRET` to the same
secret.

**API.** `GET /api/rag/evaluation` reports `not_measured`. `POST` scores only complete observations the
caller supplies, returns 400 and records nothing otherwise, and marks the row `client_supplied`. Rows in
`rag_release_gates` from before 2026-11-24 may be passes with nothing observed.

## Chunk full text, rank fusion and abstention (2026-11-25)

Not applied to any hosted project. Full text over chunks needs
`supabase/migrations/20261125120000_rag_chunk_fulltext.sql`. Without it retrieval takes its previous path.

- **Chunk full text.** `search_rag_chunks_fulltext` searches chunk text and title, matches any word, and
  ranks by how rare each word is. Only `service_role` may call it. It is limited to document ids the
  application already authorized and skips chunks the user's role may not read. It returns coverage: the
  share of the question's word weight found in a chunk.
- **Rank fusion** (`retrievalFusion.ts`), semantic mode: reciprocal rank of the similarity list plus the
  full-text list. Full text votes only for a chunk with coverage above 0.5. The score shown is still the
  similarity.
- **Abstention** (`abstention.ts`), semantic mode: no sources and a human-review request when the best
  similarity is below 0.785 and the best coverage is below 0.2. Below 0.82 and 0.25 it shows sources and
  asks for review. It never abstains on documents the user attached, or when full text could not run.
- **Full-text mode** asks for review, but does not abstain, when no word of the question is in any readable
  chunk, title or description. Abstaining there was measured and dropped. **Hash mode** is unchanged.
- **Evidence** (`retrievalEvidence.ts`) is computed only over chunks the user may read, so an abstention
  says nothing about documents they may not.

The limits are tied to gte-small and English text, and were chosen on golden v1. Re-measure them if either
changes. Before and after table, by commit and run:
`docs/readiness/RAG_RETRIEVAL_QUALITY_CLOSEOUT_2026_11_25.md`.
