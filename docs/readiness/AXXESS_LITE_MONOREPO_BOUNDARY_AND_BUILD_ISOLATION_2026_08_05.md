# AXXESS Lite -- Monorepo Boundary and Build Isolation

Date: 2026-08-05
Sprint: XL-3 -- Lite Workspace Extraction, Boundary Gates and Build Isolation
Status: Implemented boundary-first scaffold and guard plan. Not a production-readiness claim.

## Executive Summary

AXXESS Lite should stay in the same Git repository as X0 Web and Investor Demo. The cost and speed advantages are real: shared auth, tenant scope, Supabase repositories, audit, document, RAG, analytics, and payment foundations should not be forked.

The durable architecture is not "Lite as just another route forever." The durable architecture is:

```txt
apps/
  x0-web
  demo-web
  lite-web
  mobile-capacitor
  mobile-lite-capacitor

packages/
  core
  ui
  features-lite
  features-x0
```

XL-3 establishes the first enforceable step toward that shape: `apps/lite-web` now exists as a workspace boundary package, while the current `/lite` route remains the transitional runtime surface until the shared service layer can be safely extracted.

## Current State

| Area | Current state |
|---|---|
| Lite Web route | `src/app/lite/*` exists and renders through `src/features/lite/LiteShell.tsx` rather than X0 `AppShell`/`Sidebar`/`TopBar`. |
| Lite feature shell | `src/features/lite/*` contains Lite navigation, shell, placeholder sections, settings, and tests. |
| Lite workspace package | `apps/lite-web/package.json` now exists as `@axxess/lite-web`. It is a boundary/control package, not a fully extracted standalone app yet. |
| Lite mobile | `apps/mobile-lite-capacitor/capacitor.config.ts` exists and points at the Lite surface rather than the X0 root by default. |
| Root Vercel config | `vercel.json` still builds the root app with `pnpm run build`. This remains a current risk for the Lite project if used unchanged. |
| Vercel Lite project | Founder-reported project: `triaxis-product-lite-web`, URL `https://vercel.com/axxess-tri-axis-powered-by-triaxis-ventures/triaxis-product-lite-web`. Not independently verified by this pass. |

## Target State

Lite should become a separately bounded app inside the monorepo:

- Vercel project root: eventually `apps/lite-web`.
- Build command: `pnpm --filter @axxess/lite-web build`.
- Install command: `pnpm install --frozen-lockfile`.
- Ignored build step: skip Lite deploys when only X0, Demo, docs, or unrelated mobile files changed.
- Runtime surface: `AXXESS_SURFACE=lite`.
- Mobile target: Lite Capacitor points to Lite domain/root only, never X0 root.

## Build Isolation Recommendation

### Transitional phase

Use the current root Next app for runtime while enforcing Lite gates:

```bash
pnpm run lite:ci
pnpm run lite:build
```

This still runs the root Next build, so it is not a complete bundle isolation. It is acceptable only as a transition because the source guards fail if Lite imports forbidden X0/Demo modules.

### Durable phase

Move from route-only Lite to a real workspace app:

```txt
apps/lite-web
packages/core
packages/ui
packages/features-lite
```

Before doing this, extract the shared service layer safely:

- `applicationServices`
- tenant scope helpers
- Supabase repository interfaces
- shared auth/session adapters
- shared UI primitives

Do not duplicate the backend to rush the extraction.

## Recommended Vercel Settings

| Setting | Transitional recommendation | Durable recommendation |
|---|---|---|
| Project | `triaxis-product-lite-web` | `triaxis-product-lite-web` |
| Root Directory | `.` | `apps/lite-web` |
| Build Command | `pnpm run lite:build` | `pnpm --filter @axxess/lite-web build` |
| Install Command | `pnpm install --frozen-lockfile` | `pnpm install --frozen-lockfile` |
| Ignored Build Step | Skip when Lite/shared files did not change | Same, narrower once workspace app is real |
| Domain | `lite.triaxisventures.com` recommended | `lite.triaxisventures.com` recommended |

Recommended affected paths for Lite builds:

```txt
apps/lite-web/**
apps/mobile-lite-capacitor/**
src/app/lite/**
src/features/lite/**
packages/core/**
packages/ui/**
packages/features-lite/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
next.config.*
vercel.json
```

Recommended skip paths:

```txt
docs/**
src/features/dashboard/**
src/features/alerts/**
src/demo/**
apps/mobile-capacitor/**
apps/mobile/**
```

## Environment Variables

Lite can share:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- server-side Supabase credentials where already required by shared server routes

Lite must not blindly inherit:

- X0 `NEXT_PUBLIC_APP_URL`
- X0 Capacitor app identity variables
- X0/mobile `CAPACITOR_SERVER_URL`
- X0/social crons
- X0/demo runtime flags
- analytics keys before Lite privacy posture is approved
- 40+ connector registry assumptions

Lite-specific expected values:

