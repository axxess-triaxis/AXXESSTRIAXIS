# RAG Remediation Final Evidence Package (Sprints 1-3)

Date: 2026-07-26
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline (External signal -> product decision -> shipped artifact -> verification -> current status)

## Purpose

This is the pilot-readiness consolidation of the three-sprint RAG Remediation program, triggered by the 2026-07-25 HITL live walkthrough of AI Workspace, AI Review Inbox, Knowledge Hub, Documents & Files, Stakeholders & CRM, Approvals & Governance, and feedback capture on production (`docs/readiness/AI_WORKSPACE_RAG_PIPELINE_GAP_ANALYSIS_2026_07_26.md`). It answers, plainly: what did each sprint actually change, what is genuinely proven, what is still open, and what exactly the HITL needs to do to close the loop.

## Program Summary

| Sprint | Scope | Status |
|---|---|---|
| RAG Remediation Sprint 1 -- Source Integrity and Knowledge Hub-to-Index Path | Locate and neutralize the stale placeholder indexed document; let a HITL select an already-uploaded Knowledge Hub document for governed indexing instead of only pasting text | Closed. `docs/readiness/RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md` |
| RAG Remediation Sprint 2 -- Answer Quality, Confidence Explainability, Review-to-Work Fidelity | Prove answer generation is genuinely grounded (not a stub); make confidence explainable; carry question/answer/confidence into downstream work records; fix two navigation defects | Closed. `docs/readiness/RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md` |
| RAG Remediation Sprint 3 -- Workflow Polish, Feedback Routing and Pilot-Ready RAG Evidence | Close the AI Review Inbox-to-CRM visibility gap; stop fabricating CRM relationship intelligence; make Approvals Export Report real; route feedback toward `triaxisgrp@gmail.com`; package this evidence | Closed. `docs/readiness/RAG_REMEDIATION_SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26.md` |

