# XL-5 Closeout -- Lite Workspace Extraction Phase 1 and Shared-Core Package Plan

Date: 2026-08-06
Sprint: XL-5 (Phase 1)

Planning provenance: Codex-drafted execution prompt, "XL-5: Lite Workspace Extraction Phase 1 and
Shared-Core Package Plan," following directly from the XL-4 runtime-gate sprint in the same
conversation.

## What Moved

- `liteNavigation.ts` (types `LiteSection`/`LiteNavItem`, constants `liteTopLevelNavLimit`/
  `liteNavItems`, function `liteNavItemForPath`) -- from `src/features/lite/liteNavigation.ts` to
  `packages/features-lite/src/liteNavigation.ts`.
- `liteFeatureRegistry.ts` (types `LiteFeatureStatus`/`LiteFeature`, constants `liteFeatureLimit`/
  `liteFeatures`) -- from `src/features/lite/liteFeatureRegistry.ts` to
  `packages/features-lite/src/liteFeatureRegistry.ts`.
- Both modules' full test suites moved alongside them into
  `packages/features-lite/src/*.test.ts`.

Both were the only two files in the entire Lite dependency audit (Section 1 of the extraction
plan) classified "can move to package now: yes" with low risk -- zero framework, auth, or
root-app-aliased imports beyond the third-party `lucide-react` icon library.

## What Did Not Move (and Why)

- **`liteSurface.ts`** -- depends on `src/config/liteSurfaceHosts.ts`, which is genuinely
  shared/cross-cutting (also consumed by `src/proxy.ts` and `src/demo/demoMode.ts`, neither
  Lite-only). Moving it alone would either duplicate logic or force the package to import from the
  root app. Full reasoning: extraction plan Section 1/3.
- **`LiteShell.tsx`, `LiteHomeSection.tsx`, `LiteSettingsSection.tsx`** -- all three depend on
  `next/link`/`next/navigation` (Next.js internals); two of the three also depend on `useAuth`
  (`src/auth/AuthProvider.tsx`, shared runtime). None of these are safely portable into a package
  until an auth adapter interface exists (extraction plan Section 5, step 3) and/or the package is
  itself consumed by a real Next.js app boundary. `LitePlaceholderSection.tsx` was identified as
  the single most portable Lite UI component (zero Next.js/auth imports at all) but not moved --
  there is no `packages/ui` convention yet to put it in, and moving one component ahead of that
  plan would be premature scaffolding rather than a real step.
- **`AuthProvider`/`useAuth`, `AnalyticsProviderShell`** -- explicitly not touched. Shared-kernel
  code (same auth/analytics for X0 and Lite today); extraction requires adapter-interface design,
  not a raw move, per the sprint's own non-negotiables ("do not create circular imports," "do not
  break X0 Web").

Full audit table and reasoning for every dependency Lite currently uses:
`docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md`.

## Current Extraction Status

**Phase 1 of 7** in the recommended sequence (extraction plan Section 7) is complete: pure Lite
manifests/types/helpers extracted. Phases 2-7 (UI primitives, auth adapter, repository interfaces,
service-provider bridge, real `apps/lite-web` Next app, Vercel root-directory flip) are not
started -- each has an explicit prerequisite chain documented in the extraction plan, and none of
their prerequisites exist yet.

## Is `apps/lite-web` Standalone Yet?

**No.** `apps/lite-web/package.json`'s scripts (`test`, `typecheck`, `build`) all still delegate to
`pnpm --dir ../.. run <script>` -- the root Next.js app's own build, which still produces X0,
Investor Demo, and Lite in one output. `apps/lite-web` gained a new `README.md` this pass stating
this explicitly, including the exact 7-step sequence (extraction plan Section 7) that must
complete before it becomes genuinely standalone, and before the Vercel project's Root Directory
setting could safely flip from `.` to `apps/lite-web`.

## Package Boundary Added

- `packages/features-lite/package.json` -- `@axxess/features-lite`, following the exact pattern
  already established by `packages/shared` (`main`/`types` both pointing at `./src/index.ts`, no
  build step, consumed as TypeScript source directly).
- `packages/features-lite/src/index.ts` -- re-exports both modules.
- Wired into module resolution the same way `@axxess/shared` already is: `tsconfig.json`'s `paths`
  (compiler/Next.js resolution) and `vitest.config.mjs`'s `resolve.alias` (test resolution). Not
  added to `vite.config.ts` -- that file doesn't alias `@axxess/shared` either today, and Lite
  files aren't part of the mobile-Capacitor Vite build's reachable tree, so there was no existing
  precedent to extend.
