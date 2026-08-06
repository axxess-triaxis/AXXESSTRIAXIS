# XL-3 Closeout -- Lite Workspace Boundary and Build Isolation

Date: 2026-08-05
Sprint: XL-3 -- Lite Workspace Extraction, Boundary Gates and Build Isolation
Status: Code and documentation complete; full suite attempted but timed out locally. Lite-specific gates, typecheck, lint, build, and Lite Capacitor doctor passed.

## Objective

Answer whether AXXESS Lite can safely share the same Git repo with X0 Web and Investor Demo while being treated as a separate product surface.

## What Changed

- Added `apps/lite-web/package.json` as the first Lite workspace boundary package.
- Added `scripts/lite-boundary-guard.mjs` to fail on forbidden Lite imports/references.
- Added `scripts/validate-lite-mobile-target.mjs` to prove Lite Mobile does not wrap X0.
- Added `src/features/lite/liteFeatureRegistry.ts` with the 14 founder-approved Lite surfaces.
- Added `src/features/lite/liteSurface.ts` to mark Lite as its own product surface.
- Added tests for the Lite feature registry and Lite surface marker.
- Added root scripts:
  - `lite:guard`
  - `lite:test`
  - `lite:typecheck`
  - `lite:build`
  - `lite:mobile:validate`
  - `lite:ci`
- Added `docs/readiness/AXXESS_LITE_MONOREPO_BOUNDARY_AND_BUILD_ISOLATION_2026_08_05.md`.
- Synced Lite Vercel docs to reflect the founder-reported `triaxis-product-lite-web` project.

## What Did Not Change

- No separate Git repo was created.
- No backend was forked.
- No Supabase schema was forked.
- No large X0 route tree was moved.
- Current `/lite` route remains active and transitional.
- `apps/lite-web` is not yet a fully extracted standalone Next app.
- No native Lite Android/iOS projects were generated.
- No Vercel project settings were changed or independently verified.

## Current Architecture Decision

The selected implementation is **Option B -- Boundary-First Preparation**.

Reason: a full `apps/lite-web` extraction requires safely moving shared service/repository/auth layers into packages. Doing that in this sprint would be a high-risk refactor against X0. The safer move is to add hard boundaries now, then extract in a controlled follow-up.

## Verification Log

| Command | Result | Notes |
|---|---|---|
| `pnpm install --frozen-lockfile --ignore-scripts` | Passed | Required after adding `apps/lite-web`; lockfile now includes `apps/lite-web: {}`. |
| `node scripts/lite-boundary-guard.mjs` | Passed | Scanned 26 Lite files. |
| `node scripts/validate-lite-mobile-target.mjs` | Passed | Lite Capacitor config is distinct from X0 and points at Lite. |
| `pnpm run lite:test` | Passed | 5 test files, 34 tests. |
| `pnpm run lite:ci` | Passed | Boundary guard + Lite tests + Lite mobile validation. |
| `pnpm run typecheck` | Passed | `tsc --noEmit`. |
| `pnpm run lite:typecheck` | Passed | Delegates to `tsc --noEmit`. |
| `pnpm run lint` | Passed | `eslint . --max-warnings=0`, zero warnings. |
| `pnpm run build` | Passed | Root Next build completed, 154 static pages generated. |
| `pnpm run lite:build` | Passed | Boundary guard passed, then transitional root Next build completed. |
| `pnpm run mobile:lite:capacitor:doctor` | Passed | Capacitor doctor completed. Notes installed Capacitor 7.6.7 vs latest 8.5.0. |
| `pnpm run test` | Attempted, not completed | First run found one stale Stakeholders test assertion unrelated to Lite; fixed and focused rerun passed 10/10. Full suite then timed out twice locally, including one 20-minute run, leaving orphan Vitest workers that were cleaned up. |

## Import Guard Coverage

The guard scans:

- `src/app/lite`
- `src/features/lite`
- `apps/lite-web`
- `apps/mobile-lite-capacitor`

It fails on:

- X0 dashboard imports
- Social Alerts imports
- Beta readiness imports
- X0 Settings/Admin imports
- full Integrations page imports
- Demo data/control imports
- X0 shell chrome imports
- Golden Path / Tenant Health command-center code references
- Agentic workflow references
- known demo dataset names

Test files under `src/features/lite` may contain forbidden terms only to assert absence.

## Vercel Build Recommendation

Transitional:

- Root Directory: `.`
- Build Command: `pnpm run lite:build`
- Install Command: `pnpm install --frozen-lockfile`

Durable:

- Root Directory: `apps/lite-web`
- Build Command: `pnpm --filter @axxess/lite-web build`
- Install Command: `pnpm install --frozen-lockfile`

## Mobile Recommendation

Keep `apps/mobile-lite-capacitor` separate from `apps/mobile-capacitor`.

Do not generate native projects until:

- final Lite domain is confirmed
- final Android/iOS app IDs are founder-approved
- Lite host route gate is in place
- Lite mobile validation remains green

## Residual Risks

1. ~~Route-only Lite can still theoretically coexist with X0 routes on the same deployed Next app until host-based route blocking is added.~~ **Closed 2026-08-06 (XL-4):** host-based route blocking shipped at `src/proxy.ts` (`liteSurfaceHosts.ts`-driven allowlist gating both page routes and `/api/*`), with regression tests in `src/proxy.test.ts`. See `AXXESS_LITE_XL4_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_05.md`.
2. `apps/lite-web` is not yet a true standalone build target. **Still open as of 2026-08-06, but real progress made:** `packages/core` now exists, holding the zero-runtime-dependency subset of the shared layer (`domain/`, `services/contracts.ts`, `repositories/interfaces.ts`, ~907 type-only lines, commit `b41196b`). The larger, ~5,000-line extraction (the concrete Supabase-backed repositories and `applicationServices` itself, reaching into the AI provider system and demo dataset) was deliberately deferred as its own dedicated pass after the real dependency closure was mapped and the risk was reviewed with the founder directly. `apps/lite-web`'s build script still delegates to the root app -- see `docs/readiness/LITE_WEB_PACKAGES_CORE_EXTRACTION_PHASE1A_CLOSEOUT_2026_08_06.md` for the full picture.
3. Full `pnpm run test` still needs one clean uninterrupted run in CI or a longer local window; Lite-specific tests passed. Still open as of 2026-08-06 — a bounded 580s local attempt this date did not complete either (see `CODING_PROGRESS_TRACKER_2026_07_30.md`, 2026-08-06 snapshot); this remains a known sandbox/environment limitation, not something CI status has confirmed either way.
4. Lite Vercel settings are not independently verified. **Still open as of 2026-08-06** — no Vercel dashboard/CLI access exists in this environment to confirm domain assignment or project-level settings directly; XL-4's host-based application-layer gate (risk #1 above) now provides a backstop that does not depend on Vercel dashboard configuration being correct, but the dashboard settings themselves remain unverified. This is a genuine gap, not filled in here to avoid fabricating evidence.
5. Lite feature registry is an allowlist, not yet a full backend entitlement system. Still open as of 2026-08-06 — unchanged by XL-4/XL-5/XL-6.

## Next Recommended Sprint

**XL-4: Lite Host Runtime Gate and Shared Core Extraction Plan**

Focus:

1. Block X0 routes on Lite host.
2. Add `AXXESS_SURFACE=lite` runtime enforcement.
3. Decide first shared-core extraction package.
4. Add Vercel ignored-build configuration once project settings are available.

## Status Judgment

Same-repo Lite is technically viable and cost-efficient. It is tenable only if the new guards become mandatory and the current route-only state remains explicitly transitional.
