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

## Attempt 2 Log (2026-07-23)

The user resumed the Tenant 0 walkthrough against the now-confirmed-live Product Issue 1 fix and reported the following, verbatim intent preserved:

1. **Sign Up and Sign In entry points are both in place and discoverable.** This confirms Product Issue 1's fix is working as intended in real use, not just in the earlier automated check -- the user could actually find and reach both paths this time, which is the part no automated check alone can fully prove.
2. **"Create account" is not yet functionally enabled.** The user has deliberately deferred investigating this to a future sprint rather than asking for an immediate fix -- logged here as open, not acted on. One grounded, unconfirmed lead for whoever picks this up: `supabase/config.toml` (this repo's *local* Supabase config, used only by `supabase start`/local dev) declares `enable_signup = true` under both the top-level and `[auth.email]` sections -- but this checkout has never been linked to the real hosted Supabase project (`docs/SUPABASE_CLI.md`: "This checkout is not yet linked to a remote project"), so there is no guarantee the *actual* live project's Auth settings match that local declaration. The live project's own "Enable email signups" toggle (Supabase Dashboard -> Authentication -> Providers -> Email) has never been independently confirmed -- that, or the still-unverified transactional-email deliverability noted in Product Issue 1's follow-ups, are the two most likely candidates, but neither has been confirmed as the actual cause. Not investigated further at the user's direction.
3. **Google and Microsoft OAuth are not yet enabled** -- expected and already documented in Product Issue 1 as requiring external Google Cloud Console / Azure Portal app registration plus Supabase dashboard configuration. The user has deferred this two sprints out. No new information here; consistent with the known state.

## Product Issue 2: Onboarding Wizard Lets An Unauthenticated User Complete All 5 Screens, Then Fails Silently-Opaque At The Finish Line ("Onboarding Workflow Attempt 2")

### Status: Diagnosed and code-confirmed; not yet fixed (documentation only, per this request)

### What Happened

Continuing the walkthrough from Attempt 2 (auth entry points), the user proceeded through the full `/onboarding` wizard at `beta.triaxisventures.com`, reaching the very end before being stopped. Full screen-by-screen record, as reported:

1. **Create organization** entry screen -- worked.
2. **Name of Organization** -- worked; entered `Triaxis Ventures Private Limited`.
3. **Sector and role selection** -- worked. Sectors offered: Government, Healthcare, NGO/Non-profit, MSME, Startup, Enterprise, Consulting/Advisory (7 options; user selected **Startup**). Roles offered: Super Admin, Organization Admin, Executive, Manager, Employee, Consultant, Guest (7 options; user selected **Super Admin**).
4. **Department / workspace naming** (both marked optional) -- worked; entered Department `Founder's Office`, Workspace `AXXESS TRIaxis`.
5. **Security and beta notices** -- worked, and the user flagged this as a genuinely good feature. Four undertakings presented with no supporting explanatory text (Terms of Service, Privacy Policy, AI Usage Notice, Beta Disclaimer) -- the user ticked all four but noted the lack of supporting text as its own minor gap worth fixing later.
6. **Summary/confirmation screen** ("Enterprise onboarding" -- "Create a clean tenant, workspace, role, and beta-safe security baseline"), titled **"Tenant ready for beta"** -- rendered correctly, showing: Organization `Triaxis Ventures Private Limited`, Sector `Startup`, Role `Super Admin`, Department `Founder's office`, Workspace `AXXESS TRIaxis`, Starting focus `None selected -- empty dashboard`, Notices `4/4 accepted`. Two options presented: **"Provision tenant"** (filled, primary) and **"Back to auth"** (outlined; the latter has been present consistently since the sign-up/sign-in pages). Confirmed via screenshot: the wizard's own left-hand step sidebar lists all 7 steps -- **Start onboarding, Create organization, Join organization, Select sector and role, Create first workspace, Accept security and beta notices, Complete provisioning** (the last, active step, highlighted) -- confirming the 5 data-entry screens above map to real named steps in the product's own wizard, not an approximation. Screenshots were captured of this screen and of the failure below.

**The walkthrough stopped here.** Clicking **"Provision tenant"** returned the message **"Unauthorized"** and did not proceed. No 7th screen was ever reached.

### Diagnosis (code-confirmed, not assumed)

Two facts, both verified directly against the current source:

1. **`/onboarding` and every one of its sub-screens are not gated by authentication at all.** `src/proxy.ts`'s `protectedRoutePrefixes` list (`/app`, `/dashboard`, `/projects`, `/programs`, `/tasks`, `/workflow-records`, `/crm`, `/stakeholders`, `/knowledge`, `/documents`, `/meetings`, `/approvals`, `/analytics`, `/integrations`, `/settings`, `/admin`) does **not** include `/onboarding` -- the edge proxy never redirects an unauthenticated visitor away from it. A search of every page under `src/app/onboarding/` and `src/features/onboarding/` for any authentication check (`useAuth`, `isAuthenticated`, `session.user`) returned **zero matches** -- the entire multi-screen wizard is pure client-side state with no awareness of whether the visitor is actually signed in.
2. **The only point that checks authentication is the very last step**, `POST /api/onboarding/provision` (`src/app/api/onboarding/provision/route.ts`, lines 7-8): `const session = await getServerAuthSession(true); if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });` -- this is the exact, literal source of the "Unauthorized" message the user saw.

**Most likely root cause, tying this directly to the still-open Attempt 2 finding:** Attempt 2 logged "Create account" as not yet functionally completing sign-up. If that account was never actually confirmed into a real, session-bearing account, the user had no valid session at any point during this onboarding attempt -- meaning the wizard let them invest five full screens of real data entry before the *first* point in the entire flow that actually checks whether they're signed in. This may not be a second, independent bug so much as the same underlying gap (sign-up not completing) surfacing at a much later, more costly point in the funnel. It has not been independently confirmed whether a genuinely authenticated user (one who successfully signed in first) would hit the same "Unauthorized" result -- that would indicate a distinct, second bug in `provisionTenantForUser` or session-cookie handling across the onboarding flow, rather than a simple consequence of Attempt 2's unresolved issue. Worth testing directly once account creation itself is fixed.

### Independent UX Defect, Regardless Of Root Cause

Even if the root cause turns out to be entirely Attempt 2's unresolved sign-up gap, the onboarding wizard's own design is a defect worth fixing on its own terms: it allows a visitor with no session at all to progress through five real data-entry screens with no warning, and only fails -- with a bare, unexplained "Unauthorized" and no guidance on what to do next -- at the final submission. A production-grade onboarding flow should check for a valid session before allowing entry into the wizard (or at minimum before the final screen), and should never let a real prospect discover they were never signed in only after they've filled out their organization's name, sector, role, and workspace details.

### Not Yet Fixed

Per this request, this entry documents the finding only -- no code change has been made. Candidate fixes for a future sprint: gate `/onboarding` behind a session check (either at the edge via `src/proxy.ts` or client-side at wizard entry), and/or re-verify the session immediately before rendering the final "Provision tenant" screen so a lost/never-established session is caught with a clear, actionable message before the user reaches the confirmation step, not after clicking submit.

### Secondary, Minor Note From The Same Screens

The four security/beta notice checkboxes (Terms of Service, Privacy Policy, AI Usage Notice, Beta Disclaimer) have no supporting explanatory text next to them -- the user flagged this as a real, if minor, gap worth addressing (a checkbox asking someone to accept a "Beta Disclaimer" with no visible text describing what that disclaimer actually says is a compliance-adjacent concern for a real enterprise pilot, not just cosmetic).

## Log Format For Future Entries

Each subsequent finding from this same walkthrough should be added below as `## Product Issue N: <short description>`, following the same structure: Status, What Happened, Diagnosis, Remediation, Verification, What Remediation Does Not Cover (if applicable), Follow-Ups. Items the user explicitly defers rather than asking to be fixed immediately should be logged as "Attempt N Log" entries instead, exactly as observed, without being escalated into a full Product Issue investigation unless asked.
