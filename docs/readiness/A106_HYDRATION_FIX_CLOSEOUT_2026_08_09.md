# Closeout -- A-106: React Hydration Error Fix

Date: 2026-08-09
Governance source: `CLAUDE.md` evidence-chain discipline
Status: **Code fix shipped for the two confirmed unsafe call sites. Scoped verification passed (see
below). Not yet independently re-confirmed against live PostHog Error Tracking (requires days of
post-deploy traffic) or deployed to production as of this document.**

## What Changed

**Root cause** (full detail in `docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md`):
`isDemoModeEnabled()` reads `window.localStorage`, safe only on the client. Called directly in a
component's render body or a `useState` lazy initializer, it can return different answers on the
server's render vs. the client's hydration-time first render for any visitor whose browser previously
had the (non-expiring) demo-mode flag set -- a structural mismatch, React error #418.

**`src/demo/demoMode.ts`** -- two new exports, no existing behavior changed:
- `isDemoModeSsrSafe()`: returns `isDemoModeForcedByEnv()` only -- the one part of the demo-mode
  question that is genuinely identical on the server and the client (a build-time env var), safe to call
  anywhere, including initializers.
- `useDemoModeEnabled()`: a hook that seeds state from `isDemoModeSsrSafe()` (matching what the server
  actually rendered) and corrects to the real, localStorage-aware answer in a `useEffect` immediately
  after mount, re-resolving on `demoModeChangedEvent`/`demoResetEvent`. The standard fix for this class
  of mismatch -- costs one extra render after mount only for the narrow set of visitors whose answer
  actually differs, in exchange for eliminating the hydration crash.

**`src/auth/AuthProvider.tsx`** -- `getInitialClientSession()` (the `useState` lazy initializer for
`session`, the value gating nearly the entire authenticated app tree) now checks `isDemoModeSsrSafe()`
instead of `isDemoModeEnabled()`. This was a second, independently-confirmed unsafe call site, upstream
of and more consequential than the one originally found in `DashboardSection.tsx` -- `session` gates
almost every conditional render in the app, not just the dashboard's own subsections. The existing
`useEffect` at mount (already present, unchanged) re-checks the real `isDemoModeEnabled()` and corrects
`session` immediately after mount, exactly as it already did for the real-session-fetch path -- this fix
only changes the *initial* value's safety, not the correction logic.

**`src/features/dashboard/DashboardSection.tsx`** -- two call sites fixed:
- The `useState<DashboardProject[]>` initializer now uses `isDemoModeSsrSafe()`. The existing
  post-mount `useEffect` (which calls `getDashboardProjects()`, itself demo-mode-aware) already corrects
  this to the real value shortly after mount -- unchanged behavior beyond the SSR-safe seed.
