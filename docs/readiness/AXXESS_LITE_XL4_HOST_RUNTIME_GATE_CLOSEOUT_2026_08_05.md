# XL-4 Closeout -- Lite Host Runtime Gate and Surface Entitlement Enforcement

Date: 2026-08-05
Sprint: XL-4

Planning provenance: Codex-drafted sprint recommendation, presented to and executed for the
founder in the same conversation ("Recommended Next Sprint -- XL-4"), confirmed to start
immediately via an explicit founder choice between "start now" and "log only." A fuller,
independently-drafted Codex execution prompt for the same sprint arrived afterward (same
conversation, 2026-08-06) -- diffed against what had already shipped rather than re-executed from
scratch; the 2026-08-06 addendum near the end of this document covers what that diff found and
closed. **Filename note:** the fuller prompt names
`docs/readiness/XL4_LITE_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_06.md`; this document (created first,
already committed and merged via #184 before that prompt arrived) is treated as the canonical
closeout instead of creating a near-duplicate file under a second name.

## What Changed

XL-4 moves AXXESS Lite's isolation from source/build-time gates (XL-3's import-boundary and
mobile-target-distinctness guards) to a **runtime** gate: XLA-21 (2026-08-05, earlier same day)
already restricted PAGE routes on the Lite domain to `/lite`, `/api`, and `/auth`, but let the
entire `/api` prefix through wholesale -- meaning any admin, agentic, social-alert, or complex
connector API was fully reachable on the Lite production domain, protected only by whatever role
check exists inside each individual route handler (a different, deeper trust boundary than what
XLA-21 was meant to guarantee at the edge). This sprint closes that gap and adds two further
runtime guarantees:

1. **`src/config/liteSurfaceHosts.ts` (new).** Extracted the Lite host list out of `src/proxy.ts`
   into a shared module, importable by both the Edge Runtime middleware and client-side code.
   XLA-21 was a real incident caused by exactly this kind of list existing in only one place and
   drifting out of date; a second hand-maintained copy (which the demo-mode-forced-off work below
   would otherwise have required) would reintroduce that same risk. Also adds
   `resolveIsLiteSurface()`, combining host-based detection with a new, optional `AXXESS_SURFACE`
   env var declaration.
