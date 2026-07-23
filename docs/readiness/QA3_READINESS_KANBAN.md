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
| A-12 Verify document upload or import | 2 | Claude Code | 0% | Pending |
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
| A-02 Verify create-account success state | 1 | HITL | Claude Code cannot create accounts under any circumstance | HITL performs one real sign-up on `beta.triaxisventures.com` and confirms the visible confirmation state | 70% (code) | Sign-up route + tone-styled success UI deployed (`dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo`) |
| A-03 Verify live login flow | 1 | HITL | Claude Code cannot enter passwords under any circumstance | HITL signs in with the confirmed account | 70% (code) | Login route with specific error codes deployed and non-credentially verified reachable |
| A-04 Verify logout flow | 1 | HITL | Requires a prior live login, which Claude Code cannot perform | HITL logs out and confirms protected routes then block access | 75% (code) | `AuthProvider.test.tsx` logout-clears-session regression coverage, unchanged this sprint |
| A-05 Verify password reset flow | 1 | HITL | Completing a reset requires a real email + a real password submission | HITL requests a reset link, completes it, confirms the new password works | 65% (code) | `/auth/forgot-password` now discoverable and live-curl-confirmed; recovery-initiation endpoint returns a safe generic response |
| A-06 Verify Tenant 0 organization provisioning | 1 | HITL | Provisioning requires a real authenticated session | HITL completes one full onboarding walkthrough as Triaxis Ventures Pvt Ltd | 70% (code) | Product Issue 2 fix live-curl-confirmed (`/onboarding` redirects unauthenticated visitors); `provisionTenantForUser` writes real org/role rows |
| A-07 Verify profile creation and editing | 1 | HITL | Editing a profile requires a real authenticated session | HITL edits their profile in Settings and confirms it persists across a refresh | 80% (code) | Code-audited this sprint: `/api/profile` genuinely persists to Supabase, not a stub (`docs/AUTH.md` corrected accordingly) |
| A-09 Verify role assignment | 1, 3 | HITL (onboarding-time) / Claude Code (Sprint 3, reassignment UI) | Onboarding-time assignment requires a real session; post-onboarding role-change UI does not exist yet | HITL confirms role during onboarding walkthrough; role-reassignment UI is correctly deferred to Sprint 3, not built this sprint | 60% (code) | `provisionTenantForUser` writes `role` to the real `users` table; `/admin/roles` confirmed to be a non-functional placeholder page (out of Sprint 1's proportionate scope) |

## Closed

| Card | Sprint | Owner | Confidence | Evidence |
|---|---:|---|---|---:|
| A-01 Deploy latest verified build to production | 1, 5 | Claude Code | 95% | Commit `59d1fe0` deployed as `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo` (READY, production); live-curl-confirmed serving the new build |

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

