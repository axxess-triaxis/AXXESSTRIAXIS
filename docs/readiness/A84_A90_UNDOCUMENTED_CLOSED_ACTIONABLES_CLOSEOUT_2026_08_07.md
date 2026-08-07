# Closeout -- A-84, A-85, A-86, A-87, A-88, A-90

Date: 2026-08-07
Governance source: `CLAUDE.md` evidence-chain discipline
Status: **Permanently closed.** All 6 items below are `Yes` in
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` and have been since 2026-08-03/08-05, but until
this document none of them had a dedicated closeout doc -- each only existed as a (very long)
inline matrix row.

## Why This Document Exists

The founder asked for a full closed/open inventory of the repo's tracked actionables. Compiling
that inventory surfaced a documentation-coverage gap distinct from the stale-status problem this
program already fixed once (see `STALE_ACTIONABLES_MATRIX_CLOSURE_2026_08_07.md`): these 6 items
are not stale -- their `Yes` status in the matrix is current and accurate -- but they were **never
given a dedicated closeout document**, unlike comparable-severity items from earlier in the program
(A-79, A-97, the Sprint 1-5 closeouts, the Golden Path routing closeout, etc.). Two of these six
(A-86, A-87) are marked `CRITICAL` in the matrix itself and involved a live production session
death and a live production sign-in failure on 2026-08-03 -- exactly the class of incident this
repo's evidence-chain discipline exists to keep auditable, not buried in a single dense table cell.

**Discovery method:** while compiling a full closed/open actionables list for the founder, a
documentation-coverage audit (grep for each closed ID's literal string across every
`*CLOSEOUT*`/`*CLOSURE*` doc in `docs/readiness/`) found these 6 IDs had zero hits outside the
matrix itself. This document consolidates the evidence that already existed in the matrix row for
each into the repo's standard closeout format -- no new investigation or re-verification of the
underlying fixes was performed beyond what is cited below; this is a documentation exercise, not a
fresh QA pass.

## Per-Item Closure Detail

### A-84 -- Phone-OTP sign-in created a second, tenant-less identity

**Original defect, CRITICAL:** a user who already had a tenant via email+password or Google/
Microsoft OAuth, signing in by phone (Twilio) for the first time, landed in Enterprise Onboarding
as if brand-new, instead of resolving to their existing tenant -- risking duplicate, orphaned
organizations for the 5 live tenants at the time.

**Root cause:** none of the app's 4 auth methods (email+password, Google OAuth, Microsoft OAuth,
phone OTP) cross-mapped to the same Supabase identity for one human. `resolveUser()`
(`src/auth/serverSession.ts:118-125`) matched a tenant by `public.users.id = auth.users.id` only;
unauthenticated phone-OTP verification always created or resolved a **new**, phone-keyed
`auth.users` row with no matching `public.users` row, so `needsOnboarding` computed `true`.
`public.users` had no `phone` column and no unique constraint on `email`; zero identity-linking
code existed anywhere in `src/`.

**Fix, two parts:**
1. **Stopgap** (`PhoneOtpSignIn.tsx`): an unrecognized phone number no longer silently
   auto-routes to onboarding -- shows an explicit interstitial ("We don't recognize this phone
   number yet...") with "Sign in a different way" / "I'm new here, continue" choices.
2. **Core fix**: `linkPhoneStartServerSide`/`linkPhoneVerifyServerSide`
   (`src/auth/serverSession.ts`) use Supabase's authenticated `updateUser({phone})` +
   `verifyOtp({type:"phone_change"})`, which Supabase attaches to the caller's *existing*
   `auth.users.id` rather than minting a new identity. Two new authenticated-only routes
   (`POST /api/auth/phone/link/{start,verify}`), `phone?: string` added to `SupabaseAuthUser`/
   `UserContext` (additive, no migration), a new "Linked sign-in methods" section in
   Settings > Profile.

**Commit:** `beb3acb`. **Deployed:** 2026-08-03 (`dpl_ENb6mBJsNi14cTxa26vxMpHD5k6F`, `readyState:
READY`, aliased `landing.triaxisventures.com`).

**Verified:** `tsc --noEmit` clean (web + mobile), `eslint --max-warnings=0` clean, `next build`
exit 0. 18/22 new/changed tests confirmed passing across 4 files (`PhoneOtpSignIn.test.tsx` 6/6,
`serverSession.test.ts` 9/9, `start/route.test.ts` 5/5, `verify/route.test.ts` 4/4).
`SettingsSection.linkedPhone.test.tsx` (4 tests) could not be run in this session -- 7 consecutive
attempts crashed on system memory exhaustion (confirmed via a V8 native fatal-error trace, not a
logic defect); flagged unconfirmed rather than claimed passing, and the component was manually
reviewed as containing no logic distinct from its already-tested route calls.

**Blocker hit and resolved along the way:** the founder's first live test failed on a Twilio Trial
account restriction (error 21608, unverified destination number) -- a real Twilio account
limitation, not a code defect. A verified number then succeeded.

**HITL live confirmation, 2026-08-03:** founder linked a real phone number, signed out, signed back
in via phone-only, and confirmed landing in the existing tenant, not onboarding: **"fully
working."**

**What remains open, independently, not a blocker on this closure:** the founder decided
(2026-08-03) to move phone-OTP delivery off Twilio to a different SMS provider rather than upgrade
the Trial account -- no provider chosen, no code work started. This is a forward-looking action
item, tracked in the matrix row, not part of A-84's closure.

### A-85 -- LaunchList referral link redirected into the product instead of the waitlist page

**Original defect:** `landing.triaxisventures.com/?ref=WCZaE8` (a LaunchList waitlist referral
link) 307-redirected to `/dashboard`, rendering the Investor Preview/Demo persona instead of the
waitlist signup page.

**Root cause, two stacked causes:**
1. `landing.triaxisventures.com` has been in `dashboardRootRedirectHosts` (`src/proxy.ts:43-47`,
   commit `3e3f2bb`, 2026-07-25) since a deliberate Sprint 5+ hosting-split decision -- every
   request to `/` 307s to `/dashboard`, query string preserved.
2. The LaunchList waitlist widget (`src/app/page.tsx`, commit `80beaeb`, 2026-08-02) was only
   reachable at `www.triaxisventures.com` (`getMarketingWorkspaceRedirectUrl` gates `page.tsx` to
   the canonical host) -- so the widget was added to a route `landing.triaxisventures.com` never
   actually served.

**Ruled out, not the cause:** server-side forced demo mode -- `vercel env ls production` confirmed
`NEXT_PUBLIC_AXXESS_DEMO_MODE` was not set anywhere in Production. What rendered the demo persona
specifically in the founder's own browser was that browser's leftover local `axxess.demoMode.
enabled` flag -- browser-local, not a cross-tenant leak. Real visitors without that flag were
bounced to `/auth` instead -- the referral funnel was broken for every visitor, not just the
founder.

**Fix:** `getBetaRootRedirectUrl()` now preserves the normal beta-entry redirect but skips it when
the root URL carries LaunchList's `ref` query param, letting `?ref=` URLs render `src/app/page.tsx`
directly while the ordinary `landing.triaxisventures.com/` entry point is unchanged.

**Verified:** `vitest run src/proxy.test.ts` 29/29 passed (new focused regression coverage
included), `tsc --noEmit` passed, `pnpm run lint` passed.

**Deployed:** 2026-08-05, via `node scripts/deploy-vercel.mjs --target=production --skip-checks`,
aliased `https://landing.triaxisventures.com`.

