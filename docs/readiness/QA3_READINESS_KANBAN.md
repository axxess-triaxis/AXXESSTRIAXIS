# QA3 Readiness Kanban

Date created: 2026-07-23  
Purpose: Track the five-sprint QA3 readiness program across actionables, status, confidence, and evidence.

## Board Rules

- A card can move to `Verified` only with evidence and 80%+ confidence.
- A card can move to `Closed` only after the sprint closeout document updates the actionables, roadmap, checklist, and Kanban files.
- Blocked cards must name the blocker, owner, next action, and date of next review.

## Backlog

| Card | Sprint | Owner | Confidence | Evidence |
|---|---:|---|---:|---|
| A-08 Verify user invitation flow | 3 | Claude Code / HITL | 0% | Pending |
| A-10 Run two-tenant isolation harness against real DB | 3 | Claude Code | 0% | Pending |
| A-11 Manually verify two-tenant UI isolation | 3 | Claude Code / HITL | 0% | Pending |
| A-13 Verify RAG answer with citations | 2 | Claude Code | 0% | Pending |
| A-14 Verify permission-aware retrieval | 3 | Claude Code | 0% | Pending |
| A-15 Verify AI Review Inbox approval | 2 | Claude Code | 0% | Pending |
| A-16 Verify approved AI output creates real work | 2 | Claude Code | 0% | Pending |
| A-17 Verify dashboard updates after workflow | 2 | Claude Code | 0% | Pending |
| A-18 Verify audit log updates after workflow | 2, 3, 4 | Claude Code | 0% | Pending |
| A-19 Verify timeline evidence updates | 2, 4 | Claude Code | 0% | Pending |
| A-20 Verify dashboard request deduplication | 4 | Claude Code | 0% | Pending |
| A-21 Verify Gmail/Microsoft OAuth readiness | 4 | Claude Code / HITL | 0% | Pending |
| A-22 Verify analytics event minimum | 4, 5 | Claude Code | 0% | Pending |
| A-23 Verify Android signed build path | 5 | Claude Code / HITL | 0% | Pending |
| A-24 Verify iOS build/TestFlight path | 5 | Claude Code / HITL / Apple | 0% | Pending |
| A-25 Produce QA3-ready evidence package | 4, 5 | Claude Code | 0% | Pending |

## Ready

No cards moved yet.

## In Progress

No cards moved yet.

## Review

No cards moved yet.

## Verified

No cards moved yet.

## Blocked

