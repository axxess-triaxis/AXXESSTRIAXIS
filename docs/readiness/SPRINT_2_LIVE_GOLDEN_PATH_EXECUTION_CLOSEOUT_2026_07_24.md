# Sprint 2 Closeout: Live Golden Path Execution

Date: 2026-07-24
Program: Five-Sprint QA3 Readiness Execution Program
Executor: Claude Code
Product manager / prompt designer: Codex
HITL authority: Sudipta Koushik Sarmah, Founder and Managing Director, Triaxis Ventures Private Limited

## Sprint Objective

Prove one complete institutional workflow: document upload -> tenant-scoped indexing -> ask AXXESS -> receive a cited answer -> review -> approve -> create real work -> see dashboard, audit log, and timeline update.

## Result Summary

**The engineering side of the golden path is now genuinely complete and unit-tested. Sprint 2 is not fully closed**, for the same reason Sprint 1 wasn't: proving it end to end requires a real, authenticated session asking a real question and approving a real answer -- credentialed actions Claude Code cannot perform. Unlike a routine "waiting on a test," this sprint's research uncovered and fixed a real, previously-undiscovered architectural gap that would have made the golden path impossible to complete no matter who tried it.

## The Core Finding: Two Disconnected AI-Review Pipelines

A thorough audit (before any code change) found that AXXESS had **two independently complete "generate an AI answer -> review it -> create work" pipelines that had never been connected**:

- **Pipeline A**, wired to the AI Workspace's own chat box: `POST /api/rag/query` -> `answerTenantQuestion()` -> writes `ai_output_audit` -> AI Workspace's own "Approve action" button -> `POST /api/rag/review` -> creates one task inline.
- **Pipeline B**, wired to the dedicated AI Review Inbox page (`/ai-workspace/review-inbox`): reads from table `ai_operation_reviews` via `GET /api/ai/reviews`, and its approve action calls a rich, already-fully-built dispatcher (`createWorkflowActionFromAiReview`) supporting task/approval/stakeholder-note/project-update/meeting-follow-up creation, with full source-citation and review-decision linkage, notifications, and three timeline events.

**Nothing in the codebase ever inserted a row into `ai_operation_reviews`.** Pipeline A wrote to a different table (`ai_output_audit`) that Pipeline B never reads. This is why the HITL's walkthrough found the Review Inbox permanently empty no matter how many questions were asked in the AI Workspace -- it was never a bug in either pipeline individually, both worked correctly in isolation; the bridge between them simply didn't exist.