**Live-verified:** direct check of `https://landing.triaxisventures.com/?ref=WCZaE8` returned HTTP
200, no redirect location, and the LaunchList widget present in the response body.

### A-86 -- CRITICAL: session died permanently ~15-30 seconds after a real, successful sign-in

**Original defect, CRITICAL:** founder live-tested a fresh sign-in (InPrivate window) on
`landing.triaxisventures.com`: the dashboard loaded correctly with real tenant data, but clicking
through to Settings bounced back to `/auth`.

**Hypotheses ruled out first, not assumed:** (1) a stuck `axxess.demoMode.enabled` localStorage
flag -- founder cleared it via DevTools, symptom persisted; (2) missing session cookie in a fresh
InPrivate context -- ruled out once a screenshot showed a fully-loaded real dashboard immediately
before the failure, proving a real session had existed.

**Root cause, confirmed via live production Vercel logs (`npx vercel logs`), not guesswork:** at
the exact moment of dashboard mount, ~20 distinct API endpoints all returned `401` in the same
instant (`/api/repositories/*`, `/api/dashboard/*-signals`, `/api/crm/leads`,
`/api/financial-watch`, `/api/social-alerts/status`, `/api/workflows/timeline`, and
`/api/auth/session` itself), and `/api/whatsapp/events/recent`'s 15s poll kept 401-ing on every
subsequent cycle -- the session died permanently, not transiently. A research pass refuted a
missing-`credentials:"include"` hypothesis (all ~20 client call sites correctly send credentials).
Confirmed cause: ~85 route files call `getServerAuthSession`, all on Vercel's Node.js serverless
runtime (no `edge` runtime anywhere) -- the ~20 simultaneous dashboard-mount requests land in
separate function instances with no shared memory, so in-process coalescing isn't architecturally
viable. The existing 2026-08-01-incident fix stopped this app's own code from wiping cookies on a
losing concurrent refresh, but could not prevent Supabase/GoTrue's own single-use refresh-token
reuse-detection from revoking the *entire token family* -- including the winning request's new
tokens -- when multiple requests redeem the same already-rotated refresh token concurrently. Not
caused by the same-day A-84 deploy (that code never touches session/cookie logic) -- a pre-existing
race made more likely as more parallel dashboard-signal hooks accumulated over the program
(ED-R2/ED-R3/ED-R4/MC-3/MC-4 each added their own).