```txt
AXXESS_SURFACE=lite
NEXT_PUBLIC_APP_URL=https://lite.triaxisventures.com
CAPACITOR_SERVER_URL=https://lite.triaxisventures.com
CAPACITOR_LITE_APP_ID=<founder-approved final app id>
```

## Gates Added In XL-3

| Gate | Artifact | What it proves |
|---|---|---|
| Lite workspace boundary | `apps/lite-web/package.json` | Lite has a named workspace package and delegated scripts. |
| Import-deny guard | `scripts/lite-boundary-guard.mjs` | Lite source cannot import or reference forbidden X0/Demo surfaces. |
| Mobile target guard | `scripts/validate-lite-mobile-target.mjs` | Lite Mobile config is distinct from X0 and points at Lite. |
| Feature allowlist | `src/features/lite/liteFeatureRegistry.ts` | Lite exposes only the 14 founder-approved feature surfaces. |
| Surface marker | `src/features/lite/liteSurface.ts` | Lite can be treated as its own product surface in future runtime gates. |
| Root scripts | `package.json` | `lite:guard`, `lite:test`, `lite:build`, `lite:typecheck`, `lite:mobile:validate`, and `lite:ci` are available. |

## Residual Risks

1. `apps/lite-web` is not yet a fully extracted standalone Next app.
2. Root `vercel.json` still builds the full app unless Lite project settings override it.
3. `<lite-domain>/dashboard` host-based route blocking still needs explicit middleware or project routing.
4. Shared Supabase is acceptable, but Lite tenants need product-surface/plan gating before broad rollout.
5. Lite analytics and payment env separation still need founder-approved privacy/commercial decisions.
6. Lite Mobile native Android/iOS projects have not been generated in this pass.

## Next Sprint Recommendation

Run **XL-4: Lite Host Runtime Gate and Shared Core Extraction Plan**.

XL-4 should:

1. Add host/runtime enforcement so Lite domains cannot serve X0 routes.
2. Decide whether `packages/core` extraction starts now or after one more daily-use Lite feature.
3. Add a Vercel ignored-build step once the project settings are available.
4. Add an explicit Lite tenant/product-plan gate in backend-visible feature registry.

## Status Judgment

Same-repo Lite is tenable if these gates stay mandatory. Route-only Lite is transitional. The monorepo remains the correct cost-efficient model, but only with enforced workspace, build, runtime, mobile, and data boundaries.

## XL-4 Update (2026-08-06)

Residual risk #3 above ("host-based route blocking still needs explicit middleware or project
routing") is now closed. `src/proxy.ts` enforces a runtime host/API gate: any non-`/lite`,
non-`/auth` page path on a Lite host redirects to `/lite` (XLA-21), and a deny-by-default API
allowlist (`src/config/liteSurfaceHosts.ts` + `src/proxy.ts`) 404s any `/api/*` path not
explicitly needed by Lite's shipped/planned feature set. `AXXESS_SURFACE=lite` (predicted by this
doc, row 146 above) now has real runtime meaning via `resolveIsLiteSurface()` -- an additive,
optional declaration on top of host detection, not yet configured on any Vercel project. Full
detail: `docs/readiness/AXXESS_LITE_XL4_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_05.md`.

Still open from this doc's original residual-risk list: #1 (`apps/lite-web` not fully extracted),
#2 (root `vercel.json` project-settings override), #4 (tenant/plan gating), #5 (analytics/payment
env separation), #6 (native mobile projects). XL-4 was scoped to runtime route/API gating only,
per its own prompt's explicit non-negotiables (no repo split, no backend duplication, no schema
fork) -- these remain correctly out of scope for a future sprint, not silently dropped.

## XL-5 Update (2026-08-06): Phase 1 extraction started

Residual risk #1 above ("`apps/lite-web` is not yet a fully extracted standalone Next app") is
**narrowed, not closed**. `packages/features-lite` now exists, holding the first two pure Lite
modules extracted out of `src/features/lite/` (`liteNavigation.ts`, `liteFeatureRegistry.ts`,
zero framework/auth dependencies). `apps/lite-web` gained a README documenting exactly what it is
and is not today (a boundary/control package whose scripts all delegate to the root app's build --
not yet a standalone Next.js app). Full dependency audit, extraction sequence, and explicit
blockers (why `liteSurface.ts` and all three Lite UI components could not move this pass):
`docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md`. Closeout:
`docs/readiness/XL5_LITE_WORKSPACE_EXTRACTION_PHASE1_CLOSEOUT_2026_08_06.md`.

The "Surface marker" row in the Gates Added table above (`src/features/lite/liteSurface.ts`) is
now stale in one respect: as of XL-4, it's real (delegates to `src/config/liteSurfaceHosts.ts`),
not just a scaffold "for future runtime gates" -- those runtime gates already shipped.

Residual risks #2, #4, #5, #6 remain open, unchanged, correctly out of scope for this pass.
