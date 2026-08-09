# Closeout -- PostHog Production Analytics Audit (A-105, A-106, A-107, A-108)

Date: 2026-08-08
Governance source: `CLAUDE.md` evidence-chain discipline
Status: **A-108 closed (`Yes`), live-verified.** A-105, A-106, A-107 remain open (`No`), logged with full
evidence, root cause not yet remediated for any of the three.

## Why This Document Exists

The founder shared 8 PostHog dashboard URLs and asked for real production analytics to be pulled and
analyzed, with one explicit, must-preserve instruction repeated throughout this work: **PostHog was
wired into the product on 2026-07-27 -- no data exists before that date, and every analysis below is
scoped to that window.** What started as a data-extraction task surfaced three real, previously-untracked
production defects (A-105/106/107) and one real analytics blind spot (A-108, now closed) -- this document
consolidates the full investigation trail so the evidence chain from "founder asked for insight" to
"matrix rows logged and one item verified fixed" is traceable in one place, per this repo's standing
discipline rather than left scattered across chat.

## What Was Investigated

### 1. Data extraction methodology

Two PostHog sources were used, both under project `498426`:

- **Public shared dashboard** ("Landing Pages Report," `/shared/r9vSMttfj1QbkQDo1DvHJ1oiG8bdsA`, no login
  required): read via the page's own embedded `POSTHOG_EXPORTED_DATA` JSON payload (not screenshots --
  screenshot capture was failing in this environment at the time), giving exact numeric results per
  panel.
- **Authenticated Web Analytics** (`/project/498426/web` and sub-tabs): after the founder logged in via
  GitHub OAuth directly in this session's own isolated Browser pane (their real Chrome session does not
  share cookies with it), pulled real query API responses (`WebOverviewQuery`, `WebStatsTableQuery`,
  `TrendsQuery`, `ErrorTrackingQuery`, `RetentionQuery`) directly from the network log, and later via
  direct authenticated `fetch()` calls against PostHog's own HogQL query API (with CSRF token handling)
  for filtered, row-level event data no dashboard panel exposed on its own.

**Cross-corroboration of the 2026-07-27 wiring date:** the raw daily trend data showed exactly zero
pageviews every day from 2026-07-09 through 2026-07-26, then real, non-zero numbers starting exactly
2026-07-27 -- independently confirming the founder's stated date from the data itself, not just repeating
the claim. The dashboard's own `last_modified_at` timestamp (`2026-07-27T08:59:06Z`) agreed.

### 2. Audience-context correction (material, changes how every finding below should be read)

Initial framing assumed `landing.triaxisventures.com` traffic was a mix of internal/team/public visitors.
The founder corrected this directly: **`landing.triaxisventures.com` has only ever been shared with
investors, mostly Y Combinator** -- it is not a public URL. **`investor.triaxisventures.com` is the
actual public-facing domain**, despite the naming suggesting the reverse. This correction was applied
retroactively to A-105/106/107 (each now carries an explicit "Audience correction" note) and directly
motivated the discovery of A-108.

## What Was Found

### A-105 -- Severe LCP regression (18.54s)

PostHog Web Vitals (`/project/498426/web/web-vitals`, last 7 days) showed **LCP 18.54s** (PostHog's own
"Poor" threshold is >4s), against INP 40ms, CLS 0.04, FCP 2.18s -- all otherwise healthy. Given only
~12 days of real traffic exist in total, this sits on a small sample and may reflect a single slow
outlier rather than a systemic issue; root cause not yet investigated. Logged `No -- (net-new work, root
cause not yet investigated)`.

### A-106 -- Live React hydration error

PostHog Error Tracking showed one active issue, **"Minified React error #418"** (a hydration mismatch),
**6 occurrences, 3 sessions, 2 distinct users**, first seen 2026-08-02T15:54:52Z, last seen
2026-08-05T01:26:11Z, source `/_next/static/chunks/1tvi_kjwevoeb.js`. Possibly related: `/dashboard`
recorded 6 frustrating-page events (rage/dead clicks + errors) in the same window vs. 1 in the prior
period -- not confirmed as the same root cause. Logged `No -- (net-new work, root cause not yet
investigated)`.

### A-107 -- Real Google OAuth exchange failure

The shared dashboard's "Most Popular Landing Pages" panel surfaced a real failure URL --
`/auth/login?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code...`
-- appearing **3 times** in the top-25 landing pages for the full window. This indicates the OAuth
authorization-code exchange step failed server-side (Supabase <-> Google), not a user cancellation.
Distinct from the already-closed A-97 (Gmail connector flow) -- this is the primary sign-in-with-Google
path. Logged `No -- (root cause not yet investigated, newly discovered)`.

