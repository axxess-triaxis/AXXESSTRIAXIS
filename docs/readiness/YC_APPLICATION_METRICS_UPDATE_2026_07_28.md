# YC Application Metrics Update (2026-07-28)

Date: 2026-07-28
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline -- every figure below is either cited to
an exact command/file, or explicitly marked as not having a single clean metric.
Purpose: founder-requested snapshot of current build/test/commit/PR/sprint metrics for a Y
Combinator application progress update.

## Web Beta (currently versioned `0.7.0-beta`, not 1.0)

There is no single "% complete" metric tracked anywhere in this repository. The closest
evidence-based proxy is the actionables readiness matrix:

| Metric | Value | Source |
|---|---|---|
| Actionables tracked | 68 total | `ACTIONABLES_READINESS_MATRIX.md`, 2026-07-28 |
| -- Confirmed working (`Yes`) | 36 (53%) | same |
| -- Blocked, mostly external/founder-action dependencies, not code gaps | 21 (31%) | same |
| -- Confirmed defect (`No`) | 11 (16%) | same |

**Do not quote "53%" as "the beta is 53% built."** Most of the 21 `Blocked` items are external
dependencies this program cannot resolve itself (a missing API key, an unregistered OAuth app, a
pending D-U-N-S number) -- not unbuilt product surface. If a single honest sentence is needed:

> 36 of 68 tracked pilot-readiness items are live-verified working; the remainder are either
> blocked on an external, named dependency or are confirmed, logged defects -- there is no single
> completion percentage that fairly represents beta readiness.

## Mobile

| Platform | Status | Evidence |
|---|---|---|
| **Android** | Preview build succeeded once | GitHub Actions run `30240678884` (2026-07-27, manual `workflow_dispatch`): the `android-preview` job completed with `conclusion: success` |
| **iOS** | No successful preview build to date | Same run: `ios-preview` job = `cancelled`. An earlier attempt (2026-07-14, run `29345095406`) was also cancelled before completing |
| **Both, signed store release** | Blocked | Same root cause for both platforms: a company-owned D-U-N-S Number application with Dun & Bradstreet India (reference `DR071320262903910840`, filed 2026-07-13, typical turnaround up to ~30 days, expected by approximately 2026-08-12) is a prerequisite for Apple Developer Program organization enrollment and company-owned Google Play credentials. See `MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md` |

Both mobile apps are thin platform wrappers around the same web codebase, not separate
implementations -- see LOC table below.

## Commits, Pull Requests, Tests

| Metric | Value | Source |
|---|---|---|
| Commits (current branch) | 422 | `git rev-list --count HEAD`, 2026-07-28 |
| Pull requests opened, all-time | 127 | `gh pr list --repo axxess-triaxis/AXXESSTRIAXIS --state all` |
| -- Merged | 113 | `gh pr list --state merged` |
| -- Currently open | 3 | `gh pr list --state open` |
| -- Closed without merging | 11 | derived (127 total - 113 merged - 3 open) |
| Automated tests passing | 625, across 157 test files | `pnpm run test`, run 2026-07-28 |
| Typecheck / lint / build | All clean | `pnpm run typecheck` / `lint` (zero warnings) / `build`, run 2026-07-28 |

## Lines of Code

| Scope | Lines | Files | Notes |
|---|---|---|---|
| Main web app (`src/`) | 50,257 | 534 TS/TSX files | `git ls-files "src/**/*.ts" "src/**/*.tsx" \| xargs cat \| wc -l` |
| -- of which, test code | 9,847 | 155 test files | subset of the above |
| Mobile (Expo wrapper, `apps/mobile`) | 292 | 21 TS/TSX files | thin native shell, no duplicated business logic |
| Mobile (Capacitor, `apps/mobile-capacitor`) | Native platform boilerplate only (Java/Swift/Gradle/plist/XML) | ~1 custom TS file | negligible custom code by design |
| Whole repository, all tracked text (code + docs + config) | 101,375 | 1,017 files | `.ts/.tsx/.js/.jsx/.md/.json/.yml/.yaml/.css`, includes documentation and config, not just code |

Both mobile apps deliberately share one implementation in `src/` rather than maintaining
per-platform business logic -- the 292-line and ~1-file mobile counts reflect wrapper/shell code
only, not a smaller product.

## Sprints

15 closeout documents across 4 initiatives, all in `docs/readiness/`:

- **QA3 core readiness program -- 5 sprints**: Sprint 1 (Tenant 0 production activation), Sprint 2
  (live golden path execution), Sprint 3 (two-tenant isolation/permission proof), Sprint 4
  (integrations/analytics operational evidence), Sprint 5 (QA3 closure, non-HITL delta).
- **RAG Remediation -- 3 sprints**: source integrity, answer quality, workflow polish (all
  2026-07-26).
- **Executive Dashboard -- 3 sprints**: ED1, ED2, ED3 (all 2026-07-25).
- **Email/OAuth/Phone sign-in -- 4 sprints planned, 2 closed**: Sprint 1 (feedback/invite email
  routing fix, closed 2026-07-27) and Sprint 4 (phone/SMS OTP sign-in, closed 2026-07-28) have
  closeout documents; Sprint 2 (founder credential/OAuth-app setup) and Sprint 3 (live HITL
  verification) are open, tracked in `EMAIL_DELIVERY_AND_OAUTH_ROADMAP_2026_07_27.md`.

## What Changed Since the Last Metrics Snapshot

The most recent prior snapshot (`QA3_EXECUTIVE_SUMMARY_2026_07_26.md`, refreshed 2026-07-27) cited
413 commits, 113 merged PRs, and 595 tests across 150 files. As of this update: 422 commits (+9),
113 merged PRs (unchanged -- 3 more opened since, none merged yet), 625 tests across 157 files
(+30 tests, +7 files) -- reflecting the Golden Path routing fix (A-35/36/37/39), the email-delivery
bug fixes (A-08/A-65), and the new phone/SMS OTP sign-in feature (A-68), all shipped 2026-07-27/28.
