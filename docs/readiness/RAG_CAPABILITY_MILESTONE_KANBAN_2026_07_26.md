# RAG Capability -- Kanban and Milestone

Date created: 2026-07-26
Source: synthesized from already-verified evidence produced by RAG Remediation Sprints 1-3
(`docs/readiness/RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md`, and
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-13/A-55/A-56/A-59/A-61/A-62/A-63/A-64) --
this document adds no new findings, it re-sequences prior evidence into a milestone-shaped view,
matching the pattern established by `GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md` and
`HAPPY_PATH_ONBOARDING_KANBAN_2026_07_25.md`.

## Scope: How "RAG Capability" Differs From "AI Capability" and "HITL Loop Completion"

**RAG Capability** (this document) tracks one specific pipeline: document goes in (Knowledge Hub
upload -> selected for indexing -> retrievable chunk), question comes in (AI Workspace query ->
retrieval -> grounded answer -> explainable confidence). It is the narrowest of the three boards.

**AI Capability** (`AI_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md`) is the superset: it tracks every
AI-touching surface of the product, including RAG as one component, plus the AI Router/model-policy
layer, the AI Review Inbox's decision-to-record pipeline, and where AI-originated work lands (CRM,
Approvals, feedback capture).

**HITL Loop Completion** (`HITL_LOOP_COMPLETION_KANBAN_2026_07_26.md`) tracks the human-in-the-loop
mechanics generically -- the 5-way review decision workflow, audit trail, review-to-work fidelity --
independent of whether the content under review came from RAG specifically.

## Milestone Definition

**"RAG Capability"** is complete when a HITL can upload a document to Knowledge Hub, select that
real document (not paste its full text) to index for governed retrieval, be confident that archived
or superseded documents no longer appear as retrievable sources, ask a question in AI Workspace, and
receive an answer that is genuinely grounded in currently-indexed real content with an honest,
explained confidence score -- and have that answer's content correctly carry into any task, approval,
or note created from it.

## Definition of Done (Milestone Exit Criteria)

- [x] Knowledge Hub document selector real, not paste-text-only (A-61, **live-confirmed 2026-07-26**)
- [x] Archived documents excluded from governed retrieval (A-62, mechanism fixed)
- [ ] Live HITL retest confirms the stale placeholder document no longer appears as a cited source (A-62)
- [x] Answer generator proven to genuinely extract/summarize real indexed content, not a stub or a
      keyword echo (A-55, code-level proof via `tenantRagWorkflow.answerGrounding.test.ts`)
- [ ] Live HITL retest confirms a real, non-"dummy data" answer against a real uploaded document (A-55)
- [x] Confidence score is explainable, not an opaque number (A-56)
- [x] "Ask AI Workspace" and "Review Approval Queue" navigation links route to the correct screens
      (A-64, A-59)
- [x] Approved answer content (question, full answer, confidence explanation) carries into created
      tasks/approvals/notes (A-63)
- [x] Knowledge Hub document uploads genuinely persist (survive refresh, appear in the Documents &
      Files selector) instead of silently failing behind a fake success message (A-66,
      **live-confirmed 2026-07-26** -- this was a newly-discovered blocker for the A-61 retest above,
      not part of the original Sprint 1-3 scope; see
      `KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`)
- [ ] A-13 ("verify RAG answer with citations," the end-to-end actionable) reconfirmed `Yes` after a
      live retest
- [ ] Real external LLM connected -- explicitly out of scope for this program; every answer today is
      a deterministic local extractive summary (`answerMode: "local_extractive_summary"`), confidence
      capped at 85% for that reason

## Current Status: 8 of 11 exit criteria code-complete and tested (2 of those 8 also live-confirmed today); 2 require a live HITL retest; 1 is a known, documented, out-of-scope capability gap

## Board

### Live-Verified (2 of 11 -- HITL-confirmed on production, not just code-tested)

