# Phase 9 -- Usage & Observability

## Primary Evidence: Live PostHog Artifact (Not a Screenshot, Not Founder Recollection)

This phase's core evidence was already gathered and verified in Phase 6, resolving Q-009: a
PostHog AI-generated report ("Product analytics & error report -- Aug 11, 2026"), read directly by
this session from `us.posthog.com/project/498426`, after the founder logged in when this session's
browser hit PostHog's login wall. Full detail lives in `docs/audit/FOUNDER_QUESTIONS.md` Q-009; this
phase organizes that same evidence under the audit protocol's usage/observability framing rather than
re-deriving it.

### Traffic (last 30 days, PostHog's own explicit caveat: **not filtered for test accounts**)

| Metric | Value |
|---|---|
| Monthly active users (MAU) | 377 |
| Peak DAU (Aug 10) | 236 |
| Partial-week WAU (Aug 9-11) | ~333+ |
| Sessions per user (week of Jul 26 -> week of Aug 2) | 2.9 -> 2.0 |

**The traffic spike itself is unexplained, by PostHog's own report, not by this session.** DAU held
at 2-10/day from Jul 27 through Aug 8, then jumped to 98 (Aug 9) and 236 (Aug 10) -- the current
partial week's WAU (333) already exceeds the prior two full weeks combined (48). PostHog's own report
recommends checking referrer/UTM data to confirm organic vs. bot traffic and does not resolve this
itself. **This phase does not resolve it either** -- flagged as a real, open observability gap: this
program does not yet have a confirmed explanation for its single largest traffic event.

### Geography (test-accounts genuinely filtered here)

India 364 unique users (~97% of identified traffic), United States 9, plus smaller counts from
Germany, Ireland, Nepal, and Romania.

### Error Tracking (test-filtered, 7 active issues, all in the Aug 9-11 spike window)

1. **Cross-origin script error** -- 42 occurrences / 38 users / 38 sessions. Generic CORS-suppressed
   error; fix is `crossorigin="anonymous"` + proper `Access-Control-Allow-Origin` headers.
2. **Android WebView `postMessage` bridge error** -- ~40 occurrences / ~39 users across 4 sub-groups.
   JS calling a native method on an already-destroyed WebView; needs a null-check/try-catch guard.
   Directly relevant to the Capacitor mobile shell covered in Phase 10.
3. **React error #418 (SSR hydration mismatch)** -- 13 occurrences / 6 users / 8 sessions, two
   variants (HTML/text mismatch).

**Data-quality flag inside PostHog's own report, not resolved by this session:** the report's
headline claims all 7 issues "emerged in the last 3 days (Aug 9-11)," but issue #3's own "First seen"
date is Jul 29 -- 11 days earlier than that claim. Recorded as a real internal inconsistency in the
source artifact itself.

### Retention

Weekly retention reads as ~0% beyond week 0 for both measured cohorts (181 users, week of Aug 2-8;
334 users, week of Aug 9-15). PostHog's own report attributes this to `posthog.identify()` likely not
being called post-login/signup, meaning returning users aren't tracked as identified persons --
**not necessarily real churn**, but a real observability instrumentation gap either way. This is
PostHog's own recommended fix, not this session's diagnosis, and it remains unimplemented as of this
phase.

## What Observability Instrumentation Exists in the Codebase

Confirmed via direct file/dependency inspection, not assumed from the PostHog dashboard's existence
alone:

- `posthog-js` and `posthog-node` are real, installed dependencies (confirmed in the `pnpm install`
  output verified during Phase 6's environment-repair work) -- client- and server-side event tracking
  both exist as real code paths, not just a dashboard someone logged into independently of this repo.
- A defined analytics event vocabulary exists (`packages/shared/src/index.ts`'s
  `sprint13AnalyticsEvents`, referenced in `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` section 2.3)
  and was extended this session (A-79's 8 new agentic event names, per this session's earlier work).
- Vercel function logs (`npx vercel logs`) were used as real, direct evidence in this program's own
  incident investigations -- cited by name in `ACTIONABLES_READINESS_MATRIX.md`'s A-86 row (the
  session-death root-cause investigation), not a hypothetical capability.

**Not evaluated this phase, flagged as a gap in this audit's own coverage, not the product's:**
whether a dedicated error-tracking/APM tool (Sentry, Datadog, etc.) exists beyond PostHog's own error
tracking feature and Vercel's raw function logs. No such integration was found in the dependencies
checked this session, but a full dependency audit for this specific question was not performed.

## Answering the Audit Protocol's Own Question: Is There Real Usage, and Is It Observable?

**Real usage: yes, evidenced by a live, authenticated dashboard read directly by this session, not
by founder recollection.** 377 MAU and a real (if unexplained) traffic spike are genuine signals,
not fabricated or estimated.

**Observability: partial, with real, named gaps.** The infrastructure to observe usage exists and is
wired (PostHog client/server SDKs, an event vocabulary, Vercel logs used in real incident response).
But three concrete gaps are open as of this phase: (1) the program's largest single traffic event has
no confirmed explanation, (2) retention tracking is structurally broken because `identify()` isn't
called at the right point in the auth flow, and (3) the source data itself (PostHog's own report)
contains an internal date inconsistency that wasn't caught before this audit found it.

## Cross-References

- **Phase 6** (`06_TEST_RELIABILITY_AUDIT.md`) -- Q-009, the full resolution trail for the PostHog
  artifact this phase is built on.
- **Phase 8** (`08_COMMERCIAL_EVIDENCE.md`) -- the founder-stated marketing-reach figures (video
  views, waitlist signups) are a *different* evidence type than this phase's PostHog data: those are
  unverified, this phase's numbers were read live from an authenticated source.
- **Phase 10** -- the Android WebView `postMessage` error found here is directly relevant to that
  phase's mobile-surface coverage.