**What this program did not do:** integrate a real external language model (out of every sprint's "do not rewrite the RAG architecture" scope); perform any live production verification (this environment has no Supabase credentials, no production browser session, and no visibility into whether `RESEND_API_KEY` is configured in production).

## A-55 Through A-65 Status Table

| ID | Finding | Status | Evidence Chain |
|---|---|---|---|
| A-55 | RAG query answers return templated/dummy-pattern text | `Blocked` (code-level evidence supports "citing a stale source," not "fake generator"; live-unconfirmed) | External signal: HITL query returned "Tenant 0 dummy data" + echoed keywords (2026-07-25 walkthrough) -> Product decision: distinguish stub-generator vs. stale-source hypotheses -> Changed artifact: `tenantRagWorkflow.answerGrounding.test.ts` (real embeddings, real content), keyword-echo clause removed -> Verification: 5 new tests pass, using genuine token-overlap scoring -> Status: code proves the generator is not a stub; whether the SPECIFIC symptom is resolved requires a live re-query after the Sprint 1 retest, not yet performed |
| A-56 | Confidence score is an opaque "black box" | `Yes` (code-complete and tested; live UI unconfirmed) | Signal: "that '72% confidence' logic should not be 'black box'" -> Decision: build and surface a structured explanation -> Artifact: `src/services/rag/confidenceExplanation.ts` (new), AI Workspace "Why this score" line -> Verification: 6 unit tests -> Status: mechanism complete, not HITL-viewed live |
| A-57 | AI Review Inbox CRM escalation produced no visible record | `Yes` (code-complete and tested; live UI unconfirmed) | Signal: escalated review with "Create Stakeholder Note" found no corresponding CRM record -> Decision: trace the handoff, fix whichever side (data or display) was broken -> Artifact: found the DATA was already correct (Sprint 2); built `GET /api/stakeholders/notes` + live "AI-escalated notes" section -> Verification: 2 route tests + 2 component tests -> Status: mechanism complete, not HITL-viewed live |
| A-58 | CRM "Create Contact" fabricates Influence (50)/Engagement (medium) | `Yes` (code-complete and tested; live UI unconfirmed) | Signal: "This influence score (50) and Engagement (Medium) should not be placeholder and should not autopopulate" -> Decision: honest default + real optional inputs -> Artifact: `stakeholderMutation()` defaults changed to `0`/`"unrated"`; form gained Influence/Engagement fields -> Verification: 3 new component tests -> Status: mechanism complete, not HITL-viewed live |
| A-59 | "Review Approval Queue" routes to Analytics & Dashboard | `Yes` (code-complete and tested; live UI unconfirmed) | Signal: clicking the link landed on the wrong screen -> Decision: root-cause the guided-demo Next-button mismatch -> Artifact: `useGuidedDemo.ts`/`GuidedDemoBanner.tsx` fix (same root cause as A-64) -> Verification: 1 regression test tracing the exact case -> Status: fixed, not HITL-viewed live |
| A-60 | "Export Report" (Approvals & Governance) is a dead/absent button | `Yes` (code-complete and tested; live UI and delivery unconfirmed) | Signal: button clickable but does nothing -> Decision: build a minimal real export -> Artifact: code search found no such button existed at all; built `GET /api/approvals` (real live queue) + real JSON export + `POST /api/approvals/export` audit event -> Verification: 3 route/component tests -> Status: mechanism complete, not HITL-viewed live |
| A-61 | No way to select a Knowledge Hub document for indexing | `Yes` (**live-confirmed 2026-07-26** -- see Addendum below) | Signal: "Paste governable text... is highly inconvenient" -> Decision: add a document selector -> Artifact: `DocumentsSection.tsx` selector + `ingestTenantDocument(documentId)` reindex path -> Verification: Sprint 1 test suite, then a separate same-day incident (A-66) blocking the retest, fixed and HITL-confirmed -> Status: live-exercised, confirmed working |
| A-62 | Stale placeholder document remains retrievable | `No` (mechanism fixed 2026-07-26, pending HITL action + confirmation) | Signal: "This governed RAG doc is redundant, supposed to go" -> Decision: make Archive genuinely exclude a document from retrieval -> Artifact: `canRetrieveDocument()` in `governedRag.ts` now excludes archived, not only deleted, documents -> Verification: dedicated test -> Status: the HITL still needs to actually archive the document in production |
| A-63 | Unclear whether approved AI answers carry content into created work | `Yes` (code-complete and tested; live-unconfirmed) | Signal: "Does answer from RAG feed into these options automatically is to be ascertained" -> Decision: audit and fix -> Artifact: `ai_operation_reviews.metadata` now stores question/fullAnswer/confidenceExplanation, carried into every created record -> Verification: `liveTenantWorkflow.test.ts` end-to-end tests -> Status: mechanism complete, not HITL-viewed live |
| A-64 | "Ask AI Workspace" routes to Tasks & Workflow | `Yes` (code-complete and tested; live UI unconfirmed) | Same root cause and fix as A-59 -- see above |
| A-65 | Feedback should notify `triaxisgrp@gmail.com` | `Blocked` (code shipped, delivery **confirmed absent**, not merely unverified) | Signal: "'Send Feedback' anywhere should lead to a form, the responses of which flow to triaxisgrp@gmail.com" -> Decision: add a real send attempt on the existing, already-reliable feedback pipeline -> Artifact: `feedbackEmail.ts` (new), wired into `POST /api/beta-feedback` -> Verification: 7 unit/route tests, honest not-configured/sent/failed states -> Status: **confirmed 2026-07-26** via `vercel env ls production` against `triaxis-www-frontend-import` -- `RESEND_API_KEY` is not present in production at all. Requires founder action (Vercel Dashboard); identical open question to A-08 on the same provider |

## What Is Verified Working (Code-Level, Tested)

- Full RAG answer pipeline: tenant/permission-scoped retrieval, real content grounding (proven with real embeddings), honest no-match state, confidence with explanation, capped at 85% for local-synthesis honesty.
- AI Review Inbox 5-way decision workflow, already confirmed real in the original walkthrough, now also carries question/full-answer/confidence into every one of the 5 destination types.
- Stakeholder note visibility, CRM contact honesty, Approvals live queue and export, feedback email send attempt -- all new, all unit/integration tested.
- Tenant isolation and role-based restriction: explicitly tested at the RAG chunk level (cross-tenant and role-restricted content never appears in an answer) and at the review-decision level (403 for an unassigned, non-admin caller, pre-existing and re-confirmed).

## What Remains Blocked

- **A-55/A-13**: real document-grounded answer quality, live-confirmed. Requires the HITL retest (archive stale doc, index real doc via the new selector, re-query, compare).
- **A-61/A-62**: same retest, since they're the precondition for A-55's confirmation.
- **A-65**: email delivery to `triaxisgrp@gmail.com` in production. Requires `RESEND_API_KEY` confirmation and one real test submission.
- **No real external LLM exists in this codebase.** Every "AI answer" is a deterministic local extractive summary. This is now honestly labeled, not hidden -- but the underlying capability gap is real and unaddressed by this program (explicitly out of scope per every sprint's "do not rewrite the RAG architecture" non-negotiable).

## What Needs HITL Manual Validation

Screens/workflows to test manually on production, in order:

1. **Knowledge Hub**: archive the stale "Pitch deck" document (content: "Tenant 0 dummy data").
2. **Documents & Files**: open "Index an uploaded document," select a real Knowledge Hub document (e.g. the 30-page pitch deck), paste its text, index it. Confirm the success message names the real document.
3. **AI Workspace**: ask a question the real document should answer. Confirm the answer references real content, not "Tenant 0 dummy data." Confirm a "Why this score" line appears next to the confidence badge.
4. **AI Review Inbox**: approve a pending review with "Create Stakeholder Note." Open **Stakeholders & CRM** and confirm the note appears under "AI-escalated notes," with the original question visible in its body.
5. **Stakeholders & CRM**: click "Add Contact," leave Influence/Engagement blank, save. Confirm the new contact shows "Unrated," not a specific score.
6. **Approvals & Governance**: confirm the real approval-request queue (created via AI Review Inbox "Create approval request") is visible; click "Export Report"; confirm a JSON file downloads and an audit event is recorded (checkable via Audit Logs).
7. **Any feedback entry point**: submit real feedback; confirm the success toast; separately confirm (via the Vercel/Resend dashboard, HITL-only access) whether `RESEND_API_KEY` is configured and whether the notification actually reached `triaxisgrp@gmail.com`.
8. **Guided demo tour**: from the Executive Dashboard, start "Start guided setup," advance to "Ask governed AI," confirm the Next button reads "Create follow-up task" and lands on Tasks & Workflow; advance to "Human-in-the-loop governance," confirm it correctly lands on Analytics & Reports.

## Risk Rating After Remediation

**Medium, down from High.** The governance mechanics (citations, confidence, human-review gating, the 5-way decision workflow, audit trail, and now review-to-work content fidelity, CRM visibility, and export/feedback plumbing) are code-complete and unit/integration tested across all three sprints -- a materially stronger, more honestly-labeled foundation than before this program started. The residual risk is concentrated in exactly two places: (1) answer-quality confirmation requires a live retest this environment cannot perform, and (2) the product's core positioning implies AI-generated synthesis, while the actual mechanism is deterministic local extraction -- now honestly labeled, but still a real gap between positioning and current capability that no amount of testing in this environment can close. Neither risk is new; both are now precisely scoped and documented rather than ambiguous.

## Can A-13 Move From `Blocked` to `Yes`?

**Not yet, and this document does not claim it can.** A-13 ("Verify RAG answer with citations") requires a live-confirmed, real-document-grounded, cited answer. This program has:

- Fixed the two most plausible root causes of the founder's "dummy data" observation (A-61: no selector; A-62: stale document still retrievable).
- Proven at the code level, with real embeddings against real content, that the answer generator does not fabricate or ignore indexed content.
- Made the confidence number explainable and honestly capped.
- Made the full review-to-work chain (question, answer, citations, confidence) traceable end to end.

What it has not done, and cannot do from this environment, is the one thing A-13's own acceptance criteria requires: a real HITL asking a real question on production and receiving a cited answer they can verify against a document they actually uploaded. Per this program's own non-negotiable ("Do not claim RAG is fully production-grade unless the evidence supports that claim"), A-13 stays `Blocked` until that retest happens. The retest steps above are exactly what would need to pass for it to move.

## Addendum (2026-07-26, Later Same Day): A-61 Retest Attempted, Hit a New Defect, Fixed, Re-Confirmed

The HITL began exactly the retest this document called for in step 2 above, and it did not initially
pass -- which is exactly what this evidence-discipline process is for. Full detail:
`KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`.

**What happened, in order:**

1. **Prerequisite discovered first:** production had not been redeployed since 2026-07-25 16:16 IST
   -- none of Executive Dashboard ED-1/2/3 or RAG Remediation Sprints 1-3 had ever reached
   `triaxis-www-frontend-import`/`triaxis-product-investor-demo` in production, despite being
   code-complete and tested in this repository. Fixed by redeploying both projects (full
   verification suite re-run clean beforehand).
2. **A-61 retest began, hit a new defect (A-66):** the HITL uploaded a real document to Knowledge
   Hub; it showed "Document uploaded" but never appeared in the Documents & Files selector and did
   not survive a session refresh. Root cause: a silent local-only fallback in
   `KnowledgeHubSection.tsx` masking a genuine failure in the browser's direct upload to Supabase
   Storage (confirmed via DevTools: a `404` on the upload's CORS preflight). This is a **different**
   defect from anything A-61/A-62 originally described -- discovered only because the retest this
   document called for was actually attempted.
3. **Fixed same day:** uploads now proxy through a new same-origin route
   (`src/app/api/documents/upload`) instead of a direct browser-to-Supabase-Storage PUT. 6 new
   tests; full suite 148/148 files, 585/585 tests; typecheck/lint/build clean. Deployed to production
   (commit `e4b27b7`, deployment `dpl_2gMEom4p5uGkjwjUqpC9vnLUwUbH`).
4. **A-61 retest re-attempted and passed:** HITL confirmed the upload succeeded for real, appeared in
   the Documents & Files selector, and survived a session refresh. A-61 moves to `Yes` in
   `ACTIONABLES_READINESS_MATRIX.md` on this direct live evidence.
5. **A-55/A-62/A-13's own retest (archive the stale document, re-query, compare) is still
   outstanding** -- A-66 removed the technical blocker that made it impossible, but the retest itself
   has not yet been performed as of this addendum.
6. **One incidental, unrelated finding surfaced during diagnosis:** `SUPABASE_SERVICE_ROLE_KEY` in
   `triaxis-www-frontend-import` production is not a valid token (rejected as `Invalid Compact JWS`
   by a direct, disposable diagnostic call). Tracked as A-67. Nothing in this program's tested paths
   depends on this key, so it caused no confirmed defect -- but it is real, unresolved, and requires
   founder action to rotate.
7. **A-65/A-08 confirmed, not just suspected, blocked:** `RESEND_API_KEY` is verified absent from
   `triaxis-www-frontend-import` production entirely (`vercel env ls production`, 16 vars present,
   none named `RESEND_API_KEY`).
