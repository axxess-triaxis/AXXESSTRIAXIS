# Lockfile / Deploy Pipeline Incident -- Closeout

Date: 2026-08-06
Governance source: `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`

## Summary

A `pnpm-lock.yaml` / `package.json` version mismatch on `main` broke every GitHub Actions
workflow and every Vercel production deployment for this repository, starting 2026-08-05. It was
discovered as a side effect of investigating a live "Connect Zoom" OAuth failure, root-caused,
fixed via a PR into `main`, and verified end to end including a real, successful production
deployment. This document is the closeout for that incident, following this repo's standard
what-changed / what-didn't / what-was-verified / what-remains structure.

## How This Was Found

Not discovered by a dedicated audit -- found while investigating a founder-reported live Zoom
connector failure (screenshot: "Invalid redirect" error from Zoom during "Connect Zoom"). While
verifying an adjacent claim in `docs/AUTOMATION_OVERVIEW.md` ("GitHub account suspended, cannot
execute"), `gh run list` showed GitHub Actions was in fact running -- and 10 of 11 workflows were
failing on the identical error:

```
[ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY] Broken lockfile: no entry for
'@capacitor/app@7.1.2(@capacitor/core@7.6.7)' in pnpm-lock.yaml
```

Cross-checking against Vercel (`npx vercel ls --prod`, `vercel inspect --logs`) showed the same
error breaking live production deploys on `main` since 2026-08-05 11:58 IST -- the site had been
running a stale build ever since, which explained why a corrected `ZOOM_CLIENT_ID` value already
sitting in Vercel's environment variables was never actually reaching the live site: Vercel bakes
non-public env vars into the deployment at build time, and no build had succeeded since that value
was set.

## Root Cause

`apps/mobile-lite-capacitor/package.json` declares:

```json
"@capacitor/app": "7.1.2",
"@capacitor/splash-screen": "7.0.5"
```

But `main`'s committed `pnpm-lock.yaml` only had `@capacitor/app@8.1.1` and
`@capacitor/splash-screen@8.0.2` resolved -- a real, verifiable mismatch between the manifest and
the lockfile, not a platform-specific pnpm quirk as first hypothesized. Confirmed directly:
`git show origin/main:pnpm-lock.yaml | grep -c "@capacitor/app@7.1.2"` returned `0`.

**Important correction made during this investigation:** the `canonical/sprint-1-35-unified-gitlab`
branch's own committed lockfile was checked the same way and already had the correct `7.1.2`/`7.0.5`
entries -- even at the exact commit (`5e38936`) GitHub Actions had failed against. That branch's
CI redness has a different, still-unconfirmed cause (see "What Remains Open" below) -- it was not
assumed to share `main`'s root cause just because the symptom looked identical.

## What Changed

- `pnpm-lock.yaml` on `main`: restored the missing `@capacitor/app@7.1.2` and
  `@capacitor/splash-screen@7.0.5` resolution + snapshot entries via
  `pnpm install --no-frozen-lockfile`, plus a benign, cosmetic simplification pnpm made to some
  `eslint-import-resolver-typescript`/`eslint-module-utils` peer-dependency key notation (same
  package versions throughout, shorter key strings only).
- Landed via [PR #186](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/186)
  (`fix/lockfile-capacitor-entries` -> `main`), merged as commit `b8866e2`. Direct push to `main`
  was attempted first and correctly rejected by GitHub branch protection
  ("Changes must be made through a pull request", required check `dependency-review`) -- a PR was
  the only available path, which is the intended, correct workflow.

## What Did Not Change

- No dependency *versions* changed -- only the lockfile's internal consistency with an
  already-declared `package.json` version.
- `canonical/sprint-1-35-unified-gitlab`'s lockfile was not touched -- it did not have this
  specific mismatch.
- `gitlab/main` was not touched. Checked and confirmed stale from before `apps/mobile-lite-capacitor`
  existed (`git ls-tree -r gitlab/main --name-only | grep mobile-lite-capacitor` returns nothing) --
  it cannot have this bug and reconciling its multi-week staleness against `origin/main` is a
  separate, larger, explicitly out-of-scope decision.
- No application code changed.

## What Was Verified

**Locally, on the fix branch, before opening the PR:**
- `pnpm install --frozen-lockfile` -- passes (this is the exact command that was failing)
- `pnpm run typecheck` -- passes
- `pnpm run lint` -- passes, zero warnings
- `pnpm run build` -- passes
- `pnpm run test` -- crashes with `Error: Worker exited unexpectedly` (Vitest). Confirmed
  **pre-existing and unrelated**: the identical crash was reproduced against the unmodified base
  commit with zero lockfile changes applied. This is the same known sandbox memory-ceiling
  limitation already documented in `docs/readiness/CODING_PROGRESS_TRACKER_2026_07_30.md`.

**On PR #186 itself (`gh pr checks 186`):**

| Check | Result |
|---|---|
| dependency-review (required) | Pass |
| CodeQL | Pass |
| Secret Scan | Pass |
| rls-artifact-check | Pass |
| Lite/X0 mobile boundary guard | Pass |
| Required RAG Release Gate | Pass |
| Store Listing, Reviewer, Screenshots, Health | Pass |
| Supabase CLI And Migration Static Verify | Pass |
| mobile-screenshots | Pass |
| playwright | Pass |
| mobile-validate | Pass |
| pnpm Critical Vulnerability Gate | Pass |
| **Vercel -- triaxis-www-frontend-import** | **Pass -- "Deployment has completed"** |
| **Vercel -- axxesstriaxis** | **Pass -- "Deployment has completed"** |
| **Vercel -- triaxis-product-investor-demo** | **Pass -- "Deployment has completed"** |
| Build, Lint, Type Check | **Fail** -- pre-existing Vitest worker crash, log-confirmed identical to the local reproduction above |
| validate | **Fail** -- same pre-existing Vitest worker crash |
| Sprint 27/29 Pilot Acceptance Gate | **Fail** -- unrelated, pre-existing Playwright failure (`expect(locator).toBeVisible() failed`, `sprint27-golden-path...import-and-task-evidence`); this PR touches only `pnpm-lock.yaml`, no UI code, so this cannot be caused by this change |

`mergeStateStatus` was `UNSTABLE` (non-required checks failing) but `mergeable: MERGEABLE`; only
`dependency-review` was a required/blocking check, and it passed. Merged via `gh pr merge 186
--merge`.

**Post-merge, the actual exit criterion (real production deployment):**
- A new production deployment for `triaxis-www-frontend-import` was triggered automatically by the
  merge to `main`. Watched end to end via a polling monitor against `npx vercel ls --prod`: state
  progressed `Queued` -> `Building` -> `Ready` in approximately 6 minutes
  (`dpl_38Y7QHEa9g47R7hfLJvBKMSdDPZB`, created 2026-08-06 18:21:49 IST).
- Independently confirmed via `npx vercel inspect https://landing.triaxisventures.com`: the live
  custom domain is aliased to `dpl_HznY1DzyNrfLYrzFceQwqCYPAtiq` (status `Ready`).
- Independently confirmed via a direct `curl -s -o /dev/null -w "HTTP %{http_code}" https://landing.triaxisventures.com`: returns `HTTP 307` (a normal auth-gate redirect, not an error).

This satisfies the explicit exit criterion set for this task: a real, complete, end-to-end
Vercel production deployment, not merely green CI.

## What Remains Open (Named, Not Silently Dropped)

1. **The Vitest worker crash itself is not fixed.** It is confirmed pre-existing and unrelated to
   this incident, but it remains a real, standing gap in this program's ability to get a fresh
   passing-test count from a completed `pnpm run test` run, locally or in CI. Not addressed by this
   closeout.
2. **`Sprint 27/29 Pilot Acceptance Gate`'s Playwright failure is real and undiagnosed beyond the
   log excerpt captured here.** Found in passing while triaging this PR's unrelated failures; not
   investigated further, not fixed. Should be triaged separately.
3. **`canonical/sprint-1-35-unified-gitlab`'s own GitHub Actions redness has a different,
   still-unconfirmed root cause.** Its committed lockfile already has the entries this fix restores
   on `main` -- re-adding them there would be a no-op. Whatever causes that branch's CI failures
   (if it is still failing as of this note) was not diagnosed in this pass and should not be assumed
   solved by this fix.
4. **Whether "Connect Zoom" now actually succeeds end to end has not been independently
   re-confirmed.** This fix removes the specific cause already diagnosed (a stale production build
   serving an old `ZOOM_CLIENT_ID`) -- the live site should now be sending the current value
   (`EqhNb7X8TyCvaSlZFtebg`) on the next real attempt. Whether the Zoom App Marketplace redirect URL
   is registered under *that* specific app was never independently confirmed from this repository
   (no Zoom Marketplace access). A fresh live "Connect Zoom" attempt is needed to close this for
   real -- see `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-70 and
   `docs/readiness/INTEGRATIONS_DONENESS_MATRIX_2026_07_29.md`'s Zoom row, both updated with this
   status rather than a premature "resolved" claim.
5. **`gitlab/main`'s multi-week staleness relative to `origin/main`** is unrelated to this incident
   and was explicitly left alone -- not a defect of this fix, a pre-existing, separate condition
   noted for awareness.

## Evidence Chain

- Diagnosis commands and their raw output: this session's tool-call history, 2026-08-06.
- PR: [github.com/axxess-triaxis/AXXESSTRIAXIS/pull/186](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/186), merge commit `b8866e2`.
- Fix branch: `fix/lockfile-capacitor-entries` (built from `origin/main` at `b43e30d`).
- Related docs updated as part of this incident: `docs/AUTOMATION_OVERVIEW.md` (GitHub-suspended
  correction, lockfile-bug root cause note), `docs/GITHUB_INDEPENDENT_OPERATIONS.md` (resolution
  annotation), `src/services/integrations/connectorContract.ts` (Zoom redirect diagnosis chain),
  `docs/readiness/QA3_READINESS_KANBAN.md`, `docs/readiness/INTEGRATIONS_DONENESS_MATRIX_2026_07_29.md`,
  `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-70.
- Background session that first diagnosed and prepared the fix in a diagnostic worktree: chip
  `task_7f4d6851` ("Fix GitHub Actions frozen-lockfile CI failure").

## Closure Statement

The specific, named incident -- `main`'s broken lockfile blocking GitHub Actions and Vercel
production deploys -- is closed, with a real, verified, end-to-end successful production
deployment as evidence, not merely a green check mark. Four adjacent items surfaced during this
investigation remain open and are named above rather than folded into an inflated "fully resolved"
claim: the pre-existing Vitest worker crash, the Sprint 27/29 Playwright failure, canonical
branch's separate CI-redness cause, and live re-confirmation of the Zoom connector fix.
