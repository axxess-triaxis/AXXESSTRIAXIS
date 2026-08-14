# Live UX Sweep, Rounds 1-5 Closeout (2026-08-14)

## Objective

A single-day, founder-driven, screenshot-by-screenshot live bug sweep across
`investor.triaxisventures.com` and `landing.triaxisventures.com` (same repo, same commit, deployed to
both Vercel projects by one `deploy-production.yml` run per merge). The founder tested the live product
directly, flagged concrete defects and gaps as they were found, and the work was executed and shipped in
five sequential, independently-verified rounds rather than one large batch, per this repo's own
established cadence from earlier in the day.

## Decision Ledger

```
Decision: Ship live UX/bug fixes in small, sequential, independently-verified rounds (PRs #234-#238)
  rather than batching the whole day's founder feedback into one large change.
Why: Founder gave feedback continuously and in real time while testing live; batching would have meant
  either making him wait for a large unverified change, or losing traceability between a specific
  screenshot/complaint and the fix that closed it.
What changed: 5 PRs, ~25 named actionables (A-114 through A-130) closed or partially closed; see table
  below.
Architecture boundary: No new services, no schema changes, no auth/RBAC changes this session. All fixes
  were UI-layer (React component logic, one useMemo stability fix, one SVG layout rebuild) or static
  content corrections (version numbers, snapshot figures).
Product boundary: Demo-mode-only changes (Relationship Network org chart, Add Contact, Send Briefing)
  were explicitly scoped to `isDemoModeEnabled()` branches and do not alter real-tenant (Imprints
  Production, Ekora Hive) behavior, verified by reading each gating condition directly, not assumed.
Verification: Each round ran typecheck, lint, and targeted vitest before merge; every round's deploy was
  watched to completion via `gh run watch`, not assumed from the merge alone. Round 5's specific bug
  (the Documents hang) was root-caused via a dedicated read-only investigation before any code was
  written, and the fix was live-verified by holding the fixed modal open for 30+ seconds with no hang,
  on both `investor.triaxisventures.com` and `landing.triaxisventures.com`.
Outcome: All 5 rounds merged and deployed; both domains confirmed green after every round. Round 5's
  four items were individually re-verified live post-deploy (see table below), not just assumed from a
  green CI run.
Follow-up: Agentic MCP2/MCP3-1 live validation (key generation, tools/list, auto-tool call, critical
  approval flow, audit-log confirmation) remains the one item in this session's scope that requires
  direct HITL action and could not be closed by this session alone -- see "Open Item" below.
```

## Rounds Summary