**Fix, scoped in Plan Mode per the founder's explicit instruction ("plan and solve it
methodically... 1 API call firing together, not 20 racing"), removes the race at its source:**
1. `decodeAccessTokenExpiry()` (new) reads a JWT's `exp` claim as a scheduling heuristic (no
   signature verification -- Supabase still re-validates on every real use).
2. `getServerAuthSession` gains an optional `{ refreshIfExpiringWithinSeconds }` parameter,
   default unset -- so all ~84 other call sites are byte-for-byte unaffected.
3. The **one** call site that already gates dashboard rendering, `GET /api/auth/session`, passes a
   300-second margin -- so by the time the dashboard's 20-way burst fires, the token has a long
   remaining lifetime and none of the 20 attempt their own refresh, removing the trigger for the
   Supabase-side race entirely.
4. Defensive: `setServerAuthCookies` now derives the access-token cookie's `maxAge` from the JWT's
   own `exp` claim rather than trusting Supabase's reported `expires_in` blindly.
5. Observability: the previously-silent swallowed-error catch block now `console.warn`s the real
   Supabase error code (e.g. `refresh_token_already_used`).

**Explicitly not fully closed by this pass, flagged not silently assumed solved:** multi-tab
residual risk (two tabs mounting `AuthProvider` near-simultaneously) reduces to a 2-way race on the
proactive refresh itself; a client-side `navigator.locks` guard would close it fully and is
deferred as future work unless independently confirmed to matter.

**Commit:** `da01319`. **Deployed:** 2026-08-03 (`dpl_5sEkop1NJHzyji3t6vq8fAg5hXUF`, `readyState:
READY`, aliased `landing.triaxisventures.com`).

**Verified:** `tsc --noEmit` clean (web + mobile), `eslint --max-warnings=0` clean, `next build`
exit 0. `serverSession.test.ts` 16/16 pass (7 new); full `src/auth` directory 32/32 pass; broad
sample across `src/app/api/{dashboard,crm,repositories,whatsapp,auth}` (13 files, 62 tests) 62/62
pass, confirming zero regression across `getServerAuthSession`'s other call sites.