2. **`AXXESS_SURFACE=lite|x0|demo` runtime handling.** An explicit, additive per-deployment
   surface declaration. Not required for correct behavior -- host-based detection alone still
   covers `lite.triaxisventures.com` and the `*.vercel.app` fallback with zero configuration, and
   `AXXESS_SURFACE` is unset on every real deployment today, so this is a no-op until the founder
   deliberately sets it. When set to `lite` on a project, it forces that entire deployment into
   Lite behavior regardless of which domain the request arrived on -- documented as a real
   misconfiguration risk in `docs/ENVIRONMENT_VARIABLES.md` ("only ever set this on
   `triaxis-product-lite-web`").
3. **Lite API allowlist (`src/proxy.ts`: `isLiteAllowedApiPath`, `shouldBlockLiteApiRequest`).**
   Deny-by-default: only the API surface Lite's shipped and planned feature set actually needs
   (auth, profile, onboarding, documents, RAG-lite query/review, beta feedback, basic audit
   export, and a restricted subset of `/api/repositories/[resource]` resource types --
   tasks/meetings/projects/stakeholders/documents/document_versions) is reachable on a Lite host;
   every other `/api/*` path 404s at the edge before it reaches the route handler. A new API route
   added anywhere in the app is blocked on the Lite host unless explicitly added to the allowlist.
4. **Demo mode cannot activate on a Lite host, even via a copied env var.** Two independent
   checks, since `NEXT_PUBLIC_*` values are baked into the client bundle at build time
   (project-scoped, not request-host-scoped) while `src/proxy.ts` runs per-request server-side:
   - Server-side: `resolveDemoModeEnabled()` in `src/proxy.ts` forces `isDemoModeEnabled` to
     `false` on a resolved Lite surface, regardless of `NEXT_PUBLIC_AXXESS_DEMO_MODE`'s value.
   - Client-side: `src/demo/demoMode.ts`'s `isDemoModeForcedByEnv()` now also checks
     `window.location.hostname` against the shared Lite host list once hydrated, and refuses to
     honor a forced-true env value there.
   Investor Demo is an X0-only concept (per the doctrine's excluded-features table); this closes
   the "no X0 env vars copied blindly" risk this sprint exists to address, in case
   `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` were ever set on `triaxis-product-lite-web` by mistake.

## What Did Not Change

- No X0 page routes, components, or business logic were modified.
- No Investor Demo fixture data or demo-specific components were modified (only the forced-on
  check that decides *whether* demo mode activates).
- The Lite navigation contract, Lite pages, and Lite feature components (XL-1/XL-2) are unchanged.
- `apps/lite-web` and the mobile-target guard scripts (XL-3, committed separately by a parallel
  session) are unchanged.
- No Vercel project settings were changed -- `AXXESS_SURFACE` and `AXXESS_LITE_HOSTS` remain unset
  on every real deployment; this sprint ships the *capability*, not the configuration.
- No native Android/iOS project was generated. XLA-23/24/25 remain blocked, unchanged from XL-1.

## Whether Lite Code Changed

Yes -- `src/config/liteSurfaceHosts.ts` (new), `src/proxy.ts`, `src/demo/demoMode.ts`.

## Whether X0 Code Changed

No functional change. `src/proxy.ts` and `src/demo/demoMode.ts` are shared-kernel files (not
X0-specific), and their new behavior is a no-op on any X0 host (`resolveIsLiteSurface` returns
`false`, so every new branch short-circuits immediately).

## Whether Demo Code Changed

Yes, narrowly -- `isDemoModeForcedByEnv()`'s host check, described above. No demo fixture data,
demo dataset, or demo UI component was touched.

## Files Added

- `src/config/liteSurfaceHosts.ts`
- `src/config/liteSurfaceHosts.test.ts`
- `docs/readiness/AXXESS_LITE_XL4_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_05.md` (this file)

## Files Modified

- `src/proxy.ts` -- imports the shared host module; adds `isLiteAllowedApiPath`,
  `shouldBlockLiteApiRequest`, `resolveDemoModeEnabled`; wires the new API block into `proxy()`.
- `src/proxy.test.ts` -- 21 new tests covering the API allowlist, `AXXESS_SURFACE` handling, and
  demo-mode-forced-off.
- `src/demo/demoMode.ts` -- `isDemoModeForcedByEnv()` gains the client-side host check.
- `src/demo/demoMode.test.ts` -- 4 new tests covering the host check, using a `window.location`
  stub (jsdom's `history.pushState` enforces same-origin and cannot simulate a different
  hostname).
- `docs/ENVIRONMENT_VARIABLES.md` -- documents `AXXESS_LITE_HOSTS` and `AXXESS_SURFACE`.

## Tests Run

- `corepack pnpm exec vitest run src/proxy.test.ts src/config/liteSurfaceHosts.test.ts src/demo/demoMode.test.ts`
- `corepack pnpm exec vitest run src/features/settings/SettingsSection.test.tsx src/auth/AuthProvider.test.tsx` (regression check on the two other call sites of `isDemoModeForcedByEnv`)
- `corepack pnpm exec vitest run src/demo src/features/lite` (broader regression check)
- `corepack pnpm exec tsc --noEmit -p .`
- `corepack pnpm --dir apps/mobile run typecheck`
- `corepack pnpm exec eslint . --max-warnings=0`
- `corepack pnpm exec next build`

## Test Results

- `src/proxy.test.ts` + `src/config/liteSurfaceHosts.test.ts` + `src/demo/demoMode.test.ts`: 78/78 pass.
- `SettingsSection.test.tsx` + `AuthProvider.test.tsx`: 10/10 pass (no regression from the
  `isDemoModeForcedByEnv` signature-compatible change).
- `src/demo` + `src/features/lite`: 44/44 pass.
- `tsc --noEmit`: clean, both web and mobile.
- `eslint . --max-warnings=0`: clean, whole repo.
- `next build`: succeeded; `/lite/*` routes and the Edge Runtime `Proxy (Middleware)` bundle both
  built correctly with the new `src/config/liteSurfaceHosts.ts` import.
- `pnpm run supabase:verify`: passed (35 migrations, 109 RLS-protected tables) -- expected, this
  sprint made no schema changes.
- **`pnpm run test` (whole-repo suite), three attempts:**
  1. Default settings (`fileParallelism: true`, `pool: "threads"`): crashed at startup with
     `Error: Worker exited unexpectedly`, before any test file executed.
  2. `--no-file-parallelism` (the fallback `vitest.config.mjs`'s own comments document for a
     *different*, intermittent flakiness pattern): crashed identically, same point, before test
     collection began -- ruling out file-count/parallelism as the cause.
  3. `--pool=forks` (child-process workers instead of `worker_threads`): got much further --
     **241/242 test files, 1240/1244 tests passed, zero failures reported** -- then crashed near
     the very end (3108s / ~52 min in) with `FATAL ERROR: Ineffective mark-compacts near heap
     limit -- JavaScript heap out of memory` inside one worker process, which took the last
     in-progress test file down with it (4 tests never reported a result; none reported a
     failure). This sandbox's Node heap grew past ~2GB and still couldn't complete.

  **Conclusion:** this sandbox cannot run the entire ~242-file suite in a single invocation
  regardless of pool/parallelism configuration -- a memory ceiling, not a code defect. Across all
  three attempts, **zero tests failed** (the forks run reported real pass/fail data for 1240
  tests and found none); the only casualty was the last file the OOM'd worker was mid-way through.
  Not a regression from this sprint: every XL-4-relevant test (78 new/updated + 54 broader
  regression checks run separately) already passed cleanly in scoped runs before this whole-repo
  attempt, and 241 of 242 files completed clean in the forks run itself. Reporting all three
  results precisely rather than claiming (or hiding) any single outcome.

## Build Result

Pass. See Test Results above.

## Actionables Created

None new -- this sprint directly implements the four core-work items from the founder-approved
XL-4 recommendation (`AXXESS_SURFACE` runtime handling, host/domain API guard, Lite API allowlist,
demo-mode-forced-off), rather than deferring any of them to a tracked actionable ID.

## Checklist Status (against XL-4's stated acceptance criteria)

- [x] Lite host cannot render X0 dashboard -- unchanged from XLA-21, still verified live.
- [x] Lite host cannot render Investor Demo data -- new this sprint, both server- and
      client-side, unit-tested.
- [x] Lite host cannot reach X0 admin routes -- covered by the existing page-level XLA-21
      redirect (pages) plus the new API allowlist (`/api/admin/*` blocked).
- [x] Lite host cannot expose Social Alerts or Agentic MCP -- explicitly tested
      (`/api/social-alerts/status`, `/api/social-alert-rules`, `/api/agents/mcp`,
      `/api/agents/connections`).
- [x] Lite still allows login, onboarding, `/lite/*`, core auth callbacks, and the approved Lite
      API set.
- [x] `pnpm exec tsc --noEmit`, `eslint . --max-warnings=0`, `next build` pass.
- [ ] `pnpm run lite:ci` -- **not run this pass.** Its constituent scripts
      (`lite:guard`, `lite:test`, `lite:mobile:validate`) were verified individually in an earlier
      session turn (pre-XL-4) under the same local-Windows-PATH-quirk caveat noted in that
      session's history (bare `pnpm` inside the composite script doesn't resolve locally, only
      `corepack pnpm`; expected to work in GitHub Actions, which installs pnpm natively). Not
      re-verified against this sprint's specific file changes -- flagged, not silently assumed.
- [x] Closeout documents residual risk and next extraction step (this document).

## Residual Risks / Explicitly Deferred

- **`pnpm run lite:ci` not re-run this pass** (see checklist above) -- recommend running it (or
  confirming the next CI run on this branch passes) before merge.
- **`AXXESS_SURFACE` and `AXXESS_LITE_HOSTS` are not yet set on any Vercel project.** This sprint
  ships the capability; configuring `AXXESS_SURFACE=lite` on `triaxis-product-lite-web` is a
  founder/HITL action (Vercel dashboard), not something done from code. Until set, the system
  relies solely on host-based detection -- which is already the sole mechanism protecting
  production today (verified live, XLA-21), so this is not a new gap, just an unrealized
  additional layer.
- **The Lite API allowlist is scoped to Lite's *currently shipped* pages** (Home and Settings;
  Work/Meetings/People/Files/Ask/Projects/Payments are still honest placeholders per XL-1). As
  those placeholders get real data wiring in a future sprint, their API needs may not be fully
  covered by today's allowlist (e.g. notifications, invitations) -- each new Lite feature that
  needs a currently-blocked API must explicitly extend `liteAllowedApiExactPaths` /
  `liteAllowedApiPrefixes` / `liteAllowedRepositoryResources`, not bypass the gate.
  `document_versions` was included in the repository-resource allowlist as a judgment call
  (natural sub-resource of "documents"/Files), not an explicit founder-specified item -- flagged
  here rather than silently assumed correct.