- Auto-discovered as a workspace project by the existing `packages/*` glob in
  `pnpm-workspace.yaml` -- no manual registration needed (confirmed: `vitest run` logged "Scope:
  all 7 workspace projects" after the package was added, up from 6).
- `src/features/lite/liteNavigation.ts` and `liteFeatureRegistry.ts` are now thin backward-compat
  re-export shims (`export * from "@axxess/features-lite"`) -- every existing consumer
  (`LiteShell.tsx`, `LiteHomeSection.tsx`) keeps working with **zero import-path changes**, a
  deliberate choice (see "Deliberately Not Done" below) to minimize this pass's blast radius.

## Import Guards Strengthened

`scripts/lite-boundary-guard.mjs`:
- Added `packages/features-lite` to both `scanRoots` (forbidden-import scanning) and
  `requiredPaths` (existence check on `packages/features-lite/package.json`).
- Extended the test-file exemption (previously only `src/features/lite/*.test.ts`) to also cover
  `packages/features-lite/*.test.ts` -- symmetry with the existing rule, in case a future isolation
  test in the package needs to reference forbidden terms as literal test data, the same way
  existing Lite isolation tests already do.

`package.json`'s `lite:test` script extended from `src/features/lite src/app/lite` to also include
`packages/features-lite`, so the composite `lite:ci` gate covers the new package too.

## Tests

- `packages/features-lite/src/index.test.ts` (new) -- package export integrity: proves the
  package's public surface (not just the individual source files in isolation) re-exports both
  modules correctly.
- `packages/features-lite/src/liteNavigation.test.ts`, `liteFeatureRegistry.test.ts` -- the full
  behavioral assertion suites, moved verbatim from their old location.
- `src/features/lite/liteNavigation.test.ts`, `liteFeatureRegistry.test.ts` -- rewritten from full
  duplicate suites down to focused shim-verification tests, proving the backward-compat re-export
  surfaces real, current data (not a stale copy) -- directly satisfies "old `/lite` still uses
  correct Lite modules."
- `lite-boundary-guard.mjs` re-run: still passes, now scanning 33 files (up from 26).

## Verification

- `tsc --noEmit`: clean.
- `eslint . --max-warnings=0`: clean.
- `lite:guard`: passes, 33 files scanned (was 26).
- `lite:test` (updated to include `packages/features-lite`): 8 test files, 42 tests, all pass.
- `cap doctor` (mobile-lite-capacitor): clean, informational Capacitor version-drift note only
  (7.6.7 installed vs 8.5.0 latest), pre-existing, unrelated to this sprint.
- `lite:ci` and `lite:build` composite scripts: both fail on this sandbox's known bare-`pnpm`-in-
  nested-script PATH quirk (documented repeatedly this session, e.g. XL-4's closeout) -- not a
  code issue. Their constituent steps were run individually via `corepack pnpm` and all passed.
- **Whole-repo `pnpm run test`: not re-attempted this pass.** The XL-4 closeout already
  established (same session, same sandbox) that this specific environment cannot complete a
  ~242-file single-process run regardless of pool/parallelism configuration (confirmed OOM at
  ~52 minutes in a prior attempt, 241/242 files and 1240/1244 tests passed with zero failures
  before the crash). Re-running the full suite for this smaller, additive change would not produce
  new information about this change specifically -- the scoped Lite/package test run (42/42 pass)
  plus `tsc`/`eslint` (both clean across the whole repo) is the evidence basis for this closeout.
  Not claimed as a full-suite pass.

## Residual Risks

1. `apps/lite-web` is still not a standalone Next app -- narrowed from XL-3's original framing, not
   closed. See the "Is `apps/lite-web` Standalone Yet?" section above.
2. `liteSurface.ts` remains un-extracted, blocked on `liteSurfaceHosts.ts`'s own eventual home
   (likely a future `packages/core`, not `packages/features-lite` -- it isn't Lite-only).
3. All three Lite UI components remain root-app-bound, blocked on the auth-adapter and Next.js-
   boundary prerequisites described in the extraction plan.
4. The backward-compat shims in `src/features/lite/` mean there are now two valid import paths for
   the same data (`@axxess/features-lite` directly, or the old relative path through the shim).
   This is an intentional, temporary state to minimize this pass's blast radius -- not a
   permanent design. A future pass should either update the direct consumers
   (`LiteShell.tsx`, `LiteHomeSection.tsx`) to import from the package directly and remove the
   shims, or make the shim's transitional nature more visible (e.g. a lint rule) if it's expected
   to persist for a while.
5. `AXXESS_LITE_PRODUCT_SURFACE_ROADMAP_2026_08_05.md` was checked (per the prompt's "update if
   relevant" instruction) -- its one reference to `liteNavigation.ts` (checklist item #10) remains
   accurate since the shim preserves that file's existence and behavior; not edited.
6. Residual risks #2, #4, #5, #6 from `AXXESS_LITE_MONOREPO_BOUNDARY_AND_BUILD_ISOLATION_2026_08_05.md`
   (Vercel project-settings override, tenant/plan gating, analytics/payment env separation, native
   mobile projects) remain open, unchanged, correctly out of scope for this pass.

## Next Extraction Step

Per the recommended sequence (extraction plan Section 7): **Phase 2, shared UI primitives**,
starting with `LitePlaceholderSection` once a `packages/ui` (or equivalent) convention is decided
-- the next lowest-risk move identified in this pass's dependency audit, but deliberately not
started here since no such package convention exists yet and inventing one for a single component
would be scaffolding ahead of a real plan, not a real step.

## Final Closeout Judgment

**Question this closeout must answer:** Did this sprint safely move AXXESS Lite closer to a real
separate workspace app without destabilizing X0?

**Answer: Yes.** Two pure, dependency-free, fully-tested Lite modules were genuinely extracted
into a real package (not mirrored/duplicated), with zero changes required to X0 (confirmed:
`tsc --noEmit` and `eslint` clean across the whole repo, and `packages/features-lite` was
auto-discovered by the existing workspace glob with no new root-level dependency declarations).
Every module that could not safely move this pass has its exact blocker documented in the
extraction plan, not silently skipped. `apps/lite-web` is measurably clearer than before (a real
README stating precisely what it is, is not, and what must happen before it becomes standalone)
even though it remains transitional -- exactly the outcome this prompt's own expected answer
described.
