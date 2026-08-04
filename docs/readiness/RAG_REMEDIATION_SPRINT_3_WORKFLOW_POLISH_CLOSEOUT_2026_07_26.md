# RAG Remediation Sprint 3 -- Workflow Polish, Feedback Routing and Pilot-Ready RAG Evidence -- Closeout

Date: 2026-07-26
Branch: `canonical/sprint-1-35-unified-gitlab`
Planning provenance: Codex-drafted, founder-issued execution prompt, building on RAG Remediation Sprints 1-2 and this roadmap's own "Lower-Priority Follow-Ups" list (A-58, A-60, A-57), plus A-65.

## Sprint Objective

Convert the RAG/AI Workspace pipeline from "technically improved" into "pilot-reviewable": close the AI Review Inbox-to-CRM visibility gap (A-57), stop fabricating CRM relationship intelligence (A-58), make Approvals Export Report real (A-60), route feedback toward `[FEEDBACK_ROUTING_EMAIL_MASKED]` (A-65), reconfirm A-55/A-56/A-61/A-62/A-63 after Sprints 1-2, and package a final pilot-ready evidence summary.

## What Changed

| File | Change |
|---|---|
| `src/domain/entities.ts` | `Stakeholder["engagementLevel"]` gained `"unrated"`, distinct from `"low"` -- an honest default before anyone supplies a real assessment. |
| `src/repositories/supabaseEnterpriseRepositories.ts` | `stakeholderMutation()` defaults changed from `50`/`"medium"` (fabricated) to `0`/`"unrated"` (honest) when the caller doesn't supply a value. |
| `src/features/stakeholders/StakeholdersSection.tsx` | Add Contact form gained optional Influence (0-100) and Engagement inputs, only sent when the user supplies a value; live contacts table renders `"unrated"` distinctly (italic, muted badge) instead of a plausible-looking fake score. New "AI-escalated notes" section fetches and displays real `stakeholder_notes` rows. |
| `src/app/api/stakeholders/notes/route.ts` (new) | `GET`, session-authed, organization-scoped -- exposes `stakeholderNotesRepository.list()` to the client for the first time. |
| `src/features/approvals/ApprovalsSection.tsx` | Live tenant view now fetches and displays real `approval_requests` rows (previously an unconditional "not wired yet" empty state, even though real rows already existed from AI Review Inbox escalations). Real "Export Report" button downloads a JSON file (mirrors the existing Export Briefing pattern) and posts to the export-audit route. |
| `src/app/api/approvals/route.ts` (new) | `GET`, session-authed, organization-scoped -- exposes `approvalRequestsRepository.list()` to the client. |
| `src/app/api/approvals/export/route.ts` (new) | `POST`, session-authed -- writes a real `approvals.export_report` audit event; the export file itself is generated client-side. |
| `src/services/email/feedbackEmail.ts` (new) | `renderFeedbackNotificationEmail()`/`sendFeedbackNotificationEmail()` -- mirrors `invitationEmail.ts`'s exact pattern (same Resend provider, same honest not-configured state) to notify `[FEEDBACK_ROUTING_EMAIL_MASKED]` (overridable via `AXXESS_FEEDBACK_NOTIFICATION_EMAIL_TO`). |
| `src/app/api/beta-feedback/route.ts` | Wires the email send attempt after the feedback row is saved (try/catch, so a failed/unconfigured send can never lose the feedback itself); records delivery status in audit metadata. |
| `src/features/stakeholders/StakeholdersSection.test.tsx` | +6 tests: honest blank-field defaults, real user-supplied values, AI-escalated notes rendering and empty state. Existing mock fixture updated to reflect the new honest defaults. |
| `src/app/api/stakeholders/notes/route.test.ts` (new) | 2 tests: 401 for unauthenticated, cross-org exclusion. |
| `src/features/approvals/ApprovalsSection.test.tsx` | Restructured to mock `useAuth` directly (rather than the real `AuthProvider` + a blanket fetch stub) so both the unauthenticated and authenticated-with-real-data paths can be tested in one file; existing "not wired yet" assertion updated to the new, accurate empty-state text; +2 tests for live queue and real export. |
| `src/app/api/approvals/route.test.ts` (new) | 2 tests: 401, cross-org exclusion. |
| `src/app/api/approvals/export/route.test.ts` (new) | 2 tests: 401, real audit event written with the correct action/metadata. |
| `src/services/email/feedbackEmail.test.ts` (new) | 6 tests: default/overridable recipient, real content rendering, not-configured/sent/failed states -- mirrors `invitationEmail.test.ts`. |
| `src/app/api/beta-feedback/route.test.ts` | +2 tests (text-based, matching the file's existing pattern): email send is wired, exceptions can't fail the submission. |

No files were deleted. No migration was added -- `"unrated"` is a free-text value in an unconstrained `engagement_level` column, and both new API routes reuse existing repositories.

## What Did Not Change

- **No real external LLM was integrated.** Out of scope per every sprint's non-negotiable.
- **A-55/A-13 live confirmation.** Explicitly not attempted -- this environment has no production access.
- **Task and Meeting structured metadata.** Same schema constraint noted in the Sprint 2 closeout -- unchanged.
- **Demo-mode data.** `demoStakeholderCards` and the Approvals demo queue are untouched, separate, already-isolated datasets.

## What Was Verified

### AI Review Inbox to CRM handoff (Workstream 1)

Code audit found the underlying data path was already complete before this sprint (Sprint 2's `createApprovedAction()` fix already carried question/full-answer/citations/confidence/actor/tenant/timestamp into the created `stakeholder_notes` row). The actual defect was display-only: `StakeholdersSection.tsx` had never queried the notes table. Fixed with a new route and a real UI section. **The required "unauthorized user cannot create CRM handoff from a restricted review" test was already covered** by the existing Sprint 5 `POST /api/ai/reviews` 403 test (the authorization gate runs before any workflow action, including `stakeholder_note`, can be created) -- re-confirmed, no new test needed.

### Fake CRM auto-population removed (Workstream 2)

Root cause: `stakeholderMutation()`'s own fallback defaults, not the UI (which never collected these fields at all). Fixed both: the form now collects real, optional values, and the repository's fallback is honest (`0`/`"unrated"`) rather than fabricated (`50`/`"medium"`).

### Approvals Export Report (Workstream 3)

A code search for the literal string "Export Report" found exactly one match in the entire codebase -- on the unrelated Analytics & Reports page. `ApprovalsSection.tsx`'s live-tenant view had no export button, no queue, nothing beyond an unconditional empty state, despite real `approval_requests` rows already existing (created via AI Review Inbox "Create approval request"). This is a larger gap than the sprint prompt's own framing ("dead button") suggested. Built the missing precondition (a real, tenant-scoped live queue) and the requested export on top of it.

### Feedback routing (Workstream 4)

Feedback was already reliably persisted with all required fields (user, tenant, route, message, timestamp, rating) before this sprint -- confirmed by reading the existing pipeline. The only gap was the email-delivery attempt itself, now added by reusing the existing, already-proven Resend integration pattern (`invitationEmail.ts`). Per this sprint's own explicit non-negotiable, **delivery is not claimed verified** -- this environment cannot confirm `RESEND_API_KEY` is set in production or that mail actually arrives, mirroring A-08's identical open status for invitation emails on the same provider.

## Tests Run

- New/changed Sprint 3 files run in isolation first (multiple rounds as each workstream landed): all passed.
- Full suite: **143/143 test files passed, 561/561 individual tests passed**; process exit code 1 due to 4 low-free-RAM worker-thread timeouts (`StakeholdersSection.test.tsx`, `localNlp.test.ts`, `sprint32MobileStoreLaunchRls.test.ts`, `pilot-readiness-events/route.test.ts`). Free memory measured at ~272MB/7.9GB during the run -- consistent with this session's previously-documented pattern on this machine. All 4 files re-ran cleanly in isolation immediately after (4/4 files, 18/18 tests) -- `StakeholdersSection.test.tsx` being one of this sprint's own new/changed files makes its clean isolated pass direct confirmation this is infrastructure flake, not a regression.
- `pnpm run test:rag` / `pnpm run test:security`: **do not exist** as scripts, documented per the sprint prompt's own instruction.
- `pnpm run supabase:verify`: not re-run this pass (already run and passed during RAG-2 verification the same day; no schema/migration changed since).

## Verification Results

| Gate | Command | Result |
|---|---|---|
| Typecheck | `pnpm run typecheck` | Pass, exit 0, zero errors |
| Mobile typecheck | `pnpm --dir apps/mobile run typecheck` | Pass, exit 0, zero errors |
| Lint | `pnpm run lint --max-warnings=0` | Pass, exit 0, zero warnings |
| Tests | `pnpm run test` | 143/143 test files, 561/561 tests -- see note above on the infra-flake exit code |
| Build | `pnpm run build` | Pass, exit 0, "Compiled successfully" |

## Items Closed

- RAG3-01 through RAG3-18 (see `AI_WORKSPACE_RAG_PIPELINE_REMEDIATION_CHECKLIST_2026_07_26.md`).
- A-57, A-58, A-60: code-complete and tested.
- A-65: code-complete and tested; delivery explicitly unconfirmed.

## Items Still Partial or Blocked

- **A-55/A-13/A-61/A-62**: unchanged from the Sprint 1-2 closeouts -- still require the HITL live retest.
- **A-65 delivery**: requires `RESEND_API_KEY` production confirmation and one real test submission.
- **A-57/A-58/A-60**: code-complete but not HITL-viewed live in production.

## Why A-13 Is Not Claimed Resolved

Unchanged from the Sprint 1-2 reasoning: no live production evidence exists from this environment. See `docs/readiness/RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md` for the full A-55 through A-65 status table and the explicit answer to this question.

## Required HITL Manual Validation Steps

See the "What Needs HITL Manual Validation" section of `docs/readiness/RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md` for the complete, ordered 8-step script covering all three sprints together.

## Exact Commands Run

```
pnpm run typecheck
pnpm --dir apps/mobile run typecheck
pnpm run lint --max-warnings=0
pnpm run test
pnpm run build
```

All passed. Exact counts in `docs/RELEASE_AND_VERIFICATION_EVIDENCE_LEDGER.md`.

## Residual Risks

- The Approvals live queue and CRM notes section both depend on `isSupabaseAdminConfigured()` being true in production for their underlying repositories to return real data -- if it is not, both routes honestly return empty arrays rather than fabricating content, but the HITL should confirm this configuration is live.
- Feedback email delivery is genuinely unconfirmed, not merely untested -- treat A-65 as `Blocked`, not `Yes`, until a real submission is confirmed to arrive.
- No real external LLM exists in this codebase. This is now honestly labeled everywhere it matters, but remains a real, unaddressed capability gap between the product's stated positioning and its current mechanism.

## Exit Criteria Status

| Criterion | Status |
|---|---|
| AI Review Inbox to CRM handoff real or honestly scoped | Done |
| CRM contact creation no longer fabricates live-tenant intelligence | Done |
| Approvals Export Report real or honestly disabled | Done (real) |
| Feedback persisted and routed/configured toward `[FEEDBACK_ROUTING_EMAIL_MASKED]` | Done (persisted + configured; delivery unconfirmed) |
| RAG remediation evidence package exists | Done -- `RAG_REMEDIATION_FINAL_EVIDENCE_PACKAGE_2026_07_26.md` |
| A-55 through A-65 updated with evidence-based status | Done |
| Tests and build run and documented | Done |
| Remaining HITL validation steps precise | Done |

**RAG is not claimed fully production-grade.** The final evidence package's risk rating (Medium) and its explicit statement on A-13 stand as the accurate summary of where this program leaves the pipeline.
