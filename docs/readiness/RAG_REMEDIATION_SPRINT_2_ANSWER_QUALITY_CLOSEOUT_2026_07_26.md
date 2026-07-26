# RAG Remediation Sprint 2 -- Answer Quality, Confidence Explainability, Review-to-Work Fidelity -- Closeout

Date: 2026-07-26
Branch: `canonical/sprint-1-35-unified-gitlab`
Planning provenance: Codex-drafted, founder-issued execution prompt, building on RAG Remediation Sprint 1 (`docs/readiness/RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md`) and the same 2026-07-25 HITL walkthrough (`docs/readiness/AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md`).

## Sprint Objective

Prove AXXESS can answer from real indexed tenant documents, explain confidence, preserve citations, and carry approved answer content into downstream work records -- targeting A-55, A-56, A-63, and A-13, plus the A-64/A-59 navigation defects where they directly block validation.

## What Changed

| File | Change |
|---|---|
| `src/services/rag/confidenceExplanation.ts` (new) | `buildConfidenceExplanation()` -- computes a `RagConfidenceExplanation` object (source match strength, relevant chunk count, source authorization status, citation coverage, answer mode, human-review requirement, capped-reason) and caps confidence at `LOCAL_SYNTHESIS_CONFIDENCE_CEILING` (0.85) whenever the answer is a local deterministic synthesis rather than a model-verified result -- which is always, since no real external LLM exists anywhere in this codebase. `summarizeConfidenceExplanation()` -- one-line UI summary. |
| `src/services/rag/governedRag.ts` | `RagAnswer` gained a required `confidenceExplanation` field. `answerWithGovernedRag()` now computes and returns it. |
| `src/services/rag/tenantRagWorkflow.ts` | `contextAnswer()` no longer echoes query keywords in a "The strongest evidence relates to..." clause -- replaced with a source-attribution clause naming the actual document(s). `answerTenantQuestion()` computes `confidenceExplanation` via the new module and writes `question`/`fullAnswer`/`confidenceExplanation` into `ai_operation_reviews.metadata` (existing JSONB column, no migration). |
| `src/services/ai/reviewInbox.ts` | `AiReviewInboxItem` gained optional `question`/`fullAnswer`/`confidenceExplanation`, read from `row.metadata`. `AiReviewRow`/`toInboxItem` exported for direct testing. Both PostgREST `select` clauses extended to fetch `metadata`. |
| `src/services/workflows/liveTenantWorkflow.ts` | `createApprovedAction()`'s `description` now leads with the original question (when present) and uses the full answer instead of only a 1-sentence excerpt; the `metadata` object passed to approval-request/stakeholder-note/project-update creation now includes `question` and `confidenceExplanation`. Meeting `actionItems` also uses the full answer. |
| `src/features/ai-workspace/AIWorkspaceSection.tsx` | Displays a compact "Why this score" line (via `summarizeConfidenceExplanation()`) next to the confidence badge. Both `RagAnswer` literal fixtures (`fallbackRagAnswer`, `emptyRagAnswer`) updated for the new required field. |
| `src/hooks/useGuidedDemo.ts` | Exposes `nextStep` (the step `goNext()` will actually navigate to). |
| `src/components/demo/GuidedDemoBanner.tsx` | "Next" button now displays `demo.nextStep.cta` instead of `demo.currentStep.cta` -- fixes the A-64/A-59 label/destination mismatch with zero change to navigation logic. |
| `src/services/rag/confidenceExplanation.test.ts` (new) | 6 tests: strong-match explanation, no-match explanation, ceiling capping + reason, no spurious capped-reason below the ceiling, restricted-source flagging, citation coverage math. |
| `src/services/rag/tenantRagWorkflow.answerGrounding.test.ts` (new) | 5 tests, using the real deterministic embedding provider against real indexed content (isolated via `vi.mock` the same way `tenantRagWorkflow.reviewInboxBridge.test.ts` is, since it needs `isSupabaseAdminConfigured()` true): real-document grounding with no keyword-echo; the stale-placeholder-archived-then-excluded end-to-end proof (ties Sprint 1's fix to Sprint 2's grounding claim); honest no-fabrication for a genuinely empty tenant; cross-tenant chunk-content exclusion; role-restricted chunk-content exclusion. |
| `src/services/ai/reviewInbox.test.ts` | +2 tests: `toInboxItem` metadata mapping present and absent. |
| `src/services/workflows/liveTenantWorkflow.test.ts` | +3 tests: question/full-answer carried into a task description; question/full-answer/confidenceExplanation carried into an approval request's description and structured metadata; graceful behavior for older reviews with no question/fullAnswer. |
| `src/hooks/useGuidedDemo.test.tsx` | +1 test: the Next button's displayed label always matches the section `goNext()` actually navigates to, using the concrete "ai-answer" -> "tasks" regression case. |

