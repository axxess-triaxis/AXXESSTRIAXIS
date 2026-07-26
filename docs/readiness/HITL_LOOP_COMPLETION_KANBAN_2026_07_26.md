# HITL Loop Completion -- Kanban and Milestone

Date created: 2026-07-26
Source: synthesized from already-verified evidence across this program -- the 2026-07-25 live
walkthrough (`docs/readiness/AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md`) and RAG
Remediation Sprints 1-3 -- into a milestone-shaped view over the review-to-work mechanism itself,
matching the pattern established by `GOLDEN_PATH_COMPLETION_KANBAN_2026_07_25.md` and
`HAPPY_PATH_ONBOARDING_KANBAN_2026_07_25.md`.

## Scope: How "HITL Loop Completion" Differs From "RAG Capability" and "AI Capability"

**HITL Loop Completion** (this document) tracks the review/decision mechanics themselves --
independent of which AI surface produced the content under review: can a human reviewer see a
pending AI output, understand its confidence, decide among the full set of destinations, and trust
that the resulting record is real, correctly linked, and audited.

**RAG Capability** (`RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md`) tracks whether the *content*
being reviewed (the RAG answer itself) is genuinely grounded -- a prerequisite for this board, not a
duplicate of it.

**AI Capability** (`AI_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md`) is the superset covering every AI
surface, including this loop as one component.

## Milestone Definition

**"HITL Loop Completion"** is complete when a human reviewer, working the AI Review Inbox, can see a
pending AI-generated output with an explainable confidence score, decide among the full set of
destination types (Task, Meeting, Approval Request, Stakeholder Note, Project Update), have that
decision reliably create a real, correctly-linked record with the original question, full answer, and
confidence explanation preserved, see that record surface immediately in its owning workspace, and
trust the whole chain is captured in an audit trail -- with an unauthorized user correctly blocked
from making the decision in the first place.

## Definition of Done (Milestone Exit Criteria)

- [x] Reviewer sees a pending AI output with an explainable, non-black-box confidence score (A-56)
- [x] A decision carries the original question, full answer, and confidence explanation into the
      created record, not just a 1-sentence excerpt (A-63)
- [x] Task destination confirmed real and live, with a real audit trail in the Review-to-work
      timeline (confirmed directly by the HITL, 2026-07-25 walkthrough, pre-existing capability)
- [x] Stakeholder Note destination: data path confirmed real (pre-existing); the CRM display-side
      visibility gap that made it look broken is closed (A-57)
- [x] Approval Request destination: live queue and real export built where none existed (A-60)
- [x] An unauthorized user cannot create a review-originated record at all -- reconfirmed via the
      existing `POST /api/ai/reviews` 403 gate, which runs before any decision type, including
      `stakeholder_note` (Sprint 3 audit; no new test needed, gate already covered it)
- [ ] Meeting and Project Update destinations HITL-confirmed live -- only Task, Stakeholder Note, and
      Approval Request have been directly confirmed live so far
- [ ] A full end-to-end live retest of the loop, after all three sprints' fixes together, has not yet
      been performed by the HITL
- [ ] A-13 (the actionable tracking "verify RAG answer with citations" end to end through this loop)
      reconfirmed `Yes` after that retest

## Current Status: 6 of 9 exit criteria verified or code-complete and tested; 3 require a live HITL retest

## Board

### Verified or Code-Complete and Tested (6 of 9)

| Item | Evidence | Source |
|---|---|---|
| Confidence explainability at review time | `confidenceExplanation.ts`, "Why this score" line, persisted in `ai_operation_reviews.metadata` | Sprint 2 closeout, commit `d3436c0` |
| Question/full-answer/confidence carried into every created record | `createApprovedAction()` in `liveTenantWorkflow.ts`; tested end-to-end in `liveTenantWorkflow.test.ts` | Sprint 2 closeout, commit `d3436c0` |
| Task destination real and live | HITL directly confirmed: "Create Task" + "Approve and Create" produced a real task in Tasks & Workflow with a real audit trail | 2026-07-25 walkthrough, `AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md` |
| Stakeholder Note destination visibility | Data path was already real and correctly linked (Sprint 2); display gap closed with `GET /api/stakeholders/notes` + live UI section | Sprint 3 closeout, commit `c85165a` |
| Approval Request destination, live and exportable | `GET /api/approvals` (real queue, previously absent) + real export + `POST /api/approvals/export` audit event | Sprint 3 closeout, commit `c85165a` |
| Unauthorized-decision gate | Existing `POST /api/ai/reviews` 403 test covers every decision type including `stakeholder_note`; re-confirmed, no regression | Sprint 3 audit, `RAG_REMEDIATION_SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26.md` |

### Code-Shipped, Pending Live HITL Confirmation (2)

| Card | What's shipped | What's still open | Priority |
|---|---|---|---|
| Meeting / Project Update destinations | Same `createApprovedAction()` mechanism as Task/Approval Request/Stakeholder Note -- carries the enriched description (Task/Meeting have no metadata column, so they get the enriched description only, not structured metadata) | Never directly exercised live by the HITL in any walkthrough to date | Medium |
| Full end-to-end loop retest | All three sprints' fixes are individually tested in isolation | No single live pass has exercised the loop start-to-finish (document -> index -> query -> review -> decide -> record -> audit) since all fixes landed together | High |

### Blocked

A-13's final re-score depends on the full end-to-end retest above -- it cannot move to `Yes` from
code evidence alone, consistent with `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`'s own
`Yes`/`Blocked`/`No` discipline (live-or-code-plus-test evidence required, not code existing in
principle).

### Closed

None new on this specific board -- the confidence-explainability, review-to-work fidelity, and
403-gate items are closed on their originating actionables, carried into this board as already
Verified/Code-Complete.

## Sequencing Recommendation

1. **HITL performs the 8-step ordered validation script** in
   `RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md` -- it already sequences document upload,
   indexing, query, review, and all five decision types in one pass, which directly satisfies both
   open items on this board (Meeting/Project Update confirmation and the full end-to-end retest).
2. **Re-score A-13** in `ACTIONABLES_READINESS_MATRIX.md` based on that retest's actual result.
3. No further Claude-Code-side work is identified for this board -- everything remaining here is a
   live HITL action, not a code change.

## Evidence

All findings sourced from already-published program evidence -- this document adds no new claims. See
`docs/readiness/AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26.md`,
`RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md`, and
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` for full detail.