### A-108 -- `investor.triaxisventures.com` had zero analytics coverage (now closed)

Given the audience correction above, the question became: is the *actual* public domain even being
measured? It was not. Live inspection of `https://investor.triaxisventures.com` found:

- The bundle referenced PostHog (`PostHogSessionReplayInit` present as a Next.js RSC chunk), but
  `window.posthog` was `undefined` at runtime and no ingestion request appeared in the network log.
- **Root cause, confirmed via source-code investigation, not guesswork:** `PostHogSessionReplayInit.tsx`
  and `instrumentation-client.ts` both gate `posthog.init()` purely on
  `process.env.NEXT_PUBLIC_POSTHOG_KEY` being present -- no hostname/domain check exists anywhere in the
  analytics code (confirmed via targeted grep across `src/services/analytics/`).
  `landing.triaxisventures.com` and `investor.triaxisventures.com` are **two entirely separate Vercel
  projects** (`triaxis-www-frontend-import` vs. `triaxis-product-investor-demo`), each with independently
  configured environment variables. The key was set on one project and absent from the other -- the exact
  class of bug this repo's own docs warn about elsewhere ("the env var must never be copied blindly
  between projects").
- **No code fix existed for this** -- the fix was a Vercel-dashboard environment-variable addition, which
  this session could not perform (no Vercel CLI authentication available in this environment; this is
  account configuration requiring the founder's own access).
- The exact live value of `NEXT_PUBLIC_POSTHOG_KEY` was extracted directly from `landing.triaxisventures.com`'s
  own public client bundle (`phc_tUWJeWYsZmyiCBrUCHGrnTT3BQEEAxFeaJFfN7STjd5E` -- a write-only public
  project token, not a secret) and handed to the founder as an exact copy-paste value, along with
  confirmation that no separate `NEXT_PUBLIC_POSTHOG_HOST` was needed (the app's `/ingest` reverse-proxy
  rewrites already live in the shared `next.config.mjs`, deployed identically to both projects).
- **Founder added the variable and redeployed.** Re-verified live, same session: `_POSTHOG_REMOTE_CONFIG`
  now populated with the real token, and a live network capture showed
  `POST /ingest/i/v0/e/ -> 200 {"status":"Ok"}` -- a real event sent and accepted -- plus
  `posthog-recorder.js`, `web-vitals.js`, `dead-clicks-autocapture.js`, `exception-autocapture.js`, and
  `surveys.js` all loading successfully with the real token. (`window.posthog` itself remained undefined
  throughout, including post-fix -- expected, since this codebase initializes PostHog via a direct
  ES-module import rather than the window-snippet install; the network-level proof is the load-bearing
  evidence, not the window global.)

**Status changed `Blocked` -> `Yes`, 100% (live network confirmation).**

## Supplementary Investigation -- US-Segment Traffic (Not Logged as a Separate Actionable)

Because the founder specifically asked whether US-based sessions on `landing.triaxisventures.com`
(understood to be substantially Y Combinator) showed genuine engagement, session-level data was pulled
for the full real-data window (2026-07-27 to 2026-08-08). This is recorded here for completeness but was
**not** turned into its own matrix row, since it is investigative context rather than a defect with a
required-evidence criterion.

- **4 pageview events total** matched `Country name = United States`, at exactly two timestamps:
  2026-08-02 (Sunday) ~15:54-15:55 UTC (3 events) and 2026-08-04 (Tuesday) ~15:51 UTC (1 event).
- **One session (Mac OS X, Chrome, `/auth`, 15:54:28 UTC) shows clear, deliberate human behavior**: a
  27-second dwell, a tab-switch away and back, then a targeted click on "Continue with Google" -- very
  plausibly the direct origin of one of the three A-107 OAuth failures.
- **Two sessions (both Windows, Chrome, `/auth/sign-up` and `/auth/forgot-password`) landed 15 milliseconds
  apart** with zero clicks and zero keystrokes on either -- a gap too small for manual human navigation
  between two different URLs. This is consistent with either two tabs opened together, or an automated
  email-security link scanner (a well-documented pattern: same generic fingerprint, near-simultaneous,
  zero interaction). **Not resolved either way** -- flagged as genuinely ambiguous, not asserted as either
  human or bot.
- **A fourth session (Linux, Chrome, 2026-08-04) hit the raw Vercel deployment URL
  (`triaxis-www-frontend-import.vercel.app`) directly**, not the custom domain -- unusual for an organic
  visitor. No session recording was captured for it, so no interaction data exists to judge it by.
- A Supabase cross-reference (checking `auth.users`/`auth.audit_log_entries` for signup/recovery activity
  in the same windows) was attempted with the founder's explicit, repeated authorization, but was blocked
  twice by this environment's automated safety classifier (elevated service-role-key database access is
  gated as a distinct risk tier requiring a settings-level permission change, not just in-chat
  confirmation) -- **this cross-reference was never completed.**

