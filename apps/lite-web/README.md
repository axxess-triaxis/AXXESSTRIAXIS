# @axxess/lite-web

**Status: transitional boundary/control package. This is NOT yet a standalone Next.js app.**

## What this package actually is today

This directory exists to give AXXESS Lite a named workspace package with its own `package.json`
and delegated scripts (`guard`, `test`, `typecheck`, `build`, `mobile:validate`, `ci`) -- a real
place for Lite-specific tooling to live, and a target for `pnpm --filter @axxess/lite-web <script>`.
It does **not** contain its own `app/`, `pages/`, or `next.config.mjs`. Every one of its scripts
delegates to the root Next.js app (`pnpm --dir ../.. run <script>`), which still builds and serves
the actual `/lite/*` routes (`src/app/lite/*`) that `triaxis-product-lite-web` deploys.

**If you were expecting `apps/lite-web` to be a self-contained Next.js project you can `cd` into
and `next dev` on its own -- it is not that, yet.** Running `pnpm --filter @axxess/lite-web build`
today runs the *entire root app's* build (X0 + Investor Demo + Lite, all in one Next.js build
output), gated first by the Lite boundary guard.

## Why it's built this way (XL-1 through XL-4)

- **XL-1** (2026-08-05): chose "Option A" -- Lite as a route tree (`src/app/lite/*`,
  `src/features/lite/*`) inside the root app, deployed to its own, independent third Vercel
  project. Full detail and the "why not Option B yet" reasoning:
  `docs/readiness/AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md`.
- **XL-3** (2026-08-05): added this package as a named workspace boundary, plus
  `scripts/lite-boundary-guard.mjs` (forbids Lite source from importing X0/Demo modules) and
  `scripts/validate-lite-mobile-target.mjs` (keeps the Lite Capacitor target distinct from X0's).
- **XLA-21 / XL-4** (2026-08-05/06): added the runtime enforcement layer -- `src/proxy.ts`
  host-restricts the Lite domain to `/lite`/`/auth`/an explicit API allowlist, so even though the
  *build* is shared, the *deployed, running* Lite domain cannot serve X0/Demo routes or APIs.
  Full detail: `docs/readiness/AXXESS_LITE_XL4_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_05.md`.
- **XL-5** (2026-08-06, this pass): began extracting pure, dependency-free Lite modules
  (`liteNavigation.ts`, `liteFeatureRegistry.ts`) into `packages/features-lite`, the first real
  step toward this package eventually owning its own build. Full plan:
  `docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md`.

## Scripts

| Script | What it actually runs |
|---|---|
| `guard` | `node ../../scripts/lite-boundary-guard.mjs` -- import-boundary check, runs directly, no delegation |
| `test` | `pnpm --dir ../.. run lite:test` -- runs the Lite-scoped Vitest suite from the root |
| `typecheck` | `pnpm --dir ../.. run typecheck` -- runs the *entire root app's* typecheck |
| `build` | guard, then `pnpm --dir ../.. run build` -- runs the *entire root app's* Next.js build |
| `mobile:validate` | `node ../../scripts/validate-lite-mobile-target.mjs` |
| `ci` | guard + test + mobile:validate, chained |

## What must happen before this becomes a real standalone app

In the sequence recommended by `docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md`:

1. Extract pure Lite manifests/types/helpers into `packages/*` (started this sprint,
   `packages/features-lite`).
2. Extract shared UI primitives Lite needs, once any are identified as safe to share without
   pulling in X0-only chrome.
3. Define an auth adapter interface so Lite doesn't depend directly on
   `src/auth/AuthProvider.tsx`'s full X0-coupled implementation.
4. Extract a repository interface package so Lite's data access doesn't depend on the root app's
   concrete Supabase repository implementations directly.
5. Build a service-provider bridge so Lite can construct its own service graph.
6. Only then: give this package its own real `app/`/`next.config.mjs` and a genuinely independent
   `next build`.
7. Only then: flip `triaxis-product-lite-web`'s Vercel "Root Directory" project setting from `.`
   (repo root) to `apps/lite-web`.

**None of steps 3-7 have happened yet.** Claiming this package is build-independent from the root
app before that point would be false -- see the non-negotiables in
`docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md` and the XL-5 closeout.
