# Feedback/Invite Email Delivery -- Sprint 1 Closeout (2026-07-27)

Date: 2026-07-27
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline
Related: `docs/readiness/EMAIL_DELIVERY_AND_OAUTH_ROADMAP_2026_07_27.md`,
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-08, A-65

## Summary

The founder asked for three goals: (1) "Send Feedback" delivers to `[FEEDBACK_ROUTING_EMAIL_MASKED]`, (2)
"Invite Team" actually emails the entered address, (3) Google/Microsoft OAuth on Sign In. Before
building anything, the existing codebase was audited against all three. Both the feedback-email and
invitation-email backends already existed, correct and Resend-integrated -- but in both cases the
actual UI button called the database repository directly instead of the API route that sends the
email, so under normal (non-error) conditions no email was ever sent regardless of whether
`RESEND_API_KEY` was configured. This closeout covers the two bug fixes (Sprint 1 of the roadmap).
OAuth (goal 3) requires founder-only external actions and is unchanged in this pass -- see the
roadmap doc's Sprint 2.

## External Signal

Founder, 2026-07-27, restating the requirement in concrete, testable terms after the earlier
A-08/A-65 work: feedback must reach `[FEEDBACK_ROUTING_EMAIL_MASKED]`, and "Invite Team" with "Send Invite"
must actually send mail. This connects directly to a real, dated prior finding already in the
matrix: **A-08, 2026-07-25** -- HITL sent 3 real invitations through `/settings` (the exact UI
this fix touches) and none of the 3 recipients received an email, despite a success message.

## Root Cause (Both Items, Same Bug Class)

- **Feedback**: `src/components/feedback/BetaFeedbackModal.tsx`'s `submitFeedback()` called
  `applicationServices.betaFeedbackRepository.create()` -- a raw Supabase write with no email
  side-effect (confirmed by grep: zero references to `sendFeedbackNotificationEmail` anywhere in
  `src/repositories/supabaseEnterpriseRepositories.ts`). The only code path that actually calls
  `sendFeedbackNotificationEmail()` is `POST /api/beta-feedback`, which the modal never called.
- **Invitations**: `src/features/settings/SettingsSection.tsx`'s `inviteUser()` called
  `applicationServices.invitationsRepository.create()` as its primary path, and only fell back to
  `fetch("/api/invitations")` -- the route that actually calls `sendInvitationEmail()` -- inside a
  `catch` block, i.e. only if the direct repository write threw. A successful invite (the normal
  case) never reached the email-sending code at all.
- **This retroactively explains A-08's 2026-07-25 finding independent of the already-tracked
  missing `RESEND_API_KEY`**: even with a valid key, this invite path would never have sent an
  email, because it never called the route that would have used that key.

## What Changed

- **`src/components/feedback/BetaFeedbackModal.tsx`**: `submitFeedback()` now does
  `fetch("/api/beta-feedback", { method: "POST", credentials: "include", body: JSON.stringify({...}) })`
  instead of writing to the repository directly. Removed the now-unused
  `applicationServices`/`tenantScopeFromUser` imports. A non-2xx response's real server error
  (`payload.error`) is shown in the toast instead of a generic message.
- **`src/features/settings/SettingsSection.tsx`**: `inviteUser()` now calls
  `POST /api/invitations` as its one and only path (no more direct-write-then-fallback). The toast
  now reflects the real `emailDelivery` status returned by the route: `"sent"` -> success toast,
  `"not-configured"` -> an honest info toast telling the admin to share the invite link manually,
  `"failed"` -> an honest info toast, and a thrown/non-2xx response -> a real error toast with the
  server's actual message.

## What Did Not Change

- The email-sending backends themselves (`src/services/email/feedbackEmail.ts`,
  `src/services/email/invitationEmail.ts`) -- both were already correct, already Resend-integrated,
  already defaulting the feedback recipient to `[FEEDBACK_ROUTING_EMAIL_MASKED]` exactly as requested.
- The two API routes (`POST /api/beta-feedback`, `POST /api/invitations`) -- both already called the
  right send functions, already audit-logged the delivery outcome, already failed honestly.
- `RESEND_API_KEY` is still absent from production (confirmed via `vercel env ls production`
  against `triaxis-www-frontend-import`, 2026-07-27) -- this fix does not and cannot add it; that is
  a founder-only action (Sprint 2 of the roadmap).
- `NEXT_PUBLIC_APP_URL` is also still absent from production -- invitation accept links will
  resolve to `http://localhost:3000` until it's set, even once email delivery itself works.
- Goal 3 (OAuth) -- untouched this pass. The code for it already exists and is already wired to the
  real Sign In form; it needs external account/credential setup this agent cannot perform.

## What Was Verified

- **Targeted tests, 2 files, 11/11 passing**: `BetaFeedbackModal.test.tsx` (new, 2 tests: submits to
  `/api/beta-feedback` with the right body, surfaces the real server error on a 400), plus 3 new
  tests in `SettingsSection.test.ts` (`inviteUser` calls `POST /api/invitations` as the primary
  path; does not write to the repository directly; surfaces the real `emailDelivery` outcome).
- `pnpm run typecheck` -- clean.
- `pnpm run lint` (`eslint . --max-warnings=0`) -- clean, zero warnings.
- `pnpm run test` -- **153 test files passed, 610 tests passed** (up from 152 files / 605 tests
  before this fix), run 2026-07-27.
- `pnpm run build` -- clean, no errors (see "Exact File / Commit / PR / Deployment State" below).
- **Not verified**: no live HITL retest yet -- both fixes are blocked on `RESEND_API_KEY` even to
  attempt a live email-delivery test; a live retest before that key exists would only re-confirm
  the already-known `not-configured` honest-failure path, not real delivery.

## What Remains Partial or Blocked

- `RESEND_API_KEY` -- founder action, Vercel Dashboard, Production environment.
- `NEXT_PUBLIC_APP_URL` -- founder confirms the value (`https://landing.triaxisventures.com`); this
  agent can add it once told to, since it is a public URL, not a secret, but will not add any
  production environment variable without an explicit go-ahead in chat.
- Goal 3 (OAuth): unstarted this pass, requires Google Cloud Console + Microsoft Entra app
  registration + Supabase Dashboard provider configuration, all founder-only. See the roadmap.
- Live HITL confirmation that a real feedback submission and a real invite now produce a real email
  in an inbox -- blocked on the above.

## Exact File / Commit / PR / Deployment State

Files changed:
- `src/components/feedback/BetaFeedbackModal.tsx`
- `src/components/feedback/BetaFeedbackModal.test.tsx` (new)
- `src/features/settings/SettingsSection.tsx`
- `src/features/settings/SettingsSection.test.ts` (expanded)
- `docs/readiness/EMAIL_DELIVERY_AND_OAUTH_ROADMAP_2026_07_27.md` (new)
- `docs/readiness/EMAIL_DELIVERY_SPRINT1_CLOSEOUT_2026_07_27.md` (this file, new)
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-08 reclassified `No` -> `Blocked` with the
  second root cause and fix; A-65 updated with the same; tally now 36 Yes / 20 Blocked / 11 No)

Branch: `canonical/sprint-1-35-unified-gitlab`. Commit and push (to `origin` and `gitlab`) follow in
this session. No production deployment in this pass -- these fixes have no visible effect without
`RESEND_API_KEY`, so deploying now would not change live behavior; deployment is better bundled with
Sprint 2 once the founder adds the key, per `CLAUDE.md`'s deployment discipline (explicit
confirmation required for every deploy regardless).