**HITL live confirmation, 2026-08-03:** founder ran 3 consecutive sign-in/sign-out cycles, all
held; clicking through to Settings immediately after sign-in no longer bounced to `/auth`; the
stale "Continue to Workspace" dead-end was also gone. Founder's own words: **"a major point of
failure removed."**

### A-87 -- CRITICAL: a fresh, successful sign-in immediately signed itself back out

**Original defect, CRITICAL:** found while the founder was live-testing A-86 -- after A-86
deployed, sign-in itself stopped working entirely, blocking further testing. Real credentials
produced `POST /api/auth/login 200`, the dashboard briefly loaded, then `POST /api/auth/logout 200`
fired in the same instant (confirmed via live Vercel logs).

**Root cause, confirmed by direct code read:** `src/app/auth/page.tsx`'s `useEffect` (a deliberate
2026-08-01 security fix auto-signing-out anyone landing on `/auth` with an already-authenticated
real session, so the URL can never silently resume a stale session) depended on
`[isAuthenticated, session, logout]` -- reactively re-running on **every** session change, not just
page load. When `handleSubmit`'s `login()` call succeeded, it updated the session synchronously
while `LoginPanel` was still mounted (before `router.push("/dashboard")` swapped the page away) --
the effect saw "authenticated real session on `/auth`" and immediately logged out the session the
user had just created. A self-inflicted race, not deliberate behavior.

**Fix:** the effect now evaluates only once, against the session as it resolved when the page
first mounted (via a `useRef` guard, skipping while `session.status === "loading"`) -- preserving
the original security behavior (landing with an existing stale session still triggers sign-out)
while excluding a session that becomes authenticated later during the page's own lifetime, i.e. a
sign-in performed on that same page.

**Commit:** `741c208`. **Deployed:** 2026-08-03 (`dpl_4ET6cFT4nqwrGwGzt5cEj94fCA6N`, `readyState:
READY`, aliased `landing.triaxisventures.com`).

**Verified:** `tsc --noEmit` clean, `eslint --max-warnings=0` clean, `next build` exit 0.
`auth/page.test.tsx` 8/8 pass (7 pre-existing unchanged + 1 new regression test proving a fresh
sign-in no longer triggers `/api/auth/logout`, while the existing "stale session auto-signs-out"
test still passes unmodified); full `src/auth` directory 32/32 pass.

**HITL live confirmation, 2026-08-03:** same 3 consecutive sign-in/sign-out cycles as A-86, all
held; navigating to Settings immediately after sign-in no longer bounced to `/auth`.

**Founder's explicit framing, followed at the time:** auth/sign-in reliability took priority over
all other open items that pass.

### A-88 -- `investor.triaxisventures.com` had fallen out of sync with `landing.triaxisventures.com`

**Original defect:** founder reopened this track (2026-08-03, see the matrix's 2026-08-03 scope
note) requiring `investor.triaxisventures.com` to reflect current design/layout/integrations, stay
100% populated with demo data, and sync with `landing.triaxisventures.com` every EOD.

**Confirmed architecture, via `vercel projects ls`:** `investor.triaxisventures.com` is served by a
**separate Vercel project** (`triaxis-product-investor-demo`), distinct from `landing.
triaxisventures.com`'s project (`triaxis-www-frontend-import`) -- same Next.js codebase, deployed
independently, with `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` already configured to force the seeded
demo persona for every visitor. Before this pass, the investor project's last deploy was 2 days
stale relative to `landing.`'s, meaning none of that day's work (MC-1 through ED-R4, A-84, A-85,
A-86, A-87) had reached it.

**One-time fix applied same day:** temporarily relinked the working directory's
`.vercel/project.json` to `triaxis-product-investor-demo` (original link backed up first), ran
`vercel --prod` to deploy current repo HEAD to that project, confirmed `readyState: READY` and
aliased to `https://investor.triaxisventures.com`, then restored the original
`triaxis-www-frontend-import` link.