| Item | Evidence | Source |
|---|---|---|
| A-61 -- Knowledge Hub document selector | `DocumentsSection.tsx` selector + `ingestTenantDocument(documentId)` reindex path; **HITL live-confirmed 2026-07-26**: real upload appeared as a selectable indexing candidate | Sprint 1 closeout (`0ed228e`) + `KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md` |
| A-66 -- Document uploads genuinely persist (newly discovered defect, same day) | New same-origin upload proxy (`src/app/api/documents/upload`), removed silent local-only fallback; **HITL live-confirmed 2026-07-26**: upload succeeded, survived refresh, appeared in selector | `KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`, commit `e4b27b7` |

### Code-Complete and Tested (6 of 11 -- verified via typecheck/lint/test/build each sprint)

| Item | Evidence | Source |
|---|---|---|
| A-62 -- Archive genuinely excludes a document from retrieval | `canRetrieveDocument()` in `governedRag.ts` now excludes `status === "archived"`, not only `"deleted"` | Sprint 1 closeout, commit `0ed228e` |
| A-55 -- Answer generator proven not a stub | `tenantRagWorkflow.answerGrounding.test.ts`, real embedding provider, real indexed content | Sprint 2 closeout, commit `d3436c0` |
| A-56 -- Confidence explainability | `src/services/rag/confidenceExplanation.ts` (new), "Why this score" line in AI Workspace, persisted in `ai_operation_reviews.metadata` | Sprint 2 closeout, commit `d3436c0` |
| A-59/A-64 -- Navigation links fixed | `useGuidedDemo.ts`/`GuidedDemoBanner.tsx` -- "Next" button now shows the destination step's own cta instead of the current step's | Sprint 2 closeout, commit `d3436c0` |
| A-63 -- Review-to-work fidelity | `ai_operation_reviews.metadata` stores question/fullAnswer/confidenceExplanation; `createApprovedAction()` carries them into every created record | Sprint 2 closeout, commit `d3436c0` |

### Code-Shipped, Pending Live HITL Retest (2)

| Card | What's shipped | What's still open | Priority |
|---|---|---|---|
| A-55 | Generator proven grounded at the code level | Whether the SPECIFIC "Tenant 0 dummy data" symptom is resolved for a real query against a real document requires a live re-query. **A-66's fix removes the last technical blocker** -- a real document can now genuinely be indexed; the re-query itself is still outstanding | High |
| A-62 | Archive-exclusion fixed | HITL must actually archive the stale document in production and confirm it stops being cited, now that a real replacement document can be indexed (A-61/A-66) | High |
| A-13 | Composite of the above -- citation/confidence/HITL-routing mechanics already confirmed real in the original 2026-07-25 walkthrough | Full re-score to `Yes` depends on the A-55/A-62 retest above | High |

### Out of Scope (documented, not attempted this program)

| Item | Why |
|---|---|
| Real external LLM integration | Every sprint prompt's explicit non-negotiable was "do not rewrite the RAG architecture." No real model provider exists anywhere in this codebase (`remotePlaceholderProvider` in `src/services/ai/providers/index.ts` is an explicit stub) -- a genuine, unaddressed gap between stated product positioning ("governance-native AI") and current mechanism, honestly labeled per `docs/UNSUPPORTED_OR_PARTIAL_CLAIMS.md` |

### Closed

None new on this specific board -- A-56/A-59/A-63/A-64 are closed on their originating actionables,
carried into this board as already-Code-Complete.

## Sequencing Recommendation

1. **HITL performs the remaining retest steps**: archive the stale "Triaxis Pitch Deck" document in
   Knowledge Hub, then re-query AI Workspace against the now-genuinely-indexable real document
   (A-55/A-62/A-13). The upload-persistence blocker that made this retest impossible (A-66) is
   resolved and live-confirmed as of 2026-07-26.
2. **Re-score A-55, A-62, A-13** in `ACTIONABLES_READINESS_MATRIX.md` based on the retest's actual
   result -- do not pre-commit to `Yes` before the retest happens. (A-61 and A-66 are already
   re-scored to `Yes` on today's direct live evidence.)
3. **Real LLM integration** is a distinct, materially larger future initiative (new provider
   integration, cost/latency/security review) -- track separately, do not fold into this milestone.

## Evidence

All findings sourced from already-published program evidence -- this document adds no new claims.
See `docs/readiness/AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md`,
`KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`, and
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` for full detail.