- The render-body `const demoMode = ...` (branches entire JSX subtrees, e.g. the "Recent institutional
  activity" panel) now calls `useDemoModeEnabled()` instead of `isDemoModeEnabled()` directly.

## What Did Not Change

- `isDemoModeEnabled()` itself is untouched -- still the correct, real answer for every call site that
  runs safely post-mount (event handlers, effects, API routes). Confirmed via a full repo-wide grep:
  roughly 40 other call sites across the codebase were surveyed; all checked were inside effects, event
  handlers, or server-side-only code (safe), except the two fixed here. This pass did not modify those
  other ~38 call sites -- they were not evidenced as unsafe, and touching all of them would have been a
  large, unscoped change for a targeted bug fix. **Flagged, not silently declared complete**: if a
  hydration error recurs from a different component after this fix deploys, the same class of bug in one
  of those other call sites is the first place to check.
- No behavior changes for `investor.triaxisventures.com` (the env-forced-demo deployment) -- both the old
  and new code paths resolve identically there, since `isDemoModeSsrSafe()` already returns `true` on
  that deployment before and after this fix.

## What Was Verified

Exact commands run, this session:
- `npx vitest run src/demo/demoMode.test.ts src/features/dashboard/DashboardSection.test.ts src/auth/AuthProvider.test.tsx --exclude ".claude/**"` -- **4 test files, 40 tests, all passed.** (The
  `--exclude ".claude/**"` flag works around a stale, unrelated leftover directory at
  `.claude/worktrees/xenodochial-villani-91313c` that the vitest config's own exclude list does not
  cover -- see "Unrelated Observation" below.)
- `npx vitest run src/app/auth/page.test.tsx src/features/settings/OrganizationPanel.test.tsx --exclude ".claude/**"` -- the two other test files repo-wide that call `setDemoModeEnabled(true)` and
  could plausibly be sensitive to the initial-session-value change. **2 test files, 12 tests, all
  passed.**
- `npx tsc --noEmit -p tsconfig.json` -- clean, no output.
- `npx eslint src/demo/demoMode.ts src/demo/demoMode.test.ts src/auth/AuthProvider.tsx src/features/dashboard/DashboardSection.tsx src/features/dashboard/DashboardSection.test.ts --max-warnings=0` -- clean, no output.
- New tests added: `useDemoModeEnabled` (3 cases: SSR-safe seed then post-mount correction, false when
  neither env-forced nor localStorage-enabled, live reaction to `demoModeChangedEvent`) and
  `isDemoModeSsrSafe` (3 cases, including explicitly proving it stays `false` even when
  `isDemoModeEnabled()` is `true` via localStorage alone -- the exact SSR-unsafe case this fix exists
  for) in `src/demo/demoMode.test.ts`; one new assertion in `DashboardSection.test.ts` confirming the
  render-body read uses the hook, not the raw function; the existing `useState` initializer assertion
  updated to match the new source text.

**Not run this pass:** the full repository test suite (`pnpm run test` across all files), `pnpm run
lint` project-wide, `pnpm run build`, or `pnpm --dir apps/mobile run typecheck`. Scoped verification only
-- the standard full suite should be run before this ships, per this repo's verification discipline.

## What Remains Partial or Blocked

- **Not deployed.** No commit or deploy has been made this pass; this closeout documents the code
  change and its scoped verification, not a shipped fix.
- **Not reproduced live.** The mismatch requires an authenticated browser whose `localStorage` has
  `axxess.demoMode.enabled=true` set from a prior visit, loading `/dashboard` on a non-env-forced
  deployment -- not set up in this pass.
- **Not independently re-confirmed against PostHog Error Tracking.** That requires a real deploy and
  several days of subsequent traffic to see whether the "Minified React error #418" fingerprint stops
  recurring -- cannot be done from this environment or in this session.
- The other ~38 `isDemoModeEnabled()` call sites repo-wide were surveyed, not individually re-verified
  line-by-line as definitely safe -- flagged above, not silently assumed complete.

## Unrelated Observation (Not Part of This Fix)

While running the scoped test command, vitest's default file discovery picked up a stale, unrelated
directory at `.claude/worktrees/xenodochial-villani-91313c` (present in the working tree but not listed
by `git worktree list`, and not covered by `vitest.config.mjs`'s own `exclude` list, which excludes
`.cache/**` but not `.claude/**`) -- its own out-of-date copy of `DashboardSection.test.ts` failed
against its own out-of-date copy of `DashboardSection.tsx`, unrelated to any change in this pass. Worked
around here with an explicit `--exclude` flag; flagged since the underlying stale directory and the
config gap are both worth a founder decision (delete the leftover directory, and/or add `.claude/**` to
the vitest config's own exclude list) rather than silently working around it every future test run.

## Evidence Chain

Founder asked to proceed with fixing A-106 and investigate A-105/A-107 further, 2026-08-09 -> re-read the
confirmed root cause from the same-day RCA document -> before fixing only the one call site already
found, grepped the full repository for every other `isDemoModeEnabled()` call site to check whether the
DashboardSection instance was the only unsafe one -> found a second, more consequential unsafe call site
in `AuthProvider.tsx`'s session initializer, upstream of nearly the whole app tree -> designed the fix
(`isDemoModeSsrSafe()` + `useDemoModeEnabled()`) around the existing, already-present post-mount
correction effects in both files, so the fix is additive (new seed value) rather than a rewrite of
existing correction logic -> applied both fixes -> updated the one existing test whose asserted source
text changed, added new tests for the new exports and the new call-site behavior -> ran scoped
typecheck/lint/test verification, discovering and working around the unrelated stale-worktree test
discovery issue along the way -> this document written as the citable record of exactly what shipped,
what was verified, and what remains open.

## Files Changed

- `src/demo/demoMode.ts` -- added `isDemoModeSsrSafe()` and `useDemoModeEnabled()`; added `useState`/
  `useEffect` import.
- `src/auth/AuthProvider.tsx` -- `getInitialClientSession()` now uses `isDemoModeSsrSafe()`; import
  updated.
- `src/features/dashboard/DashboardSection.tsx` -- `useState<DashboardProject[]>` initializer now uses
  `isDemoModeSsrSafe()`; render-body `demoMode` now uses `useDemoModeEnabled()`; import updated.
- `src/demo/demoMode.test.ts` -- new tests for both new exports.
- `src/features/dashboard/DashboardSection.test.ts` -- existing assertion updated to match new source
  text; new test for the render-body hook usage.
- `docs/readiness/A106_HYDRATION_FIX_CLOSEOUT_2026_08_09.md` (new, this document).
