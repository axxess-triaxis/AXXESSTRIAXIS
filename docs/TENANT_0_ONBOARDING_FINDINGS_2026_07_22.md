# Tenant 0 Live Onboarding Findings Log

## Purpose

This is a running log of findings from Triaxis Ventures Private Limited's own live onboarding attempt as **Pilot Tenant 0** on `beta.triaxisventures.com` -- the authenticated golden-path gate that `docs/SPRINT_41_QA2_MILESTONE_2026_07_22.md` identified as the last thing standing between the QA remediation program and an Enterprise Beta 1.0 determination.

This walkthrough is being performed by the user directly, not by Claude Code, because completing it requires creating and authenticating a real account -- an action Claude Code's own operating constraints prohibit it from performing itself (see the exchange in this session where that was explained and the user took over the credentialed steps). Findings are reported by the user as they progress through onboarding and documented here as they're diagnosed and remediated, distinct from the already-closed `docs/SPRINT_5_CLOSEOUT_2026_07_22.md` / `docs/SPRINT_41_QA2_MILESTONE_2026_07_22.md` record, since this walkthrough is still in progress and may surface more findings.

Numbering: findings here are called "Product Issue N," per the user's own naming, since they were surfaced by direct product use rather than by the earlier structured QA audit (Sprint 36) -- they sit outside the original F-001-F-021 numbering.

## Product Issue 1: No Sign-Up Facility, No OAuth Options -- Tenant 0 Onboarding Stopped

### Status: Closed -- fixed, tested, deployed, and confirmed live on beta.triaxisventures.com

### What Happened

While attempting to onboard Triaxis Ventures as Pilot Tenant 0, the user's onboarding journey stopped at the very first step. The user reported (and shared a screenshot of) landing on the sign-in page and having no visible path to actually create a new account. Separately, a follow-up screenshot showed a real sign-in failure: `sudipta1213@gmail.com` returned "Unable to sign in with the supplied email and password" after an attempted sign-up.

### Diagnosis (verified directly against the live site and the source code, not assumed)

Two distinct, confirmed problems, investigated in this order:

1. **No discoverable sign-up entry point.** A direct check of the live `/auth` page (via a full accessibility-tree dump, not just visible text) showed only an email/password sign-in form and an "Open investor preview" button -- no link to `/auth/sign-up` anywhere on the page, even though that route existed and worked once reached directly. A user landing on `/auth` cold had no way to discover that sign-up was even possible.
2. **No identity option besides manual email/password, anywhere.** Both `/auth` and `/auth/sign-up` were checked the same way -- neither had a Google, Microsoft, or any other OAuth button. A backend route for exactly this (`/api/auth/oauth/start`, supporting Google/Microsoft/Apple) already existed in the codebase but was never wired to any UI element, and its companion callback handler -- the piece that would turn a completed Google/Microsoft sign-in into an actual AXXESS session -- did not exist at all.
3. **The specific sign-in failure was root-caused separately**, by reading `src/app/api/auth/login/route.ts` and `src/auth/serverSession.ts` directly: the login route swallows every possible Supabase Auth failure reason into one identical generic message ("Unable to sign in with the supplied email and password"), and doesn't even log the real reason server-side. Given the account had just been created moments before, the most probable real cause was Supabase's standard "email not confirmed" state (the sign-up endpoint's own success message says "Check your email to verify the account before onboarding") being misreported as a wrong-password error. The user, after seeing this diagnosis, chose to prioritize the OAuth/sign-up-discoverability fix over the error-message fix; the error-masking issue itself remains open (see Follow-Ups below).

### Remediation

Implemented and verified in this session:

- Added a visible **"Sign up"** link on the `/auth` sign-in page, pointing to `/auth/sign-up`.
- Added **"Continue with Google"** and **"Continue with Microsoft"** buttons to both `/auth` and `/auth/sign-up`, via a new shared component (`src/features/auth/OAuthProviderButtons.tsx`). These are always visible -- not hidden until an administrator configures the underlying provider -- so a real tenant evaluating AXXESS sees the intended set of options, consistent with the "provider-gated" pattern already used elsewhere in the product (visible and honest about readiness, not hidden).
- Built the OAuth **callback handling that did not previously exist at all**: `establishServerSessionFromOAuthTokens` (`src/auth/serverSession.ts`), a new `POST /api/auth/oauth/callback` route, and hash-fragment token capture added to `EnterpriseAuthFlowPage`'s `login` kind. Without this piece, the new buttons would have redirected to Google/Microsoft's consent screen and then dead-ended -- no code existed to turn a completed provider sign-in into a real, cookie-backed AXXESS session. This was the more serious of the two gaps and the one most likely to have caused real embarrassment in front of an actual enterprise prospect if it had shipped as "buttons that appear to work but don't."
- Added a **"Already have an account? Sign in"** link on the sign-up page, completing the round trip.

### Verification

- 12 new/extended tests added, all passing: `src/features/auth/OAuthProviderButtons.test.tsx` (3), `src/features/auth/EnterpriseAuthFlowPage.test.tsx` (5, new file -- includes a full behavioral test of the OAuth callback: token capture, session exchange, redirect to `/dashboard` or `/onboarding`, and the error path), `src/app/api/auth/oauth/callback/route.test.ts` (4, new file), plus 1 new case in `src/app/auth/page.test.tsx`.
- Full local verification suite passed: `pnpm run typecheck`, mobile typecheck, `pnpm run lint` (zero warnings), `pnpm run test` (116 test files / 362 tests, up from 113/349), `pnpm run build`, `pnpm run supabase:verify` (unchanged: 27 migrations, 100 RLS-protected tables), `pnpm run mobile:store:release-gate`, `pnpm run mobile:capacitor:store:doctor`.
- Committed (`32350c9`) and pushed to both GitHub and GitLab (both remotes reachable and in sync as of this fix).
- **Production redeploy: took three attempts, all diagnosed, none silently retried.**
  1. First attempt (previous session) never reached the deploy step at all -- its own internal `pnpm run test` gate failed with `[vitest-pool-runner]: Timeout waiting for worker to respond`, `Duration 41472.91s` (over 11 hours), consistent with the session environment sleeping/suspending mid-run overnight and the test workers never recovering when it resumed. Confirmed via the command's own captured output once it finally surfaced.
  2. Second attempt (this session, after independently confirming via `curl` against the live deployment's own URL -- bypassing any CDN/alias caching -- that the fix was not yet live) ran cleanly end to end: typecheck/lint/test (116 files / 362 tests) all passed, build succeeded, and `vercel deploy --prod` returned `{"status":"ok","readyState":"READY"}` for deployment `dpl_A6FnntX928iN57E1iNkKJzEUkL7o`.
  3. That new deployment's own `vercel inspect` alias list did not list `beta.triaxisventures.com` explicitly (only the apex/www/vercel.app domains) -- rather than assuming success or failure from that alone, a direct `curl` against `https://beta.triaxisventures.com/auth` was run, which returned the literal strings "Sign up", "Continue with Google", and "Continue with Microsoft" -- confirming the new build was actually being served there regardless of what the alias-list display showed. A follow-up browser screenshot confirmed the same thing visually: the sign-in card now shows Email/Password/Sign in, an "OR" divider, "Continue with Google", "Continue with Microsoft", "Don't have an account? Sign up", and "Open investor preview" -- exactly as built.
- **Confirmed live** on `beta.triaxisventures.com` as of this update. This is a measured result (direct `curl` + direct browser screenshot against the actual production URL), not an inference from the deploy command's own reported success.

### What Remediation Does *Not* Cover (External Dependency, Not Resolvable By Code)

Clicking "Continue with Google" or "Continue with Microsoft" right now will show a clear, safe message ("`<provider>` OAuth is not enabled for this deployment.") rather than a broken redirect -- this is expected, not a bug. Making these buttons functionally complete a real sign-in requires three external, credential-bearing steps that only Triaxis Ventures (not this codebase, and not an agent) can perform:

1. Register a real OAuth application in **Google Cloud Console** (for Google) and in **Azure Portal / Entra ID** (for Microsoft), under Triaxis Ventures' own accounts, using Supabase's own callback URL as the authorized redirect URI (found on Supabase's dashboard, Auth > Providers, per provider).
2. Enter the resulting Client ID and Client Secret into the Supabase project's dashboard under **Authentication > Providers**, and enable each provider there.
3. Set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` / `NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED=true` on the Vercel project and redeploy.

Manual email/password sign-up has no such external dependency and works end to end today (subject to the separate error-masking issue noted below).

### Follow-Ups Not Yet Addressed

- **The generic sign-in error message is still unfixed.** `src/app/api/auth/login/route.ts` still collapses every Supabase Auth failure (wrong password, unconfirmed email, nonexistent account, misconfiguration) into one identical message, and logs nothing server-side. This was diagnosed in the same investigation that found Product Issue 1, but the user chose to prioritize the OAuth/sign-up fix first. Recommended next: distinguish "email not confirmed" specifically and surface clear, actionable copy for it, while logging the real reason server-side for every case -- see the diagnosis notes preserved in this session's transcript around the second screenshot.
- **Whether Supabase's transactional email (the sign-up confirmation link) is actually configured and deliverable** for this project has not been independently verified -- if it is not, a new sign-up would be stuck with no way to confirm the account and no clear indication why, which would be a second, more serious blocker than Product Issue 1. Worth confirming directly (check the Supabase dashboard's Auth > Email Templates / SMTP settings, and confirm a real confirmation email actually arrives end to end) before relying on manual sign-up for a real Tenant 0 attempt.
- Google/Microsoft OAuth remains non-functional pending the three external steps listed above.

## Log Format For Future Entries

Each subsequent finding from this same walkthrough should be added below as `## Product Issue N: <short description>`, following the same structure: Status, What Happened, Diagnosis, Remediation, Verification, What Remediation Does Not Cover (if applicable), Follow-Ups.
