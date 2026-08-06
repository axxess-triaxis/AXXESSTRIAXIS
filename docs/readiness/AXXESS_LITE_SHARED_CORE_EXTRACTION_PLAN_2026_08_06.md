# AXXESS Lite -- Shared-Core Extraction Plan

Date: 2026-08-06
Sprint: XL-5 (Phase 1)

Planning provenance: Codex-drafted execution prompt, "XL-5: Lite Workspace Extraction Phase 1 and
Shared-Core Package Plan," founder standing decision restated in the prompt itself: "Same Git
repo: yes. Same root Next app route forever: no."

## 1. Dependency Audit

Built from actual code (`grep`, direct file reads), not assumptions. Covers every production
(non-test) import in `src/app/lite/*`, `src/features/lite/*`, and `apps/mobile-lite-capacitor/*`.

| Dependency | Current location | Type | Can move to package now? | Risk |
|---|---|---|---|---|
| `liteNavItems`, `liteNavItemForPath`, `LiteSection`, `LiteNavItem`, `liteTopLevelNavLimit` | was `src/features/lite/liteNavigation.ts` | Lite manifest | **Yes -- moved this sprint** | Low. Zero framework/auth deps beyond `lucide-react` (a real npm package, portable). Now `packages/features-lite/src/liteNavigation.ts`; old location re-exports. |
| `liteFeatures`, `liteFeatureLimit`, `LiteFeature`, `LiteFeatureStatus` | was `src/features/lite/liteFeatureRegistry.ts` | Lite manifest | **Yes -- moved this sprint** | Low. Zero imports at all -- pure data. Now `packages/features-lite/src/liteFeatureRegistry.ts`; old location re-exports. |
| `getLiteSurface`, `isLiteSurface`, `isForbiddenForLiteSurface`, `AxxessSurface`, `liteSurfaceId` | `src/features/lite/liteSurface.ts` | Surface marker | **No, blocked** | Depends on `src/config/liteSurfaceHosts.ts`, which is genuinely shared/cross-cutting core (also consumed by `src/proxy.ts` and `src/demo/demoMode.ts` -- neither is Lite-only). Moving `liteSurface.ts` alone into `packages/features-lite` without also moving `liteSurfaceHosts.ts` would either duplicate its logic (drift risk, exactly what XL-4 fixed once already) or force `packages/features-lite` to import from `src/config/*` (a package importing from the root app -- backwards, and not truly portable). `liteSurfaceHosts.ts` itself is not Lite-only, so it doesn't belong in `packages/features-lite` either -- it would need a more general `packages/core` (see Section 4). Deferred, not silently dropped. |
| `LiteShell` | `src/features/lite/LiteShell.tsx` | Lite UI | No, not yet | Depends on `next/link`, `next/navigation` (Next.js internals) and `useAuth` from `src/auth/AuthProvider.tsx` (shared runtime, client/server session coupling -- see next row). Moving a component that imports Next.js routing hooks into a package is only safe once that package is itself built as (or consumed by) a Next.js app; today it isn't. |
| `LiteHomeSection` | `src/features/lite/sections/LiteHomeSection.tsx` | Lite UI | No, not yet | Same blockers as `LiteShell`: `next/link`, `useAuth`. Also directly imports `liteNavItems` (now resolvable from the package, but the component itself isn't moved). |
| `LiteSettingsSection` | `src/features/lite/sections/LiteSettingsSection.tsx` | Lite UI | Maybe, later | Only imports `next/link` and `lucide-react` -- no `useAuth`, no root-app-only dependency. Still blocked on the Next.js `Link` coupling (same reasoning as above), but has the fewest blockers of the three Lite UI components -- flagged as the best next candidate once a UI-primitives package exists. |
| `LitePlaceholderSection` | `src/features/lite/sections/LitePlaceholderSection.tsx` | Lite UI | **Closest to yes** | Only imports a type from `lucide-react`. No Next.js imports, no auth, no root-app coupling at all -- purely presentational (`title`/`description`/`icon` props). The single most portable Lite UI component in the codebase today. Not moved this pass because there is not yet a `packages/ui` or `packages/features-lite`-UI convention to put it in, and moving one component in isolation ahead of a real UI-package plan would be premature scaffolding, not a real step. |
| `useAuth`, `AuthProvider` | `src/auth/AuthProvider.tsx` | Shared runtime | No / later | Client/server session coupling, cookie handling, Supabase auth client wiring -- used identically by X0 and Lite today (the doctrine's own "same kernel" decision). An adapter interface (Section 4, step 3) is the correct extraction shape, not a raw move. |
| `AnalyticsProviderShell` | `src/services/analytics` | Shared runtime | Later | Env-driven (Mixpanel/PostHog keys) and privacy-posture-gated; XL-3's own boundary doc already flags "analytics keys before Lite privacy posture is approved" as a blocker. Not revisited this pass. |
| `apps/mobile-lite-capacitor/*` | `capacitor.config.ts`, `package.json` only | Mobile config scaffold | N/A | No `src/`, no React/TS code to audit -- config-only per XL-1/XL-3, unchanged. Nothing to extract because there is nothing built yet (native Android/iOS projects remain blocked on DUNS issuance, XLA-23/24/25). |

## 2. What Can Move Now

Exactly two files, both moved this sprint: `liteNavigation.ts`, `liteFeatureRegistry.ts` -> `packages/features-lite`.
Both share the same profile: pure TypeScript, zero-or-third-party-only imports, already fully
covered by tests, already the subject of dedicated isolation tests
(`liteNavigation.test.ts`/`liteFeatureRegistry.test.ts` proving they never reference X0/demo
vocabulary). This is exactly the "pure Lite manifests/types/helpers" category this plan's own
recommended sequence (Section 4) puts first.

## 3. What Cannot Move Yet (and Why)

- **`liteSurface.ts`** -- blocked on its own dependency (`liteSurfaceHosts.ts`) not being Lite-only.
  See the audit table above.
- **All three Lite UI components** (`LiteShell`, `LiteHomeSection`, `LiteSettingsSection`) -- blocked
  on Next.js routing-hook coupling (`next/link`, `next/navigation`) and, for two of the three, the
  shared `AuthProvider`. Moving React components into a package while they still import
  `next/navigation` only works if the *consumer* of that package is itself a Next.js app -- which
  `apps/lite-web` is not yet (see its new README).
- **`AuthProvider`/`useAuth`** -- deliberately not touched. This is shared-kernel code (same auth
  for X0 and Lite, per the doctrine's core architectural decision); extracting it requires an
  adapter-interface design (Section 4, step 3), not a raw file move, and doing it hastily risks
  breaking real sign-in for both surfaces -- exactly what this sprint's non-negotiables forbid.
- **`AnalyticsProviderShell`** -- blocked on privacy-posture approval, a founder decision, not an
  engineering one. Unchanged from XL-3's own assessment.

## 4. What Must Stay Root-App-Bound (For Now)

- `src/app/lite/*` (the actual Next.js route files) -- these are Next.js App Router pages; there is
  no meaningful way to "extract" a route file without the app it routes within.
  `src/proxy.ts` (the runtime host/API gate, XLA-21/XL-4) -- Edge Runtime middleware is a Next.js
  convention tied to the app it protects; it cannot be extracted into a package.
- The concrete Supabase repository implementations (`src/repositories/supabaseEnterpriseRepositories.ts`,
  63KB, confirmed by direct read this pass) -- shared by X0 and Lite identically today. A
  repository *interface* package (Section 5, step 4) is the right shape; the concrete
  implementation stays root-app-bound until/unless a genuine second consumer needs it duplicated
  (it should not be duplicated -- shared via interface instead).
- `src/providers/serviceProvider.ts` (16KB, confirmed by direct read this pass) -- the service
  construction graph. A service-provider *bridge* (Section 5, step 5) is the right shape.

## 5. What Needs Adapter Interfaces

- **Auth adapter interface**: a narrow, Lite-facing contract (`getSession()`, `signIn()`,
  `signOut()`, session status) that `packages/features-lite` (or a future `packages/lite-core`)
  can depend on, implemented by `AuthProvider.tsx` today and potentially by a different transport
  later without Lite's own code changing.
- **Repository interface package**: the existing `src/repositories/interfaces.ts`-style contracts
  (referenced elsewhere in this codebase, e.g. `TenantScope` typing used throughout) are the
  natural seed for this -- extracting the *interfaces* (already mostly decoupled from Supabase
  specifics) is lower-risk than extracting the *implementations*.
- **Service-provider bridge**: `src/providers/serviceProvider.ts` likely already separates
  "which repository implementation" from "which service consumes it" internally (matching this
  repo's established demo/live repository-swap pattern used elsewhere) -- confirming that shape is
  the first task of the next extraction phase, not assumed here.

## 6. What Risks Breaking X0

- Any move of `src/auth/AuthProvider.tsx` itself (not just consuming it via an adapter) -- X0 and
  Lite share the exact same auth implementation today; a careless split risks two auth code paths
  drifting, reintroducing a session-security class of bug this program has already fixed multiple
  times this session (A-84/A-86/A-87).
- Any move of the concrete Supabase repositories -- same reasoning, shared implementation today.
- Renaming or moving `src/app/lite/*` route files -- would change the actual URL structure
  `triaxis-product-lite-web` serves, a production-visible change requiring explicit sign-off, not
  something to do as a side effect of a package-extraction sprint.

## 7. Recommended Extraction Sequence

1. **Pure Lite manifests/types/helpers.** Done this sprint (`liteNavigation.ts`,
   `liteFeatureRegistry.ts` -> `packages/features-lite`). `liteSurface.ts` remains, blocked on step
   below applying to its own dependency first.
2. **Shared UI primitives.** Candidate: `LitePlaceholderSection` (see audit table -- the most
   portable Lite UI component today) once a `packages/ui` or equivalent convention exists. Not
   started this pass.
3. **Auth adapter interface.** Design the narrow contract described in Section 5. Prerequisite for
   moving any Lite component that currently calls `useAuth` directly.
4. **Repository interface package.** Extract interfaces (not implementations) so Lite's future data
   access depends on contracts, not concrete Supabase code.
5. **Service-provider bridge.** Once 3 and 4 exist, `apps/lite-web` can construct its own service
   graph without importing the root app's `src/providers/serviceProvider.ts` directly.
6. **Real `apps/lite-web` Next app.** Only once 3-5 exist: give `apps/lite-web` its own `app/`,
   `next.config.mjs`, and independently buildable output.
7. **Vercel root directory flip.** Only once 6 is proven to build and authenticate correctly:
   change `triaxis-product-lite-web`'s Vercel project "Root Directory" setting from `.` to
   `apps/lite-web`.

**Steps 3-7 are explicitly not started this pass** -- XL-5 Phase 1 is step 1 only, per the
prompt's own framing ("This is not a full migration sprint. It is the first controlled extraction
pass").
