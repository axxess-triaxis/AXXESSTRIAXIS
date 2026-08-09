# Root Cause Analysis -- A-105 (LCP), A-106 (Hydration Error), A-107 (Google OAuth Exchange Failure)

Date: 2026-08-09
Governance source: `CLAUDE.md` evidence-chain discipline
Status: **Code-level root causes identified for all three, via direct source reading, not inference from
symptoms alone. None reproduced live against the production URL in this pass, and no fix has been
applied or deployed -- this is diagnosis only. Status on all three rows stays below `Yes`.**

## A-106 -- React Hydration Error ("Minified React error #418")

**Confidence: high.** This is a confirmed, structural code defect, not a hypothesis.

**Root cause:** `isDemoModeEnabled()` (`src/demo/demoMode.ts:66-70`) returns a different answer depending
on when it runs relative to hydration:

```ts
export function isDemoModeEnabled() {
  if (isDemoModeForcedByEnv()) return true;
  if (typeof window === "undefined") return false;   // server render: always false
  return window.localStorage.getItem(demoModeStorageKey) === "true";  // client: reads localStorage
}
```

On the server, `window` is undefined, so this always returns `false` (unless demo mode is
env-forced -- a build-time constant, identical on server and client, so that branch is not the issue).
On the client's *first* render -- the hydration pass, which React requires to exactly match the
server-rendered HTML -- `window` already exists, so the function immediately reads
`window.localStorage.getItem("axxess.demoMode.enabled")`. For any visitor whose browser previously had
this flag set to `"true"` (e.g. from an earlier Investor Preview / guided-demo session -- this flag is
never expired or cleared automatically, per `demoMode.ts`'s own comments) and who is *not* currently on
an env-forced-demo deployment, the server renders the real-tenant tree while the client's hydration pass
computes the demo tree -- two different subtrees, which is exactly what React error #418 means
("Hydration failed because the initial UI does not match what was rendered on the server").

**Confirmed call sites, read directly in `src/features/dashboard/DashboardSection.tsx`:**
- Line 281: `const demoMode = isDemoModeEnabled();` -- called directly in the render body, not gated
  behind `useEffect` or a mounted-state flag. Used to branch entire JSX subtrees, e.g. the "Recent
  institutional activity" panel: `demoMode ? <ActivityFeed items={demoRecentActivity} /> : workflowTimeline.timeline.length > 0 ? <ActivityFeed items={workflowTimeline.timeline.map(...)} /> : <EmptyState .../>` (lines 373-389) -- a structurally different tree, not just different text.
- Line 181: `useState<DashboardProject[]>(() => (isDemoModeEnabled() ? getDashboardFallbackProjects() : []))` -- the same divergence seeds initial component state differently between the server render and the client's hydration-time initializer call.

**Why this matches the PostHog evidence:** the error's source chunk (`/_next/static/chunks/
1tvi_kjwevoeb.js`, per A-106's existing PostHog Error Tracking entry) is consistent with
`DashboardSection` being loaded as its own async chunk -- it's registered via `React.lazy(() =>
import("../../features/dashboard/DashboardSection")...)` in `src/app/routing/lazyRoutes.tsx:9`, so a
hydration failure inside it would indeed surface from a separate, minified route chunk rather than the
main bundle.

**Not yet done:** live reproduction (load `/dashboard` as a real authenticated user in a browser whose
`localStorage` has `axxess.demoMode.enabled=true` set from a prior demo/preview visit, confirm the
console error fires), and no fix has been written. The fix shape is fairly contained --
`isDemoModeEnabled()`'s divergent branch would need to be resolved post-mount (e.g. seed `demoMode` via
`useState(false)` + `useEffect` to read the real value only after the client has mounted, accepting one
extra render pass, the standard React fix for this exact class of bug) -- but per this repo's evidence
discipline, an unimplemented fix is not claimed as done here.

## A-107 -- Google Sign-In OAuth Exchange Failure

**Confidence: high that this is a recurrence of an already-diagnosed defect class, not a new one.**

**A-73 already root-caused and fixed the identical error text** ("Unable to exchange external code,"
`error_code=unexpected_failure`) on 2026-07-29: the Google Client ID/Secret stored in Supabase
Dashboard -> Authentication -> Providers -> Google was mismatched against the actual Google Cloud OAuth
Client. Founder corrected it same day and confirmed a full sign-in completing end to end ("Credential
mapping was wrong" -- founder's own words). A-73's status is `Yes (founder-confirmed live)`, 90%
confidence.

**A-107's own evidence includes a dated occurrence *after* that fix.** The specific session-replay entry
already recorded in A-107's row shows a real "Continue with Google" click at **2026-08-02 15:54:28
UTC** -- four days after A-73's 2026-07-29 fix -- landing on the exact same
`error_code=unexpected_failure` / "Unable to exchange external code" redirect. This was not previously
cross-referenced against A-73 in A-107's own write-up (A-107 only distinguishes itself from A-97, a
different connector-flow row, not from A-73, the row that already diagnosed this identical error text).

**What this implies:** either (a) the 2026-07-29 credential correction did not fully or permanently
hold -- Supabase dashboard credential fields are not version-controlled or monitored from this
repository, so a later accidental re-edit, rotation, or partial revert would be invisible here -- or (b)
this class of failure (Supabase's server-to-server token exchange with Google) has a genuinely
intermittent cause (e.g. a transient Google-side error, or Supabase-side rate limiting/timeout) distinct
from the specific static misconfiguration A-73 found and fixed, meaning A-73's fix was correct for its
own instance but did not preclude every future occurrence. Both are plausible; this pass cannot
distinguish between them without either a fresh live reproduction or Supabase Auth Logs access (not
available from this environment, same limitation already noted in A-73's own row).

**Not yet done:** re-checking the current Supabase Google provider Client ID/Secret against the Google
Cloud Console values (the same HITL action A-73 originally required), and determining whether the other
2 of the 3 total occurrences in A-107's 30-day PostHog window fall before or after 2026-07-29 (their
exact dates were not captured in the original PostHog pull -- would need re-querying the shared dashboard
with per-event timestamps, not just the aggregate top-25 count).

## A-105 -- Largest Contentful Paint Regression (18.54s, "Poor")

**Confidence: leading candidate, not confirmed via reproduction.** Unlike A-106, this is not a smoking
gun -- LCP has many possible contributing causes, and only one was checked and found genuinely
anti-pattern-shaped in this pass.

**Leading candidate: Google Fonts loaded via a render-blocking CSS `@import`, not `next/font`.**
`src/styles/fonts.css` (the first file `src/styles/index.css` imports) is exactly one line:

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:...&family=JetBrains+Mono:...&display=swap');
```

No `next/font/google` usage exists anywhere checked in this pass, and no `<link rel="preconnect">` /
`<link rel="stylesheet">` hint exists in `src/app/layout.tsx` either -- the font is pulled in via the
least-optimized of the three options Next.js supports. A CSS `@import` to an external stylesheet forces
a serialized fetch waterfall before web-font text can render: the browser must first receive and parse
the page's own CSS, discover the `@import`, fetch `fonts.googleapis.com`'s CSS response, parse *that* to
discover the actual `.woff2` URLs, then fetch those -- three-plus sequential round trips, none of which
can start until the previous one resolves, all before any text styled with these fonts can paint. This
is a well-documented, specifically-named Core Web Vitals anti-pattern (Next.js's own docs recommend
`next/font` specifically to eliminate this waterfall by self-hosting fonts at build time with no runtime
request to Google at all).

**Why this is a "leading candidate," not a confirmed sole cause:** an 18.54s LCP is extreme enough that
a font-loading waterfall alone (typically costing low hundreds of milliseconds to a couple of seconds,
not 18+) is unlikely to fully explain it by itself. Other candidates named in A-105's own original entry
(large hero asset, chart-library bundle size, cold serverless start) were not ruled in or out in this
pass -- `DashboardSection.tsx` does import `recharts` (`Area, AreaChart, Bar, BarChart, CartesianGrid,
ResponsiveContainer, Tooltip, XAxis, YAxis`) directly, a known heavy dependency, but the landing/auth
pages a first-time visitor actually lands on were not individually audited for their own bundle
composition in this pass. A cold Vercel serverless function start (adding to Time to First Byte, which
LCP is measured from) also was not ruled out -- this repository has no visibility into Vercel's own
cold-start telemetry.

**Not yet done:** a direct Lighthouse or WebPageTest run against the live URL to get a stage-by-stage
waterfall (was time spent in TTFB, font fetch, JS execution, or image decode?) -- the only way to move
this from "one credible candidate" to a confirmed, ranked root cause. Recommended before any fix is
attempted, so effort isn't spent optimizing a factor that turns out to be a minor contributor next to,
say, a cold-start-dominated TTFB.

## Addendum, 2026-08-09 (same day) -- Live Follow-Up Investigation on A-105 and A-107

Per founder request to investigate A-105 and A-107 further (after A-106 was fixed, see
`docs/readiness/A106_HYDRATION_FIX_CLOSEOUT_2026_08_09.md`), this session used the Browser pane to pull
live evidence directly from `landing.triaxisventures.com`, rather than relying on static code reading
alone.

### A-105 -- new finding: a real, measured 2-hop redirect chain, with strong cold-vs-warm variance

Loading `https://landing.triaxisventures.com/` as an anonymous visitor triggers **two sequential HTTP
redirects** before any page content begins loading, confirmed both via the Navigation Timing API
(`performance.getEntriesByType("navigation")[0].redirectCount === 2`) and by reading
`src/proxy.ts`: `/` first hits `getMarketingWorkspaceRedirectUrl()` (redirects to `/dashboard`), then a
second, separate middleware invocation on `/dashboard` hits the protected-route auth gate (no session
cookie present) and redirects again to `/auth?next=%2Fdashboard` -- the actual first meaningful content
an anonymous visitor sees. Each hop is a full client-server round trip, not a single internal rewrite.

**Measured, not estimated:**
- **First load this session:** `redirectStart` to `redirectEnd` spanned **~1,712ms** just for the
  redirect chain; `domContentLoadedEventEnd` landed at ~4,149ms; `loadEventEnd` at ~7,628ms. TTFB after
  the redirects resolved was fast (~68ms), and the initial HTML document itself was tiny (~4KB) -- the
  slowness was concentrated in the redirect chain and in a subsequent ~1.6-second gap between the HTML
  finishing and the first CSS/JS chunk starting to load, not in the document response itself.
- **Warm reload, same session, moments later:** the identical navigation completed in **~929ms total**
  (`redirectCount` still 2, but the chain itself only cost ~248ms this time; `domContentLoadedEventEnd`
  ~541ms; `loadEventEnd` ~929ms) -- roughly **8x faster** than the first load.

**Interpretation:** this ~8x cold-vs-warm gap is a much stronger, more directly measured candidate for
the PostHog-reported 18.54s "Poor" LCP than the font-`@import` finding alone -- every real first-time
visitor (which is what a YC evaluator or new pilot user always is, by definition) experiences the cold
path, not the warm-reload path this session's second measurement captured. The font-`@import`
anti-pattern from the original RCA remains real and unfixed, but is likely a smaller, compounding
contributor rather than the dominant cause -- the redirect-chain latency and the cold-start gap before
JS/CSS begin loading are better explanations for a multi-second-to-double-digit-second LCP outlier.

**Not established:** an exact live LCP value -- `performance.getEntriesByType("largest-contentful-paint")`
and `getEntriesByType("paint")` both returned empty arrays in this automated Browser pane session across
two attempts, a real tooling limitation (Paint Timing entries did not fire in this environment) rather
than a claim that LCP itself is fine. The redirect-chain and cold/warm timing numbers above are
independently real regardless of this gap. Also not established: whether the 2-hop redirect chain is
itself collapsible into one (e.g., `getMarketingWorkspaceRedirectUrl()` could check for a session cookie
and redirect straight to `/auth?next=%2Fdashboard` when absent, instead of bouncing through `/dashboard`
first) -- a plausible, contained fix, not implemented in this investigation-only pass.

### A-107 -- new finding: the outbound leg to Google is confirmed healthy right now

Clicked "Continue with Google" live on `landing.triaxisventures.com/auth` (read-only observation, no
credentials entered, per this session's standing rule against handling login credentials). The browser
tab correctly navigated to `accounts.google.com` and rendered a normal, valid Google sign-in prompt --
"Sign in to continue to `vnliomnfabaicvvvfwia.supabase.co`" -- with no `Error 400: invalid_client` or
similar Google-side rejection, which is what a wrong or revoked **Client ID** would produce immediately
at this stage.

**Interpretation:** this narrows, without fully resolving, the two hypotheses from the original RCA. A
currently-wrong Client ID is now less likely, since Google is actively accepting it and presenting a
normal consent flow. This does not rule out a wrong or drifted **Client Secret**, since the secret is
only used in the later server-to-server code-exchange step (Supabase <-> Google), which never triggers
from this outbound leg alone and cannot be observed without completing a real sign-in.

**Not established, and could not be established without entering credentials (prohibited):** whether the
actual token-exchange step -- the specific step A-107's original PostHog evidence shows failing -- still
fails today. This would require either the founder completing a real, live sign-in and reporting the
result, or re-pulling PostHog with per-event timestamps for the other 2 of the 3 total recorded
occurrences (this session's own PostHog login remained unauthenticated throughout, per the earlier
A-108 follow-up in this same conversation, so this could not be independently re-queried).

## What This Document Does Not Claim

- No fix has been written or deployed for any of the three. This is diagnosis, not closure.
- A-106's root cause is confirmed at the code level but not yet reproduced live in a real browser session.
- A-107's "likely a recurrence of A-73's defect class" is a strong inference from the dated evidence
  already on record, not an independently re-confirmed credential check against Supabase's current
  dashboard state.
- A-105's font-loading finding is a real, named anti-pattern, genuinely present in the code -- but it is
  not asserted as the sole or even primary cause of an 18.54-second LCP without a direct reproduction to
  back that ranking.

## Evidence Chain

Founder asked for RCA on A-105/A-106/A-107, 2026-08-09 -> re-read all three rows' existing PostHog
evidence in full -> for A-107, cross-checked the existing dated session-replay detail (2026-08-02)
against A-73's fix date (2026-07-29) already on record in the same matrix, rather than treating A-107 as
an unrelated fresh defect -> for A-106, traced `isDemoModeEnabled()`'s actual implementation
(`src/demo/demoMode.ts`) and its call sites in `DashboardSection.tsx`, confirming the SSR/client
divergence directly in source rather than guessing at hydration-error causes generically -> for A-105,
read `src/app/layout.tsx` and `src/styles/fonts.css` to check font-loading strategy, and
`DashboardSection.tsx`'s own imports for bundle-weight signals, explicitly marking this candidate as
"leading, not confirmed" rather than overstating a partial investigation -> this document written as the
citable record; matrix rows updated to point here rather than duplicating this analysis inline.

## Files Changed

- `docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md` (new, this document)
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-105, A-106, A-107 Status cells updated to point
  here; no other content in those rows changed)

No source files changed -- this pass is diagnosis only, per the founder's request to do the RCA before
any fix is attempted.