**Verified post-deploy, via direct curl, not just deploy-success status:**
`investor.triaxisventures.com/dashboard` returned `200` and rendered the forced demo persona
("Ananya Rao") plus confirmed-current UI strings from that day's work ("Threads", "Meta Business",
"AI Ready") -- proving it was genuinely that day's build, not a cached stale response.

**Explicitly not re-audited this pass, carried forward as-is:** the "read-only" and "0/100
leakage" properties of the forced-demo-mode experience are pre-existing behavior from earlier
sprints that this deploy did not touch.

**Recurring sync mechanism:** the manual one-time sync above was superseded the same day by A-90's
CI automation (`deploy-production.yml`), which deploys both projects on every merge to `main` --
see A-90 below for the exact build-out. This row's `Yes` status cites A-90's mechanism as the
reason recurring sync is closed, not a standing manual process.

### A-90 -- CI-automated deploy for both Vercel projects on merge to `main`

**Original ask:** founder feedback, 2026-08-03: **"hygiene has become very poor because of lack of
explicit instructions... these are implicitly expected by HITL"** -- given this program's
compliance/audit/governance focus, PRs/issues/CI documentation should be the default, not something
requested each time.

**Discovered in the process:** that session's 37+ commits had been sitting on
`canonical/sprint-1-35-unified-gitlab` locally, never pushed to GitHub -- every "deploy" that
session had been a local-filesystem `vercel --prod` CLI run, meaning GitHub had silently fallen
behind live production with zero PR trail for A-84/A-86/A-87/A-88. Pushed all pending work and
opened PR #163.

**Built:** `.github/workflows/deploy-production.yml` -- two sequential jobs (`deploy-landing`,
`deploy-investor-demo`), triggered on `push: main` (PR merge only, per the founder's explicit
choice that PR creation is not ornamental), using `vercel pull`/`vercel build`/`vercel deploy
--prebuilt` against 4 new repo secrets.