| Card | Sprint | Owner | Blocker | Next Action | Confidence | Evidence |
|---|---:|---|---|---|---:|---|
| A-02 Verify create-account success state | 1 | Claude Code (fix), then HITL (re-test) | Confirmed defect, not a HITL-only dependency: the HITL performed a real sign-up on 2026-07-24 and saw no visible confirmation, even though the account was created server-side | Investigate why `EnterpriseAuthFlowPage.tsx`'s tone-styled sign-up success message isn't visibly reaching the user; fix; HITL re-tests | 40% | `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, "Attempt 4 Log (2026-07-24)" |
| A-05 Verify password reset flow | 1 | HITL | Completing a reset requires a real email + a real password submission; not exercised in the 2026-07-24 walkthrough | HITL requests a reset link, completes it, confirms the new password works | 65% (code) | `/auth/forgot-password` now discoverable and live-curl-confirmed; recovery-initiation endpoint returns a safe generic response |
| A-07 Verify profile creation and editing | 1 | Claude Code (fix entry point), then HITL (re-test) | The top-right avatar/profile menu does not navigate anywhere; the working sidebar Settings entry was not tested | Fix the broken profile-menu entry point; HITL edits their profile via Settings and confirms it persists | 55% | Persistence confirmed genuine by this sprint's code audit; entry point confirmed broken by the 2026-07-24 walkthrough |

## Closed

| Card | Sprint | Owner | Confidence | Evidence |
|---|---:|---|---|---:|
| A-01 Deploy latest verified build to production | 1, 5 | Claude Code | 95% | Commit `59d1fe0` deployed as `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo` (READY, production); live-curl-confirmed serving the new build |
| A-03 Verify live login flow | 1 | HITL | 95% | HITL signed in successfully on `beta.triaxisventures.com`, 2026-07-24 |
| A-04 Verify logout flow | 1 | HITL | 95% | HITL logged out successfully, returned cleanly to sign-in, 2026-07-24 |
| A-06 Verify Tenant 0 organization provisioning | 1 | HITL | 95% | **First successful live tenant provisioning in this program's history** -- Triaxis Ventures Pvt Ltd provisioned, real workspace loaded, 2026-07-24 |
| A-09 Verify role assignment (onboarding-time scope) | 1 | HITL | 90% | Super Admin role confirmed live throughout the workspace; RBAC-gated admin pages accessible, 2026-07-24. Post-onboarding role-reassignment UI remains correctly deferred to Sprint 3 |
| A-12 Verify document upload or import | 2 | HITL | 90% | Incidentally exercised ahead of schedule: 7 files (PDF/DOCX/MD/PPTX/image/XLSX) uploaded, classified, chunked, and indexed successfully in Knowledge Hub, 2026-07-24 |

## Sprint Update Template

### Sprint N Kanban Update

- Date:
- Cards moved to Ready:
- Cards moved to In Progress:
- Cards moved to Review:
- Cards moved to Verified:
- Cards moved to Blocked:
- Cards moved to Closed:
- Cards remaining in Backlog:
- Evidence added:
- HITL decision:

### Sprint 1 Kanban Update: Tenant 0 Production Activation

- Date: 2026-07-23
- Cards moved to Ready: none
- Cards moved to In Progress: none
- Cards moved to Review: none
- Cards moved to Verified: none
- Cards moved to Blocked: A-02, A-03, A-04, A-05, A-06, A-07, A-09 (all named HITL as owner, with a specific next action -- none is blocked by missing implementation)
- Cards moved to Closed: A-01
- Cards remaining in Backlog: A-08, A-10 through A-25 (unchanged, out of Sprint 1 scope)
- Evidence added: commit `59d1fe0`; deployment `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo`; non-credentialed curl evidence in `docs/readiness/SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT.md`
- HITL decision: requested -- perform one real Tenant 0 walkthrough (sign up, confirm email, sign in, complete onboarding, edit profile) to close the 7 `Blocked` cards

### Sprint 1 Kanban Update (Continued): HITL Walkthrough Completed

- Date: 2026-07-24
- Cards moved to Ready: none
- Cards moved to In Progress: none
- Cards moved to Review: none
- Cards moved to Verified: none (moved straight to Closed, since this update itself satisfies the board rule requiring closeout/actionables/roadmap/checklist/Kanban all updated together)
- Cards moved to Blocked (re-scoped): A-02 and A-07 remain Blocked, but the owner changes from HITL to Claude Code -- both are now confirmed defects needing a fix, not items merely awaiting a HITL action
- Cards moved to Closed: A-03, A-04, A-06, A-09 (onboarding-time scope), and A-12 (Sprint 2-scoped, incidentally exercised ahead of schedule)
- Cards remaining in Backlog: A-08, A-10, A-11, A-13 through A-25
- Evidence added: full walkthrough narrative in `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, "Attempt 4 Log (2026-07-24)"
- HITL decision: two new high-priority defects were flagged directly by the HITL during this walkthrough and are not yet triaged into a formal card -- Investor Preview's "Continue to workspace" is broken, and the root domain (`beta.triaxisventures.com`) lands on a stale, dead-end authenticated-looking page. Recommend adding these as new actionables (or an unscheduled hotfix) before Sprint 2 begins, given the HITL's own "immediate"/investor-facing framing.