**The fix** (`src/services/rag/tenantRagWorkflow.ts`, inside `answerTenantQuestion()`): after writing the `ai_output_audit` row, also insert a matching `ai_operation_reviews` row (mapping the answer's confidence, human-review flag, excerpt, and citations directly across, since both use compatible shapes). This single, minimal insert makes every generated answer appear in the Review Inbox, where the already-complete approve/reject/create-work UI and backend take over unmodified. No architecture was rewritten; the fix uses exactly the tables, functions, and patterns that already existed.

## Files Changed

- `src/services/rag/tenantRagWorkflow.ts` -- the `ai_operation_reviews` bridge insert (the core fix); added the missing `ai_answer_generated` timeline event (the event type and resource type already existed in the schema, `workflowEvidence.ts`, but nothing had ever written one -- the timeline previously jumped from "document indexed" straight to "human decision" with the answer-generation step invisible).
- `src/features/documents/DocumentsSection.tsx` -- added upfront client-side validation for the "Index document" form (empty title/text now shows a specific inline message instead of letting a doomed request round-trip to the server's generic error).
- `docs/DOCUMENTS.md` -- new section documenting the real functional difference between Knowledge Hub (file storage + metadata only, its "Indexed/Ready" badge is cosmetic and not backed by any real chunk check) and Documents & Files (the only path that actually chunks, embeds, and writes to `rag_document_chunks` -- i.e., the only path that makes a document truly answerable by RAG). Also documents ZIP upload as deferred, non-trivial bulk-ingestion work.
- `src/features/meetings/MeetingsSection.tsx` -- root-caused and fixed the "Meeting could not be saved" bug: the "Participants" field is free text, but the database's `attendee_ids` column is a genuine `uuid[]` (`supabase/migrations/20260703083915_sprint7_crud_workflows.sql`). The HITL's walkthrough typed prose ("Tenant 0 dummy data") into it, which fails at the database with a type-cast error, surfaced only as a generic message. Now validated upfront with specific, actionable copy naming exactly which entries need to be removed.
- `src/services/rag/tenantRagWorkflow.reviewInboxBridge.test.ts` (new) -- verifies the bridge insert happens with the correct fields and links back to the same `ai_output_audit` row.
- `src/features/meetings/MeetingsSection.test.ts` (new) -- verifies the UUID validation.

No architecture was rewritten, no UI was redesigned, and no unrelated modules were built. The fix is a single, minimal insert plus three small, well-scoped validation/documentation improvements.

## Sprint 1 Carryover Gate -- Verified Before Starting

Per this sprint's own prompt, the Sprint 1 correction fixes were re-verified live before any Sprint 2 work began:

1. **Investor Preview route** -- live-verified working via browser: clicking "Open investor preview" now lands cleanly in the real North East Health Mission dashboard instead of the dead "Continue to workspace" page.
2. **`Continue to workspace`** -- confirmed working as part of the same browser check above.
3. **Stale `Ananya Rao` state** -- not observed as a dead end in this re-test; the investor-preview session now resolves to a real, working dashboard rather than stalling.
4. **`Create account` visible success state** -- code-deployed (Sprint 1 correction); not independently re-tested this sprint since it requires a real signup.
5. **`Provision tenant` raw `unauthorized`** -- code-deployed (Sprint 1 correction, session-expiry-specific messaging); live-curl-confirmed the edge protection itself remains intact (`/onboarding` still redirects unauthenticated visitors).
6. **Feedback beta version `0.7`** -- confirmed fixed in `src/services/analytics/config.ts` (Sprint 1 correction).

All six carryover items were either already fixed and deployed, or directly re-confirmed live this sprint. None blocked Sprint 2 work.

## Actionables

**Targeted:** A-12, A-13, A-15, A-16, A-17, A-18, A-19.
**Carryover re-reviewed:** A-01, A-02, A-03, A-04, A-06 (all already `Yes`/`Closed` from Sprint 1; unchanged, no new evidence needed this sprint).

**Closed (`Yes`):** A-12 -- already closed in the Sprint 1 continuation (7 files uploaded via Knowledge Hub, ahead of schedule); unchanged this sprint.

**Blocked:** A-13, A-15, A-16, A-17, A-18, A-19 -- every one of these is now backed by code that is written, unit-tested, and deployed, but **none has been exercised against a real, authenticated session** by anyone. This is not six separate gaps; it is one gap (no live walkthrough performed) expressed across six actionables that all depend on the same sequence of steps. Per this sprint's own non-negotiable ("Do not claim RAG is live unless cited answer retrieval works"), none of these is marked `Yes` on code evidence alone.

**Still `No`:** none of the 7 targeted actionables.

## Confidence Score Per Actionable

| Actionable | Status | Confidence | Basis |
|---|---|---:|---|
| A-12 Document upload/import | Yes | 90% | Live-confirmed in the Sprint 1 continuation walkthrough (unchanged) |
| A-13 RAG answer with citations | Blocked | 75% (code) | `answerTenantQuestion()` traced end to end: real tenant-scoped retrieval, real citations/confidence/human-review flag, real audit + timeline writes. Never exercised live. |
| A-15 AI Review Inbox approval | Blocked | 75% (code) | The bridge fix is unit-tested (new `reviewInboxBridge.test.ts`); the Review Inbox UI and its approve/reject backend were already fully built and untouched. Never exercised live. |
| A-16 Approved output creates real work | Blocked | 80% (code) | `createWorkflowActionFromAiReview()` was already complete and reachable through the Review Inbox before this sprint; the bridge just gives it a real input. Never exercised live. |
| A-17 Dashboard updates after workflow | Blocked | 65% (code) | `useLiveWorkspaceMetrics`'s `openTasks`/`ragReadyDocuments` counts are computed live from real repository reads, so a new task/document would move them -- not specifically re-observed this sprint. |
| A-18 Audit log updates after workflow | Blocked | 85% (code) | Multiple confirmed write points across the whole path (`rag.answer.generated`, `rag.answer.approved/rejected`, `ai.review.*`, `task.created`). Never exercised live. |
| A-19 Timeline evidence updates | Blocked | 80% (code) | `document_indexed`, `ai_answer_generated` (newly added this sprint), `human_decision`, `workflow_action_created`, `audit_recorded` all confirmed as real write points into `workflow_timeline_events`. Never exercised live. |

No actionable was marked `Yes` on code confidence alone, consistent with this program's evidentiary discipline and this sprint's own explicit non-negotiable about RAG claims.

## Tests Run And Results

```
pnpm run typecheck          -> clean
pnpm run lint                -> clean, zero warnings
pnpm run test                -> 122 files / 399 tests passing (up from 120/393)
pnpm --dir apps/mobile run typecheck -> clean
pnpm run build                -> succeeded
pnpm run supabase:verify      -> passed (27 migrations, 100 RLS-protected tables, no schema change)
```

New tests: `tenantRagWorkflow.reviewInboxBridge.test.ts` (2 tests, isolated into its own file so its `isSupabaseAdminConfigured() -> true` mock doesn't disturb the existing suite's deliberate local-fallback-path coverage), `MeetingsSection.test.ts` (4 tests, pure-function coverage of the new UUID validation).

## Live / Manual Verification Notes

**Performed:** the Sprint 1 carryover gate re-check (Investor Preview end-to-end, via browser -- see above). This is real, live, non-credentialed-beyond-the-built-in-demo-button evidence.

**Not performed, and cannot be performed by Claude Code:** uploading a document as an authenticated Tenant 0 user, asking AXXESS a real question, approving the answer in the Review Inbox, confirming the resulting task, and observing the dashboard/audit/timeline update. All of these require a real Supabase session established by entering real credentials -- prohibited to Claude Code without exception. Investor Preview's demo session was considered as an alternative test path and ruled out: it is a client-side-only mock session with no real Supabase access token, so `getServerAuthSession()` (which every RAG/review route requires) would reject it with a 401 regardless of the edge-proxy fix from Sprint 1 -- it cannot exercise this pipeline.

## Evidence Summary

| Claim | Evidence type | Confidence |
|---|---|---|
| The Review Inbox / task-creation gap is real and precisely diagnosed | Direct code trace across 7 files, cross-referenced against the live schema migration | Measured (code-confirmed) |
| The bridge fix correctly connects the two pipelines | Unit test asserting the exact insert call and field mapping | Measured (test-confirmed) |
| A real question against a real document produces a cited answer | Code trace of `answerTenantQuestion()`; pre-existing unit tests in `tenantRagWorkflow.test.ts` | Code-confirmed, not yet live-observed |
| Approving in the Review Inbox creates a real task | Code trace of `createWorkflowActionFromAiReview()`, pre-existing and unmodified | Code-confirmed, not yet live-observed |
| Meeting-save bug root cause | Direct migration read confirming `attendee_ids uuid[]`, matched against the exact free-text field that produced the reported error | Measured (schema-confirmed) |
| Investor Preview fix still holds | Live browser session, this sprint | Measured |

## Remaining Risks

- **The golden path has never been walked end to end by anyone**, live. Every individual step is now code-complete and unit-tested, but a real walkthrough could still surface an integration issue no unit test catches (e.g., a field-name mismatch only visible against real Supabase data, or an RLS policy gap on `ai_operation_reviews` inserts specifically from this new code path).
- Knowledge Hub's "Indexed/Ready" badge remains cosmetic (documented, not fixed) -- a real risk if a future pilot user trusts that badge and assumes their Knowledge-Hub-only upload is RAG-searchable when it is not.
- Dashboard metrics (`ragReadyDocuments`) count all `documents` rows, not genuinely-chunked ones -- a real tenant could see a dashboard number that overstates actual RAG readiness. Not fixed this sprint (out of the smallest-blocker scope).
- A-17 (dashboard update) has the lowest confidence of the six blocked items, since it was the least directly traced this sprint -- worth first-priority attention in the HITL's next walkthrough.

## Recommended Sprint 3 Readiness

**Do not begin Sprint 3 yet.** Sprint 3 (Two-Tenant Isolation and Permission Proof) depends on a golden path that has been proven to actually work for one tenant first -- exactly what this sprint's blocked actionables are waiting on. The highest-leverage next action is unchanged in kind from Sprint 1: one HITL walkthrough, this time of the golden path itself (upload a document via Documents & Files "Index document" -> ask a real question in AI Workspace -> confirm it appears in the Review Inbox -> approve and create a task -> confirm the task appears in Tasks & Workflow -> check the dashboard, audit log, and timeline for the new evidence).

## HITL Decision Required

**One walkthrough closes this sprint**, the same pattern as Sprint 1: upload a real document's text via Documents & Files (not just Knowledge Hub, since Knowledge Hub uploads are not RAG-indexed -- see `docs/DOCUMENTS.md`), ask AXXESS a question that should match it, confirm the answer's citations point at it, open the AI Review Inbox and confirm the answer appears there, approve it with "Approve and create" (task), confirm the task appears in Tasks & Workflow, and check that the dashboard, audit log, and workflow timeline all show the new activity. That single session would very likely move A-13, A-15, A-16, A-17, A-18, and A-19 from `Blocked` to `Yes` in one pass.

No other founder decision is required to close Sprint 2 -- there is no ambiguous product, business, legal, security, or external-account choice pending.
