# Sprint 42 Closeout - Onboarding Auth Gate, Sign-Up/Login Diagnosability, OAuth Enablement Runbook - 2026-07-23

## Purpose

Sprint 42 closes Product Issue 2 from `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md` ("Provision tenant" -> "Unauthorized"), addresses its own diagnosis's named root-cause candidate (the still-open "Create account" gap from Attempt 2), and prepares Google/Microsoft OAuth for real activation. This is a narrower, targeted sprint compared to Sprint 41's QA2 audit -- it does not repeat that sprint's full live-replay/score-delta methodology, since its scope is two linked code fixes plus an external-steps runbook, not a fresh audit pass.

## 1. What Was Fixed

### 1a. Product Issue 2 -- Onboarding Wizard Had No Auth Gate

**Before:** `src/proxy.ts`'s `protectedRoutePrefixes` omitted `/onboarding`, and `EnterpriseOnboardingPage.tsx` had zero session awareness anywhere. An unauthenticated visitor could fill out all 5 data-entry screens (organization, sector/role, department/workspace, security notices) before the *only* auth check in the entire flow -- `POST /api/onboarding/provision`'s `getServerAuthSession` -- returned a bare `401 Unauthorized` with no guidance.

**After:**
- `/onboarding` added to `protectedRoutePrefixes` in `src/proxy.ts` -- an unauthenticated visitor is now redirected to `/auth?next=/onboarding...` at the edge, before the wizard renders at all.
- `EnterpriseOnboardingPage.tsx` now wraps itself in `<AuthProvider>` and checks `useAuth()` before rendering any step, reusing the exact `LoadingState`/`EmptyState` "Sign in required" pattern already used by `src/app/App.tsx` for every other protected route. This is defense-in-depth for a session that expires *during* the wizard (a real scenario, since wizard state persists in `localStorage` across page loads) -- the edge check alone can't catch that.
- `src/app/api/onboarding/provision/route.ts`'s existing `401` is left as a final, now-effectively-unreachable layer.

### 1b. Linked Issue -- Sign-Up/Login Failures Were Undiagnosable

**Before:** `src/app/api/auth/sign-up/route.ts` and `src/app/api/auth/login/route.ts` both caught every Supabase Auth failure with a bare `catch {}` -- no server-side logging, one identical generic message regardless of cause (wrong password, unconfirmed email, an account that already exists, a misconfigured project). This was named in Product Issue 2's own diagnosis as the most likely reason the onboarding wizard's user had no valid session to begin with.

**After:**
- New shared helper `src/auth/supabaseAuthError.ts` (`SupabaseAuthError`, `parseSupabaseAuthErrorResponse`) parses Supabase's real error code/message instead of discarding it, used by both `src/auth/serverSession.ts` (`supabaseAuthRequest`) and `src/auth/authApi.ts` (`callSupabaseAuth`).
- Both routes now log the real status/code server-side via `console.error`, and return specific, actionable responses for the two most likely real causes:
  - Sign-up, `user_already_exists` -> `409`, message points at sign-in.
  - Login, `email_not_confirmed` -> `401` with `code: "email_not_confirmed"`.
- New `POST /api/auth/resend-confirmation` route (calls Supabase's `/auth/v1/resend`, `{type: "signup"}`), always returning the same success response regardless of account existence (avoids account enumeration).
- `src/app/auth/page.tsx`'s sign-in form now shows a "Resend confirmation email" action when `email_not_confirmed` is returned. `src/features/auth/EnterpriseAuthFlowPage.tsx` now distinguishes success/error/info message tones instead of rendering every outcome identically.
- All other failure reasons still fall back to the pre-existing safe generic message on both routes.

This does not yet tell us *which* cause was behind the original "Create account" report -- that requires a live re-attempt (see Section 3).

### 1c. OAuth Enablement Runbook

No new application code was required (the OAuth UI, `/api/auth/oauth/start`, and the callback/session-establishment path already existed and work correctly). `docs/AUTH.md`'s "Enablement Runbook" section was rewritten into a precise, step-numbered checklist covering: getting the exact Supabase redirect URI first, Google Cloud Console app registration, Azure Portal/Entra ID app registration, Supabase dashboard provider configuration, then the Vercel env var + redeploy step and a live curl/browser verification step. Steps 1-3 are credentialed, external-console actions only Triaxis Ventures can perform; Claude Code cannot complete them under any circumstance. This workstream is documented as "runbook ready, pending external provider registration," not force-closed.

## 2. Test And Verification Evidence

- New tests: `src/app/api/auth/sign-up/route.test.ts`, `src/app/api/auth/login/route.test.ts`, `src/app/api/auth/resend-confirmation/route.test.ts`, `src/features/onboarding/EnterpriseOnboardingPage.test.tsx`.
- Extended tests: `src/proxy.test.ts` (`/onboarding` now protected, with and without a session cookie), `src/app/auth/page.test.tsx` (resend-confirmation flow, and confirms it does *not* appear for an ordinary wrong-password failure), `src/features/auth/EnterpriseAuthFlowPage.test.tsx` (success/error message tones on sign-up).
- Full suite: **120 test files / 383 tests passing** (up from 119/377 immediately after WS1's changes, and from whatever the pre-Sprint-42 baseline was per `docs/SPRINT_41_QA2_MILESTONE_2026_07_22.md`).
- `pnpm run typecheck` clean, `pnpm --dir apps/mobile run typecheck` clean, `pnpm run lint` clean (zero warnings), `pnpm run build` succeeded (116 static pages generated), `pnpm run supabase:verify` passed (unchanged: 27 migrations, 100 RLS-protected tables -- no schema change this sprint).

## 3. What Remains -- Not Force-Closed

- **Live re-walkthrough not yet performed.** Every fix in this sprint is code-confirmed and unit-tested, not yet live-verified on `beta.triaxisventures.com`. Consistent with this program's credentialed-action boundary, the actual sign-up/sign-in/onboarding walkthrough must be performed by the user, not Claude Code. Once deployed, the next attempt should confirm: (1) `/onboarding` now redirects an unauthenticated visitor instead of allowing entry; (2) the real reason behind the original "Create account" report, now that errors are specific; (3) a fully authenticated user can complete the wizard and provision a tenant with no "Unauthorized" at the end.
- **Google/Microsoft OAuth is not yet live.** Steps 1-4 of the runbook in `docs/AUTH.md` have not been performed. The buttons remain visible and correctly show "not enabled for this deployment" until they are.
- **Still open, unrelated to this sprint:** the two-tenant isolation harness has never been executed against a live database; GitHub's 22 Dependabot vulnerabilities remain uninvestigated; whether Supabase's transactional confirmation email is actually deliverable for this project has still not been independently confirmed (this sprint makes that gap *visible* via the new "email not confirmed" code path, but does not resolve it).

## 4. Deployment

Not yet deployed as of this closeout being written -- see the commit for the exact point at which this sprint's code changes were pushed. A production deploy and the live re-walkthrough in Section 3 are the natural next actions once the user is ready.