- **CVE-2025-29927-class risk**: `src/proxy.ts` middleware is Next.js's own security boundary for
  this gate; a background research pass earlier in this program flagged that middleware alone is
  not considered a sufficient security boundary industry-wide (defense-in-depth via server/API-
  level checks is the recommended pattern). This sprint's API allowlist is itself an edge-level
  check, not a route-handler-level one -- genuinely deeper defense-in-depth (e.g. asserting tenant
  tier/security_tier inside each allowed handler) remains unbuilt and is out of scope for XL-4.
- **Native mobile (XLA-23/24/25) remains blocked** on DUNS number issuance, unchanged from XL-1.

## Next Extraction Step

If AXXESS Lite eventually needs to become a genuinely separate deployable (not transitionally
sharing this repo's root app), the natural next step after XL-4 is promoting `AXXESS_SURFACE` from
an optional declaration to a required one, and using it (rather than host detection) as the
primary signal once `apps/lite-web`'s boundary/control package (XL-3) is extended from "guards
against accidental drift" to "actually builds and deploys independently." Not scoped for this
sprint.

## HITL Decisions Required

- Confirm whether to set `AXXESS_SURFACE=lite` on `triaxis-product-lite-web` now (adds a second,
  independent layer on top of host detection) or leave it unset (host detection alone, current
  live state, already verified working).

## 2026-08-06 Addendum: diffed against the fuller Codex XL-4 prompt

A more detailed Codex execution prompt for this same sprint arrived after the above had already
shipped, been merged (#184), deployed, and live-verified. Diffed line-by-line against what it
specified rather than re-executed from scratch; closed the following genuine gaps found:

- **Test coverage gaps**: added explicit `/alerts` and `/integrations` page-redirect tests (the
  prompt names these specifically; the generic redirect logic already covered them, but there was
  no dedicated test proving it), and explicit `/api/cron/pilot-command-center-snapshot` /
  `/api/cron/social-connector-sync` block tests (same situation -- covered by deny-by-default, not
  previously asserted directly).
- **`liteSurface.ts` consolidation**: the prompt's required reading list includes
  `src/features/lite/liteSurface.ts` (XL-3 scaffolding) as a candidate location for surface
  detection. Found it already defined its own `AxxessSurface` type and a `getLiteSurface()` that
  unconditionally returned `"lite"` regardless of any real signal -- a second, non-functional
  implementation alongside the real one in `src/config/liteSurfaceHosts.ts`. Consolidated:
  `liteSurface.ts` now re-exports the type and delegates `getLiteSurface()` to real
  env/host-based resolution. Test rewritten to match (real behavior, not a trivial stub
  assertion). No other production file imported this module (verified via grep) -- zero-risk
  change, no other call sites to update.
- **`scripts/lite-boundary-guard.mjs` extended** per the prompt's explicit item 7: now also
  verifies `src/proxy.ts` and `src/config/liteSurfaceHosts.ts` exist, export the required
  functions, and contain *populated* allowlist `Set`/array literals (a real string entry present,
  not just the identifier name appearing in a comment) -- deliberately not brittle against
  comments-only, per the prompt's own explicit warning.
- **Docs updated** per the prompt's item 8: added an "XL-4 Update" section to
  `AXXESS_LITE_MONOREPO_BOUNDARY_AND_BUILD_ISOLATION_2026_08_05.md` closing its residual risk #3;
  corrected a now-stale claim in `AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md` ("nothing today
  would stop a request to `<lite-domain>/dashboard` from resolving") that XLA-21/XL-4 have since
  made false. `AXXESS_LITE_CAPACITOR_TARGET_SETUP_2026_08_05.md` checked, found not relevant to
  runtime route/API gating -- left untouched.
- **Demo dataset labels cannot render on Lite** (prompt item 5): already enforced at the source
  level by `lite-boundary-guard.mjs`'s existing forbidden-pattern check for `demoDataset`,
  `demoOrganization`, `demoUserContext`, `"North East Health Mission"`, `"Ananya Rao"` inside any
  Lite source file (XL-3, unchanged this pass) -- no new code needed, confirmed still passing.
- **Verification re-run**: `pnpm run lite:guard` (26 files, extended checks included),
  `pnpm exec vitest run src/proxy.test.ts src/features/lite src/config/liteSurfaceHosts.test.ts
  src/demo/demoMode.test.ts` (all pass), `tsc --noEmit`, `eslint . --max-warnings=0` -- all clean.

**Not done from the fuller prompt, deliberately:**
- Did not create a second closeout file under the prompt's suggested
  `XL4_LITE_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_06.md` name -- see the filename note at the top of
  this document.
- Did not rebuild the API allowlist as a literal `liteAllowedApiPrefixes` +
  `liteForbiddenApiPrefixes` two-array structure exactly as the prompt's illustrative snippet
  shows. The shipped design (a single deny-by-default allowlist) is a strict superset of that
  intent -- "denylist wins over allowlist" is trivially satisfied when nothing blocked is ever on
  the allowlist, and deny-by-default is safer against a future route being added and forgotten in
  either list. Documented here as a deliberate design choice, not an oversight.
- Did not move surface detection to a new `src/app/surface/surfaceRuntime.ts` path -- the prompt
  offered `liteSurface.ts` or a new path as alternatives; consolidating onto the existing, already
  real `src/config/liteSurfaceHosts.ts` (shared with `src/demo/demoMode.ts`, which a brand-new
  `src/app/surface/*` path would not have been) was judged the better fit.

## Final Closeout Judgment

**Question the prompt asks this closeout to answer:** Can the Lite Vercel project/domain safely
run from the same repo/root app without exposing X0 or Demo surfaces?

**Answer: Yes, for runtime route/API gating** -- live-verified in production
(`lite.triaxisventures.com`): the full X0 page route tree redirects to `/lite` (XLA-21), the full
X0/agentic/social-alert/admin API surface 404s at the edge (XL-4), and Investor Demo mode is
forced off on the Lite surface both server- and client-side, independent of env-var
misconfiguration. **The remaining caveat, unchanged from the prompt's own expected framing:** full
build-level isolation still requires the `apps/lite-web` extraction and shared-core package work
flagged as out of scope for this sprint (residual risks #1, #2, #4, #5, #6 in
`AXXESS_LITE_MONOREPO_BOUNDARY_AND_BUILD_ISOLATION_2026_08_05.md`) -- a Lite deployment today is
runtime-safe, not yet fully build-independent from X0.

## Commit Hash

- `29a37e7` -- `feat(lite): XL-4 -- Lite host runtime gate and API surface entitlement`
- `af97e98`, `3d9edfe` -- closeout doc updates (commit hash, full-suite verification results)
- `9b92ea9` -- `refactor(lite): consolidate liteSurface.ts onto liteSurfaceHosts.ts`
- Plus the 2026-08-06 addendum commit (test coverage additions, guard script extension, docs
  updates) -- see this branch's git log for the exact hash.

## Push/Deploy Status

**Pushed and deployed.** `29a37e7` merged to `main` via #184 (2026-08-05); `triaxis-product-lite-web`
deployed to production and live-verified via `curl` (page redirect intact, blocked API paths
return 404, allowed API paths reach their handler, X0 host unaffected). The 2026-08-06 addendum
work (test coverage, guard extension, docs, `liteSurface.ts` consolidation) is committed on
`canonical/sprint-1-35-unified-gitlab`; no runtime behavior changed by the addendum, so no
redeploy is required for it to take effect -- push/PR status for the addendum commits to be
confirmed separately.