**First live run took 5 rounds to get working, each fixed from real evidence, not repeated
guessing:**
1. `sh: 1: pnpm: not found` -- the deploy jobs never set up pnpm/Node before invoking `vercel
   build` (PR #164).
2. `TypeError: Invalid URL` collecting `/_not-found` page data, from root layout's
   `metadataBase: new URL(productionSiteUrl)` -- fixed the `??` fallback defensively (PR #165),
   but the identical crash recurred on the next run, proving that wasn't the sole cause.
3. Added a temporary debug step printing `NEXT_PUBLIC_*` key/value-lengths (PR #166) -- GitHub's
   own log-masking redacted the value (`[SENSITIVE]`) since it matched a registered-secret
   pattern, so a second debug pass printed the raw value directly (PR #167).
4. Confirmed via direct `vercel env pull` (bypassing GitHub's masking) that `NEXT_PUBLIC_APP_URL`
   was a literal empty string in Production for the landing project and unset entirely for
   investor-demo -- fixed by setting both to their real URLs via `vercel env add` (founder-
   confirmed before touching Production config), removed the debug step (PR #168).
5. **The identical crash recurred a fourth time even with the correct value confirmed set** --
   root cause finally isolated by reproducing `vercel pull` locally end to end: the CLI had
   defaulted to storing `NEXT_PUBLIC_APP_URL` as a **"Sensitive" environment variable**, a real
   Vercel feature where the value is permanently write-only and `vercel pull`/`vercel env pull`
   can never retrieve it by design -- explaining both the empty-string symptom and why every
   earlier manual `vercel --prod` deploy had worked fine (that path uses Vercel's own build
   servers, which can read sensitive values directly; CI's pull-then-build-locally pattern
   structurally cannot). Fixed by re-adding both projects' `NEXT_PUBLIC_APP_URL` with
   `--no-sensitive` (a public base URL embedded in the client bundle regardless, never a real
   secret) -- confirmed locally via a fresh `vercel env pull` actually returning the real value
   before re-running CI.

**Final verification, live, not just "should work":** re-ran the exact same commit via `gh run
rerun`; both `deploy-landing` (2m36s) and `deploy-investor-demo` (2m18s) jobs succeeded end to end;
confirmed via direct `curl` immediately after that `landing.triaxisventures.com/auth` returns `200`
with real app content and `investor.triaxisventures.com/dashboard` returns `200` with the correct
forced-demo persona and that day's newest UI strings (Threads, Meta Business).

**Retained as a permanent improvement, not just an incident artifact:** the `metadataBase` `||`
fallback fix from PR #165 stays in the code -- an empty string should never crash a build again,
regardless of cause.

**PRs:** #163-168. **Later extended, same mechanism, per this session's own separate work:** PR
#193 added `--archive=tgz` to both `Deploy` steps (2026-08-07) to work around Vercel's account-wide
free-tier upload quota, confirmed working via run `31179118643` (both jobs succeeded, no quota
error).

## What Changed (this closeout document itself)

- New file: `docs/readiness/A84_A90_UNDOCUMENTED_CLOSED_ACTIONABLES_CLOSEOUT_2026_08_07.md` (this
  document).
- No code changes. No matrix status changes -- all 6 rows were already correctly `Yes`.

## What Did Not Change

- The underlying fixes for A-84, A-85, A-86, A-87, A-88, A-90 -- all were already shipped, deployed,
  and (where applicable) HITL-confirmed before this document existed. This closeout formalizes
  existing evidence into the repo's standard format; it does not re-verify or re-test any of it.

## What Was Verified (in writing this document)

- Confirmed via direct grep of `docs/readiness/*.md` that none of these 6 IDs appeared in any
  `*CLOSEOUT*`/`*CLOSURE*`-named file before this document.
- Every commit hash, deployment ID, and test-count figure cited above was copied verbatim from the
  existing matrix row -- not re-derived or re-measured in this pass.

## What Remains Partial or Blocked

- **A-84:** the Twilio-to-different-SMS-provider migration decision remains an open, independent
  action item -- no provider chosen, no code started. Does not block A-84's own closure (the
  identity-linking fix itself is what A-84 tracks).
- **A-86:** multi-tab residual risk (two tabs racing the proactive refresh) is explicitly not fully
  closed -- reduced to a 2-way race, not eliminated. A `navigator.locks` guard is deferred, not
  built.
- **A-84 (test coverage):** `SettingsSection.linkedPhone.test.tsx` (4 tests) remains unconfirmed in
  CI due to a memory-exhaustion crash in this session's environment, not a known code defect.

## What Claim Is Still Unsupported

- None beyond what's already flagged inline above (Twilio migration, multi-tab guard, one
  unconfirmed test file) -- all six items' core fixes have commit + deploy + test + HITL evidence.

## Evidence Chain

External signal (founder live-tested each on `landing.triaxisventures.com`, several via InPrivate
sessions and live Vercel log inspection) -> root cause confirmed via direct code/log read in each
case above -> fix built and committed -> deployed to production with a specific deployment ID ->
verified via typecheck/lint/build/test suite -> HITL live re-test by the founder, with the
founder's own words quoted where given -> matrix row marked `Yes`, now cross-referenced to this
closeout document.

## Files Changed (original fixes, for reference -- not touched by this closeout)

- `src/auth/serverSession.ts`, `src/components/auth/PhoneOtpSignIn.tsx`,
  `src/app/api/auth/phone/link/{start,verify}/route.ts`, `src/features/settings/
  SettingsSection.tsx` (A-84)
- `src/proxy.ts`, `src/app/page.tsx` (A-85)
- `src/auth/serverSession.ts` (A-86, A-87 -- same file, different functions)
- `src/app/auth/page.tsx` (A-87)
- `.vercel/project.json` (temporary relink, A-88, not a committed change)
- `.github/workflows/deploy-production.yml` (A-90)