**Honest summary given to the founder:** one confirmed real human (the Google sign-in attempt); the other
three are genuinely ambiguous, and the data does not support rounding that up to "4 real people showed
interest."

## What Changed

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`: four new rows added (A-105, A-106, A-107, A-108);
  A-105/106/107 each carry an audience-correction addendum; A-108 closed `Blocked` -> `Yes`.
- `investor.triaxisventures.com` (Vercel project `triaxis-product-investor-demo`): `NEXT_PUBLIC_POSTHOG_KEY`
  environment variable added by the founder and redeployed. This was a founder-performed action, not a
  code change in this repository -- no commit in this repo contains that key.
- New file: `docs/readiness/POSTHOG_PRODUCTION_ANALYTICS_AUDIT_CLOSEOUT_2026_08_08.md` (this document).

## What Did Not Change

- No application code changed in this repository as part of A-108's fix -- confirmed no hostname-gating
  code exists and none was added; the fix was purely a missing environment variable on one of two
  independently configured Vercel projects.
- A-105, A-106, and A-107 remain **unfixed**. This closeout documents their discovery and evidence, not
  their resolution.

## What Was Verified

- A-108: live, post-fix, in this session -- `_POSTHOG_REMOTE_CONFIG` populated with the real token, and a
  real ingestion POST accepted with `200 {"status":"Ok"}`, plus five separate PostHog static assets
  (session replay, web vitals, dead-clicks, exception, surveys) all loading successfully.
- The 2026-07-27 PostHog-wiring date: independently corroborated via raw daily trend data (flat zero
  before, real numbers after) and the shared dashboard's own `last_modified_at` timestamp.
- A-105/106/107's underlying numbers: read directly from PostHog's own rendered panels and/or raw API
  responses in this session, not estimated or reconstructed from memory.

## What Remains Partial or Blocked

- **A-105, A-106, A-107**: all three remain open, logged with evidence, root cause not yet investigated
  for any of them. None are scoped or fixed by this closeout.
- **The US-segment Supabase cross-reference**: never completed. Blocked twice by this environment's
  automated safety classifier on elevated database access; would need either a settings-level permission
  change or the founder running the queries directly in Supabase's own SQL editor.
- **The two near-simultaneous Windows sessions' true nature** (two tabs vs. automated scanner): genuinely
  unresolved, flagged rather than guessed at.

## What Claim Is Still Unsupported

- Whether the two ambiguous Windows sessions represent one or two additional real humans: not established
  either way, explicitly not claimed as either.
- Whether the Mac session's failed Google sign-in (A-107) and this specific US visitor are the same
  event: plausible given matching timing and behavior, but not independently confirmed (no session-level
  identity link exists between the OAuth-failure landing-page count and this specific replay).
- No root cause is claimed for A-105, A-106, or A-107 -- each is logged as discovered, not diagnosed.

## Evidence Chain

Founder-supplied PostHog URLs and standing wiring-date instruction (2026-08-08) -> data pulled from two
independent PostHog sources (public shared dashboard, authenticated Web Analytics + raw query API) ->
three new production defects discovered and logged with full evidence (A-105, A-106, A-107) -> founder's
audience-context correction applied retroactively -> analytics blind spot on the actual public domain
discovered and root-caused via source-code investigation (A-108) -> exact fix handed to the founder as a
copy-paste value (extracted from the working domain's own public bundle, not guessed) -> founder performed
the fix -> live network-level re-verification in this same session confirmed a real event accepted by
PostHog's servers -> matrix updated to close A-108 -> this document written to preserve the full trail.

## Files Changed

- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-105, A-106, A-107, A-108 rows)
- `docs/readiness/POSTHOG_PRODUCTION_ANALYTICS_AUDIT_CLOSEOUT_2026_08_08.md` (new, this document)

## Commits

- `0dc6256` -- log 3 new PostHog-sourced findings (A-105, A-106, A-107)
- `a697bba` -- correct audience context on A-105/106/107, add A-108
- `84c020a` -- confirm A-108 root cause (missing env var on investor-demo Vercel project)
- `95d9d08` -- close A-108, live-verified
