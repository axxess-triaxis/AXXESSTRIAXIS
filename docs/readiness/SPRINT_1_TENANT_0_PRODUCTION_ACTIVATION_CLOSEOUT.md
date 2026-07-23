# Sprint 1 Closeout: Tenant 0 Production Activation

Date: 2026-07-23
Program: Five-Sprint QA3 Readiness Execution Program
Executor: Claude Code
Product manager / prompt designer: Codex
HITL authority: Sudipta Koushik Sarmah, Founder and Managing Director, Triaxis Ventures Private Limited

## Sprint Objective

Make Triaxis Ventures Pvt Ltd usable as the first real tenant (Tenant 0).

## Result Summary

**Every engineering-side deliverable is complete, tested, and deployed to production. Sprint 1 is not fully closed**, because its own exit criteria require Triaxis Ventures to actually sign up, sign in, and use the product -- a set of credentialed actions Claude Code's own operating constraints prohibit it from performing under any circumstance, on any authorization. What remains is a single HITL walkthrough, not further engineering work.

## Files Changed

- `src/app/auth/page.tsx` -- added a discoverable "Forgot password?" link on the sign-in page (previously the backend/route worked but had no path to discover it, the same class of gap Product Issue 1 already fixed for sign-up).
- `src/app/auth/page.test.tsx` -- test for the new link.
- `src/features/onboarding/EnterpriseOnboardingPage.tsx` -- enforces all 4 required security/beta notices before "Continue" leaves the security step (previously it silently advanced regardless of how many were ticked); the final provisioning-blocked message now names exactly which requirement is unmet (`missingRequirements()` helper) instead of one bundled, non-specific message.
- `src/features/onboarding/EnterpriseOnboardingPage.test.tsx` -- 3 new tests for the above.
- `docs/AUTH.md` -- corrected stale "profile updates are stored locally" language; code-audited this sprint and confirmed `/api/profile` genuinely persists to Supabase, not a stub.
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`, `docs/readiness/FIVE_SPRINT_ROADMAP_TO_QA3.md`, `docs/readiness/SPRINT_CHECKLISTS_TO_QA3.md`, `docs/readiness/QA3_READINESS_KANBAN.md` -- updated per the program's mandatory documentation rule.
- This file (new).

No architecture was rewritten, no UI was redesigned, and no working functionality was removed.

## Audit Findings (Required Work Step 1)

Full audit against the sprint's required-work list, before any fix:

| Area | Finding |
|---|---|
| Signup | Works server-side (confirmed live via a real confirmation email in an earlier session's Tenant 0 walkthrough, "Attempt 3 Log"); UI shows a tone-styled success message (Sprint 42), not a screen transition -- by design, previously reported as confusing, deployed but not yet re-verified live post-deploy. |
| Login | Works; Sprint 42 added specific error codes (`user_already_exists`, `email_not_confirmed`) and a resend-confirmation action, replacing a bare generic message. |
| Logout | Works; fixed and unit-tested in an earlier sprint of this program (`AuthProvider.test.tsx`), unchanged this sprint. |
| Password reset | **Gap found and fixed.** `/api/auth/forgot-password` and `/api/auth/reset-password` both work correctly (confirmed via code read and non-credentialed live curl), and `/auth/reset-password` correctly captures Supabase's recovery token from the URL hash -- but there was no link to `/auth/forgot-password` anywhere on the actual sign-in page. Fixed this sprint. |
| Session persistence | Works; httpOnly cookie-backed, unchanged this sprint. |
| Protected routes | Works; `/onboarding` is now edge-protected (Sprint 42, deployed this sprint for the first time) and live-curl-confirmed redirecting unauthenticated visitors. |
| Organization creation / Tenant 0 provisioning | **The sprint's central blocker.** Sprint 42's fix for "Provision Tenant -> Unauthorized" (Product Issue 2) was committed but never deployed. Deployed this sprint and live-curl-confirmed working (see Deployment section). |
| Profile creation/editing | **Audited, found to genuinely work.** `/api/profile` PATCH calls `updateTenantProfile` (`src/auth/provisioning.ts`), which upserts to the real Supabase `profiles` and `users` tables via `supabaseAdminRest` -- not a stub. Wired to a real form in `SettingsSection.tsx`. `docs/AUTH.md`'s stale "stored locally" language (accurate as of an earlier sprint, never updated) was corrected. |
| Role assignment | **Audited, mixed finding.** Onboarding-time role selection genuinely persists to the real `users.role` column and is respected by RBAC throughout the app. Post-onboarding role *reassignment* via `/admin/roles` does not exist -- that page (`EnterpriseAdminPage panel="roles"`) is a static placeholder whose "Admin actions" buttons have no `onClick` handlers at all. Building that mutation UI is out of this sprint's proportionate scope ("do not invent a large new admin system") and is already scheduled for Sprint 3 alongside A-08 (invitations) and role-specific access -- documented as a known, correctly-deferred gap, not silently missed. |
| Admin/organization settings | Not touched -- out of Sprint 1's scope (organization profile fields, sector, security tier are set once at provisioning; editing them post-creation is Sprint 3+ territory). |
| Error states | Sign-up/login error copy already sanitized in Sprint 42 (no raw Supabase/stack text). The onboarding notices-validation gap (vague blocking message) found in this sprint's audit was fixed. |
| Empty states | Not a Sprint 1 blocker; not touched. |
| Supabase Auth integration | Confirmed real (`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`-backed), not mock, for the production auth-shell path. |
| Production/demo fallback behavior | Unchanged; Demo Mode remains fully separate from the Tenant 0 provisioning path, as designed. |

## Actionables

**Targeted:** A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-09.

**Closed (`Yes`):** A-01 only.

**Blocked:** A-02, A-03, A-04, A-05, A-06, A-07, A-09 -- every one is backed by deployed, tested, non-credentially-verified-where-possible code. None is blocked by missing implementation; all seven are blocked on the same single external dependency: a real, credentialed HITL walkthrough.

**Still `No`:** none of the 8 targeted actionables. (A-08, out of scope for Sprint 1, remains `No` unchanged, on schedule for Sprint 3.)

## Confidence Score Per Actionable

| Actionable | Status | Confidence | Basis |
|---|---|---:|---|
| A-01 Deploy latest verified build | Yes | 95% | Directly observed: deployment `READY`, live curl against `beta.triaxisventures.com` confirms new code serving |
| A-02 Create-account success state | Blocked | 70% (code) | Deployed, non-credentially reachable, tone-styled UI confirmed in source; live proof requires a real sign-up |
| A-03 Live login flow | Blocked | 70% (code) | Deployed, form renders correctly; live proof requires a real credentialed login |
| A-04 Logout flow | Blocked | 75% (code) | Strong pre-existing unit-test coverage, unchanged this sprint; live proof requires a prior real login |
| A-05 Password reset flow | Blocked | 65% (code) | Discoverability fix deployed and live-curl-confirmed; full reset completion requires a real email round-trip |
| A-06 Tenant 0 provisioning | Blocked | 70% (code) | The sprint's central fix is deployed and live-curl-confirmed (edge redirect works); actual provisioning has never succeeded even once in this program's history |
| A-07 Profile creation/editing | Blocked | 80% (code) | Code-audited this sprint and confirmed genuine, not a stub; live proof requires a real authenticated edit |
| A-09 Role assignment | Blocked | 60% (code) | Onboarding-time write confirmed real; post-onboarding reassignment UI confirmed absent (correctly deferred) |

No actionable was marked `Yes` without direct evidence, and no actionable was marked `Blocked` without a named owner (HITL) and a specific, small next action.

## Tests Run And Results

```
pnpm run typecheck   -> clean
pnpm run lint        -> clean, zero warnings
pnpm run test        -> 120 files / 387 tests passing (up from 119/383 before this sprint)
pnpm --dir apps/mobile run typecheck -> clean
pnpm run build       -> succeeded, 116 routes generated
pnpm run supabase:verify -> passed (27 migrations, 100 RLS-protected tables, no schema change)
```

4 new tests added this sprint: 1 for the Forgot-password link, 3 for onboarding notice enforcement (block-until-all-accepted; allow-once-all-accepted; final-message names missing requirements specifically).

## Deployment / Live Verification Evidence

- Commit `59d1fe0` ("feat(readiness): activate tenant 0 production onboarding") deployed via `scripts/deploy-vercel.mjs --target=production`.
- Deployment `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo`, `readyState: READY`, `target: production`, aliased to `triaxisventures.com`.
- **Non-credentialed live verification against `beta.triaxisventures.com`** (no account created, no password entered, per Claude Code's own operating constraints):

```
GET  /auth                          -> 200, page contains "Forgot password"
GET  /auth/forgot-password          -> 200
GET  /auth/sign-up                  -> 200, contains "Create account", "Continue with Google", "Continue with Microsoft"
GET  /onboarding (no session)       -> 307, Location: /auth?next=%2Fonboarding   <- the sprint's central fix, confirmed live
GET  /api/profile (no session)      -> 401 {"error":"Unauthorized."}   <- clean JSON, no stack trace
POST /api/onboarding/provision (no session) -> 401 {"error":"Unauthorized."}
POST /api/auth/forgot-password (test email) -> 200 {"ok":true,"message":"If the account exists, a reset link has been sent."}
```

The most important single line above is the `/onboarding` redirect: it is the first live confirmation, in this program's entire history, that an unauthenticated visitor can no longer walk through the onboarding wizard and only discover they were never signed in at the final "Provision tenant" click (Product Issue 2). That fix existed in code since Sprint 42 but had never been deployed until this sprint.

**Not performed, and cannot be performed by Claude Code:** actual account creation, login, password reset completion, profile editing, or onboarding completion. These require entering credentials or creating an account, both prohibited to Claude Code without exception, regardless of authorization.

## Evidence Summary

| Claim | Evidence type | Confidence |
|---|---|---|
| Latest code is live in production | Direct: deployment status + live curl | Measured |
| `/onboarding` blocks unauthenticated entry | Direct: live curl against production | Measured |
| Password reset is now discoverable | Direct: live curl against production | Measured |
| Profile editing persists server-side | Code audit this sprint | Code-confirmed, not yet live-observed |
| Onboarding-time role assignment persists and is respected | Code audit this sprint | Code-confirmed, not yet live-observed |
| Sign-up / login / logout / full password reset / full onboarding completion | Prior sessions' code work + this sprint's non-credentialed checks | Code-confirmed only; live completion pending HITL |

## Remaining Risks

- **The sprint's exit criteria are not yet met**, because they require an actual successful sign-up/sign-in/onboarding, which has never happened even once in this program's history. This is the single largest open risk carried into Sprint 2 if not resolved first.
- Whether Supabase's transactional email is reliably deliverable for this project is more likely resolved than not (a real confirmation email was received and worked in an earlier walkthrough), but has not been re-confirmed against the current deployment.
- Post-onboarding role reassignment has no working UI at all -- acceptable for Sprint 1's narrower goal (get Tenant 0 activated), but a real gap that must be built, not just verified, in Sprint 3.
- The onboarding wizard's "Create account" success state, while now tone-styled, has not been re-observed live since deployment; if a real walkthrough still finds it unclear, that is a legitimate small follow-up, not a regression.

## Recommended Sprint 2 Readiness

**Do not begin Sprint 2 yet.** Sprint 2 (Live Golden Path Execution) depends on a tenant that can already sign in and hold a real session -- exactly what Sprint 1's blocked actionables are waiting on. Starting Sprint 2 work now would mean testing golden-path workflows (document upload, RAG, review, task creation) without a real, provisioned Tenant 0 to run them against, which does not match this program's own evidence standard.

## HITL Decision Required

**One action closes most of this sprint:** sign up (or use the confirmed account from the earlier Tenant 0 walkthrough), confirm the email, sign in, complete the onboarding wizard as Triaxis Ventures Pvt Ltd, and edit your profile once in Settings. That single ~15-30 minute session would very likely move A-02, A-03, A-04, A-05, A-06, A-07, and the onboarding-time half of A-09 from `Blocked` to `Yes` in one pass, since every one of them is blocked on exactly that same walkthrough, not on separate work.

No other founder decision is required to close Sprint 1 -- there is no ambiguous product, business, legal, security, or external-account choice pending. This is purely the one credentialed action Claude Code cannot take on your behalf.