No files were deleted. No migration was added (same `ai_operation_reviews.metadata`/existing-JSONB-column pattern as Sprint 1's `document_activity` note).

## What Did Not Change

- **No real external LLM was integrated.** Out of this sprint's "do not rewrite the RAG architecture unless absolutely necessary" scope. Both RAG paths remain deterministic local extractive summarization of real retrieved content.
- **A-57 (CRM escalation path) and A-65 (feedback email notification)** were not investigated -- the sprint prompt scoped WS4 to "if directly blocking validation," and neither blocks RAG answer-quality validation.
- **Task and Meeting domain types have no `metadata` column** -- a real schema constraint, not addressed. They receive the enriched description text (question + full answer + citations) but not structured `confidenceExplanation`/`question` fields the way approval requests, stakeholder notes, and project updates do.
- **The `/api/rag/review` + `reviewTenantRagAnswer()` path** (used by AI Workspace's own inline Approve/Reject buttons, task-creation only) is a separate, older pathway from `/api/ai/reviews` + `createWorkflowActionFromAiReview()` (used by the AI Review Inbox, supports all 5 destination types). This sprint's review-to-work fidelity work targeted the latter, which is what the sprint's own required-test list (5 destination types) describes. The former was not modified.

## What Was Verified

### Architecture audit (Workstream 1)

Traced the full answer path end to end. Confirmed:
- No real external language model provider exists in this codebase. `src/services/ai/providers/index.ts`'s `remotePlaceholderProvider` is an explicit stub returning "Live completion calls remain provider-gated until production credentials, policy review, and audit sampling are enabled."
- `routeAiRequest()` was already being called from `answerTenantQuestion()`, but its own generated `.text`/`.answer` output was discarded -- only `confidence`/`modelUsed`/`providerUsed`/routing metadata were ever used. The answer text displayed to users always came from the deterministic local extractive summary (`contextAnswer()`/`answerWithGovernedRag()`), not the router's output. This was true before this sprint and remains true after -- now documented rather than left implicit.
- The specific keyword-echo clause the founder's walkthrough surfaced (`extractKeywords(question + context, 5)`) has been removed.
- A dedicated test suite (`tenantRagWorkflow.answerGrounding.test.ts`) proves, using the real deterministic embedding provider (not a mocked score), that a real indexed document's content genuinely drives the answer text, that cross-tenant and role-restricted chunk *content* never leaks into an answer (even accounting for the existing metadata-fallback retrieval tier), and that archiving a stale document (Sprint 1's fix) genuinely removes its content from answers.

### Confidence explainability (Workstream 2)

`confidenceExplanation.ts` unit-tested directly (6 tests). Confidence capped at 0.85 for any local-synthesis answer (which is all of them today) -- previously reachable up to 0.96, implying a certainty level this system cannot actually back with a real model. Explanation surfaced in AI Workspace UI and persisted to `ai_operation_reviews.metadata`.

### Review-to-work fidelity (Workstream 3)

Code audit found the pre-Sprint-2 state was better than the founder's walkthrough suggested for *some* fields (answer excerpt and citation titles already flowed into created records) but confirmed the founder's core concern for others: the original question was never captured anywhere in `AiReviewInboxItem`, and only a 1-sentence excerpt of the answer -- never the full text -- was preserved. Both gaps fixed using the existing `ai_operation_reviews.metadata` column (no migration). Verified end to end with real repository fixtures in `liveTenantWorkflow.test.ts`.

**Unauthorized-user protection** (the sprint's explicit required test: "Unauthorized user cannot create downstream work from another user's restricted review") was already fully covered by the existing Sprint 5 test `POST denies deciding a review not assigned to the caller, with a safe (non-raw) error message` in `src/app/api/ai/reviews/route.test.ts` -- the 403 happens before `createWorkflowActionFromAiReview` is ever called, so no workflow action can be created by an unauthorized caller. No new test needed; verified this coverage still exists and passes.

### Navigation fixes (Workstream 4)

Root-caused A-64 and A-59 to a single shared bug via direct code reading (`useGuidedDemo.ts`, `GuidedDemoBanner.tsx`, `demoWorkflow.ts`): every guided-demo step's own `cta` text already correctly named its own `section` -- the bug was that the "Next" button displayed the *current* step's `cta` while its `onClick` (`goNext()`) navigated to the *next* step's section. Fixed by displaying the destination step's own `cta` label, with zero change to the underlying navigation logic. Proven with a concrete regression test tracing the exact "ai-answer" -> "tasks" case the founder reported.

## Tests Run

- New/changed Sprint 2 files run in isolation first (11 files, 62 tests): all passed after 3 initial test-design corrections in `tenantRagWorkflow.answerGrounding.test.ts` (see below).
- Full suite: **143/143 test files passed, 559/559 tests passed, exit 0.** No flakes this pass.
- `pnpm run test:rag` / `pnpm run test:security`: **do not exist** as scripts, documented per the sprint prompt's own instruction.
- `pnpm run supabase:verify`: ran (local-static, no live credentials required) -- **passed**, 27 migrations, 100 created tables, 100 RLS-protected tables, 1 pre-existing warning unrelated to this sprint.

### A genuine test-design correction made mid-pass (not a code bug)

The first draft of 3 tests in `tenantRagWorkflow.answerGrounding.test.ts` asserted `answer.sources` would be empty for a no-match/cross-tenant/role-restricted scenario. All 3 initially failed -- not because the security/grounding code was wrong, but because `answerTenantQuestion()` has a genuine two-tier fallback: when the persistent-chunk path (`rag_document_chunks`) returns zero citations, it falls through to `governedRag.ts`'s document-metadata-based retrieval, which can legitimately find a match via the document's own title/tags even when the chunk-level path correctly found nothing. This is not a security leak (both tiers independently enforce `canRetrieveDocument`), but it meant "sources.length === 0" was the wrong assertion. Also discovered mid-diagnosis: this codebase's 16-dimension deterministic hash embedding has a real, measurable collision rate (verified with a standalone script -- an unrelated "gibberish" query scored 0.5 similarity against unrelated real content purely from hash-bucket collisions), so even a "no match" test needed a genuinely empty document set rather than trusting a random string not to collide. Both issues fixed by redesigning the 3 tests to assert the precise security property (excluded chunk content never appears in the answer) rather than a blanket "no sources," documented in the tests themselves.

## Items Closed

- RAG2-04 through RAG2-09, RAG2-12 through RAG2-16 (see `AI_WORKSPACE_RAG_PIPELINE_REMEDIATION_CHECKLIST_2026_07_26.md` for the full per-item table).
- A-56 (confidence explainability): code-complete and tested.
- A-63 (review-to-work fidelity): code-complete and tested.
- A-64, A-59 (navigation): fixed, tested.

## Items Still Partial or Blocked

- **RAG2-01/02/03**: real document indexing and re-query on production has not been attempted -- this environment has no Supabase credentials and no production browser session. Requires the HITL.
- **RAG2-10/RAG2-11 (A-57, A-65)**: explicitly deferred, out of this sprint's targeted scope.
- **A-55, A-13**: kept `Blocked`, not moved to `Yes`. Code-level evidence strongly supports the "citing a stale source, not a fake generator" hypothesis, but this is not the same as live confirmation.

## Why A-55/A-13 Are Not Claimed Resolved

Per the sprint's own non-negotiable ("Do not mark A-13 or A-55 closed unless tests or manual evidence show real document-grounded answers"): the tests added this sprint are real, and they do show real document-grounded answers -- but against test fixtures, not a live production query after the Sprint 1 HITL retest steps (archive the stale document, index a real document, re-query) have actually been performed. This environment cannot perform that retest. Claiming A-55/A-13 resolved without it would be exactly the kind of inflated claim `CLAUDE.md`'s evidence discipline exists to prevent.

## Confidence Changes

- A-13: 75% (code) -> 82% (code) -- reflects the Sprint 1 + Sprint 2 code-level chain now addressing all three connected findings (A-61/A-62/A-55) plus confidence explainability, still gated on live confirmation.
- A-56: moved to `Yes` at the actionables-matrix level (code-complete, tested), while separately still flagged as "pending HITL live confirmation" in the Kanban -- the two docs record this consistently but from different angles (matrix tracks code/product status, Kanban tracks retest-readiness).

## Residual Risks

- The two-tier retrieval fallback (persistent chunks, then document-metadata) means a "no match" UI state is not guaranteed whenever the chunk-level path finds nothing -- a document's own title/tags can produce a legitimate but different match. This is existing, pre-Sprint-2 architecture, not introduced this sprint, but is now explicitly documented rather than an implicit surprise.
- The 16-dimension deterministic hash embedding has a measurable collision rate at this scale (demonstrated during test design). This affects retrieval precision generally, not just test authoring -- worth flagging for a future sprint's scope discussion, not fixed here (out of "do not rewrite the RAG architecture" scope).
- No real external LLM exists. Every "AI answer" in this product today is a local deterministic extractive summary. This is now honestly labeled (`answerMode`) and confidence-capped, but the underlying capability gap itself is unresolved and would be a substantial, separately-scoped undertaking.

## Required HITL Manual Validation Steps (Post-Sprint-2)

1. Perform the RAG Remediation Sprint 1 retest first (archive the stale placeholder document in Knowledge Hub, select and index a real document via the new selector, re-run a query).
2. In AI Workspace, confirm the "Why this score" line appears next to the confidence badge and its explanation matches the query's actual sources.
3. In the AI Review Inbox, approve a real pending review with "Create Task," "Create approval request," or "Create Stakeholder Note." Open the created record and confirm its description includes the original question, not only the answer excerpt.
4. From the Executive Dashboard, start the guided demo ("Start guided setup"), advance to the "Ask governed AI" step, and confirm the Next button reads "Create follow-up task" and clicking it lands on Tasks & Workflow (not the reverse). Repeat for the "Human-in-the-loop governance" step and confirm it correctly advances to Analytics & Reports.
5. Re-score A-13/A-55/A-56 in `ACTIONABLES_READINESS_MATRIX.md` based on the outcome of steps 1-4.

## Exact Commands Run

```
pnpm run typecheck
pnpm --dir apps/mobile run typecheck
pnpm run lint --max-warnings=0
pnpm run test
pnpm run build
pnpm run supabase:verify
```

All passed. Exact counts in `docs/RELEASE_AND_VERIFICATION_EVIDENCE_LEDGER.md`.

## Exit Criteria Status

| Criterion | Status |
|---|---|
| Real indexed tenant document content is used in RAG answers | Code-proven (real embeddings, real content); live-unconfirmed |
| Dummy/template answer behavior removed or isolated from live tenants | Keyword-echo clause removed; stale-content exclusion mechanism (Sprint 1) proven end-to-end in tests |
| No-match answers are honest and low confidence | Done -- confirmed 0% confidence, no fabrication |
| Confidence score has an explainable breakdown | Done |
| Review-to-work records preserve question, answer, citations, confidence, review context | Done for approval request/stakeholder note/project update (structured); done via description text for task/meeting (schema constraint) |
| Relevant navigation defects fixed | Done (A-64/A-59) |
| Tenant and permission boundaries tested | Done -- cross-tenant and role-restriction content-leak tests added |
| Documentation, actionables, roadmap, checklist, Kanban updated | Done |
| Verification suite run and recorded | Done -- 143/143 files, 559/559 tests, clean build, `supabase:verify` passed |

**Full AI/RAG completion is not claimed.** A-55/A-13 remain `Blocked` pending live HITL confirmation, and no real external language model exists in this product today.