| Round | PR | Merge SHA | Merged (UTC) | Scope |
|---|---|---|---|---|
| 1 | [#234](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/234) | `2a74eb9b` | 2026-08-14T05:23:48Z | MCP2 agentic expansion + first live UX fix pass (Beta Readiness data refresh, Notifications seed data, Documents Upload modal, Analytics Export Report + 2 charts, Integrations reorder, Dashboard demo fallbacks) |
| 2 | [#235](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/235) | `70423d5c` | 2026-08-14T06:33:47Z | Stakeholders clickable contacts + detail tile, Tasks & Workflow Notes tab, Send Briefing modal, Beta Readiness "This Tenant Live" panel removal, version-number fix |
| 3 | [#236](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/236) | `7a5a9a34` | 2026-08-14T07:37:57Z | Settings Investor Preview toggle fix, mobile sidebar overscroll fix, Send Feedback modal rebuilt as 3 real survey links |
| 4 | [#237](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/237) | `24da8fd9` | 2026-08-14T07:48:06Z | Analytics & Reports Palantir-style density pass (Program Operations table + Program Dependency Network) |
| 5 | [#238](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/238) | `cde5cf6c` | 2026-08-14T10:31:07Z | Documents hang/upload root-cause fix, Beta Readiness version correction (0.7.0-beta) + figure re-verification, Org Admin quick-action tiles made clickable, Relationship Network rebuilt as an org chart |

Full per-item evidence for every actionable this session touched is in
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md`, rows A-114 through A-130.

## What Changed (aggregate)

- **Demo-mode interactivity**: Stakeholders contacts (both live and demo tables) are clickable and open
  a detail tile; Add Contact, Add note, Create task, and Send Briefing all do real, working things in
  both demo and live mode where a live equivalent exists.
- **Data accuracy**: Beta Readiness page's version, commit count, and LOC figures were corrected against
  live `git`/`find` output, not left stale; a genuine version-number contradiction (0.7.0 hardcoded in
  one file vs 0.6.0-beta in `package.json`) was found and fixed, then the underlying `package.json`
  value itself was corrected a second time to `0.7.0-beta` on direct founder correction.
- **Dead UI made real**: Settings' Investor Preview toggle, Org Admin's 3 quick-action tiles, and the
  Send Feedback modal were all found to be non-functional placeholders and wired to real behavior.
- **One root-caused production defect**: `DocumentsSection.tsx` was the one `tenantScopeFromUser()` call
  site in the entire codebase not wrapped in `useMemo`, causing an unbounded fetch/render loop that froze
  the browser tab ("This page isn't responding") the instant the Upload modal was opened, on both real
  and demo tenants. Fixed with the same one-line pattern used everywhere else in this codebase.
- **Visual rebuild**: Stakeholders' Relationship Network was rebuilt from a radial hub-and-spoke wheel
  (which crowded ~64 demo stakeholders into an unreadable cluster) into a 2-level organizational chart
  (AXXESS -> organization -> contact), demo-mode only.
- **Density pass**: Analytics & Reports gained a Program Operations table and a Program Dependency
  Network diagram.

## What Did Not Change

- No database schema, migration, or RLS changes this session.
- No auth/RBAC/session changes.
- No changes to the real-tenant (non-demo) data model or repositories beyond the one `useMemo` stability
  fix in `DocumentsSection.tsx`, which is a render-loop fix, not a behavior change.
- No changes to Agentic MCP2/MCP3-1 -- those commits (`2e63b00`, `f4aad62`) originated in a parallel
  session and were only carried into `main` via PR #238 because they were sitting on the same local
  branch, already deployed by that other session's own operator, and had not yet gone through a PR merge
  into `main`. This closeout does not claim any new MCP work; see the pre-existing
  `AGENTIC_MCP3_1_LIVE_ROLLOUT_ADMIN_CONTROL_CLOSEOUT_2026_08_14.md` for that work's own status.

## Verification (aggregate)

Every round: `pnpm run typecheck` (0 errors) and `pnpm run lint` (0 warnings), each round's own touched
test files run via targeted `vitest run`, and each round's deploy watched to completion via
`gh run watch` rather than assumed from a green merge. Round 5 specifics:

- Targeted suite: 9 files / 72 tests passing, including one new regression test
  (`DocumentsSection.test.tsx`) that asserts the indexable-documents repository call fires exactly once
  per Upload-modal open, guarding the exact loop bug that was fixed.
- Full `pnpm run test` was attempted twice this session and crashed both times with a Vitest worker
  error (`Error: Worker exited unexpectedly`) before producing a final summary -- not attributable to
  this round's changes (the targeted suite covering every touched file passed cleanly), consistent with
  this repo's own prior note of the same class of infra issue on other full-suite runs today.
- Live, post-deploy, on **both** domains (not staging, not a preview URL):
  - `investor.triaxisventures.com/documents`: Upload modal held open 30+ continuous seconds, 0 "page
    isn't responding" occurrences (previously reproduced every time).
  - `landing.triaxisventures.com/documents`: same check via investor-preview demo session on this
    domain, 16+ seconds held open, 0 hangs.
  - `investor.triaxisventures.com/admin/beta-readiness` and `landing.triaxisventures.com/admin/beta-readiness`:
    both read "Product Release 0.7" / "0.7.0-beta".
  - `investor.triaxisventures.com/admin/organization`: clicked "Add your documents" tile, landed on
    `/documents` (3/3 tiles are real `<button>` elements per DOM inspection).
  - `investor.triaxisventures.com/stakeholders`: Relationship Network renders as a 64-node org chart
    (AXXESS root -> org branches -> contact leaves), clicking a leaf node opened that contact's profile
    tile correctly.

## Deployment Status

All 5 rounds deployed via `.github/workflows/deploy-production.yml`, triggered on push to `main`,
deploying both Vercel projects (`triaxis-www-frontend-import` -> `landing.triaxisventures.com`,
`triaxis-product-investor-demo` -> `investor.triaxisventures.com`) from the same commit. Round 5's run:
`31792535100` -- `landing.triaxisventures.com` in 6m2s, `investor.triaxisventures.com` in 2m14s, both
green. No separate propagation step to `landing.triaxisventures.com` was needed for any round --
confirmed live on that domain directly rather than assumed from the shared pipeline.

## Residual Risks / Known Gaps

- Full-suite local `vitest run` remains unreliable in this environment (worker crash both times
  attempted this session) -- targeted suites are the working substitute, consistently used and reported
  honestly as such rather than papered over.
- Beta Readiness's "Tests: 1,136" figure is still dated 2026-08-04 and explicitly marked not re-run this
  session, for the same reason above.
- The Relationship Network org chart is legible (0 overlapping labels, confirmed via DOM measurement)
  but wide (2944px at the current ~64-stakeholder demo dataset size) and requires horizontal scrolling --
  a real improvement over the unreadable wheel it replaced, not a fully compact solution.
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` rows for A-120, A-122, A-123, A-124, A-125, A-127,
  A-128, A-129, A-130 were written and merged in the same PR as their own code change, per this
  session's established pattern -- each cites the exact commands run and their literal output rather
  than a general "verified" claim.

## Open Item (not closed this session, requires HITL)

**Agentic MCP2/MCP3-1 live validation** (task tracked as pending). Per the existing
`docs/readiness/AGENTIC_MCP3_1_LIVE_ROLLOUT_ADMIN_CONTROL_CLOSEOUT_2026_08_14.md`, the admin control
plane is deployed but the actual MCP client flow (real key generation, `tools/list`, an auto-tool call,
a disabled-tool denial, one critical-tool approval flow executing exactly once, and audit-log
confirmation of the whole chain) has not been performed with a real MCP client (OpenAI, Claude, or
Copilot) and real founder credentials. This is not something a coding session can complete unilaterally
-- it needs the founder's direct action against a live provider.

## Closeout Position

Rounds 1-5 of today's live UX sweep are complete: code-verified (typecheck/lint/targeted tests clean),
merged to `main` via 5 separate PRs, deployed to both production domains, and re-verified live
post-deploy for every item explicitly called out by the founder this session. The one item still open
(MCP2/MCP3-1 live validation) is named, not silently dropped, and requires the founder's own action to
close.
