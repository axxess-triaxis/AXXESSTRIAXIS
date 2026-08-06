# AXXESS Lite -- Vercel Project Setup Plan

Date: 2026-08-05
Sprint: XL-1 -- AXXESS Lite Web Project and Separate Capacitor Target Setup
Status: Superseded by founder update and XL-3 boundary work. The founder has since reported that the Vercel project exists at `https://vercel.com/axxess-tri-axis-powered-by-triaxis-ventures/triaxis-product-lite-web`. This document's original "not created" language is kept below only as historical XL-1 context; current build-isolation guidance is now in `docs/readiness/AXXESS_LITE_MONOREPO_BOUNDARY_AND_BUILD_ISOLATION_2026_08_05.md`.

## Required Technical Decision (read this before the setup below)

Two implementation shapes were considered for X Lite Web, per this sprint's own framing:

- **Option A** -- a route tree inside the current Next.js app (`src/app/lite/*`, `src/features/lite/*`).
- **Option B** -- a fully separate workspace app (`apps/lite-web`), its own Next.js/Vite project, importing shared packages/services.

**Decision: Option A, deployed to its own, independent third Vercel project** -- not full Option B, and not Option A merged into X0's existing project either. This is a specific, deliberate middle point, recorded here because neither label alone describes it accurately:

- **Why not full Option B this sprint:** X0's shared repository/service layer (`applicationServices`, `tenantScopeFromUser`, the concrete Supabase repositories) lives inside the root Next.js app's `src/`, not in `packages/shared` (confirmed by inspecting `packages/shared/src` -- it currently exports only what the Expo mobile app needs, a thin stub, not a general-purpose service layer). Building a real, functioning `apps/lite-web` that reuses this layer rather than duplicating it would require extracting that layer into a shared package first -- a nontrivial refactor that risks the very thing this sprint's non-negotiables forbid ("do not simplify or degrade X0 Web," by extension do not destabilize it with a large extraction mid-sprint). This sprint's own scope is explicitly "surface separation and deploy/mobile readiness, not full product feature implementation" -- XL-2 is where real repository wiring happens, per the roadmap's own sequencing, so the extraction question can be revisited then with an actual daily-use-loop feature in hand to judge it against.
- **Why not Option A deployed into X0's existing project:** the founder explicitly wants a separate Web Lite Vercel project. Deploying the same repo to a genuinely separate, third Vercel project (exactly the pattern this repo already uses twice -- `triaxis-www-frontend-import` and `triaxis-product-investor-demo`, both built from this same repo, deployed independently, per `.github/workflows/deploy-production.yml`) achieves real deploy/build separation (separate project, separate domain, separate env vars, separate deploy history, separate rollback) without the Option B extraction risk.
- **What this does not yet achieve (as of XL-1, 2026-08-05):** because it's the same Next.js app, a build deployed to the new Lite project would, absent further work, still be *capable* of serving X0's routes (`/dashboard`, `/admin/*`, etc.) if someone navigated to them on the Lite domain -- Next.js's own route-based code-splitting (`React.lazy()` in `src/app/routing/lazyRoutes.tsx`) means a Lite user who only ever visits `/lite/*` never downloads X0's dashboard bundle, but nothing today would stop a request to `<lite-domain>/dashboard` from resolving. **This is a known, explicitly flagged gap, not a silent omission**: closing it requires either a middleware/host-based route restriction (extending the existing host-aware redirect logic already in `src/proxy.ts`, e.g. `getCanonicalHostRedirectUrl`/`getBetaRootRedirectUrl`) or a Vercel-level rewrite/redirect rule scoped to the Lite project, and is recommended as the next actionable before the Lite domain is given to real users -- tracked as a new actionable in this sprint's closeout, not yet built.
  **Closed as of XLA-21 (page routes, 2026-08-05) and XL-4 (API routes, 2026-08-06):** `src/proxy.ts` now redirects any non-`/lite`/`/auth` page path to `/lite` and 404s any `/api/*` path not on an explicit Lite allowlist, both host-scoped so X0/Investor Demo are unaffected -- live-verified on `lite.triaxisventures.com`. Full detail: `docs/readiness/AXXESS_LITE_XL4_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_05.md`.
- **Extraction path to genuine Option B, for the record:** if XL-2's daily-use-loop work later shows the shared repository layer needs to live in a real package (e.g. because `apps/lite-web` or a Lite-specific Capacitor bundling strategy needs a headless build independent of the root Next.js app), the reversal path is: extract `applicationServices`, `tenantScopeFromUser`, and the concrete repositories into `packages/core` (a new workspace package, following the existing `packages/shared` precedent), then have both the root app and a new `apps/lite-web` import from it. Not undertaken this sprint.

## Proposed Vercel Project

- **Name:** `triaxis-product-lite-web` (founder later reported this project has been created/deployed; not independently verified by this document).
  **2026-08-06 closure:** now independently verified. `npx vercel project ls` (Vercel CLI, authenticated) lists `triaxis-product-lite-web` with Latest Production URL `https://lite.triaxisventures.com`, and `npx vercel alias ls` shows `lite.triaxisventures.com` aliased to a `triaxis-product-lite-*.vercel.app` deployment. A direct `curl -s -D - https://lite.triaxisventures.com` independently confirms `HTTP/1.1 307`, `Server: Vercel`, and an `X-Vercel-Id` header, i.e. the domain is live and actually served by this Vercel project, not just configured. This closes the "not independently verified" caveat; the project's Vercel-dashboard-only settings (e.g. host-restriction toggles not expressible via CLI) remain out of scope for this note.
- **Framework:** Next.js (same as the two existing projects).
- **Root directory:** `.` (repo root -- same codebase as X0/Investor Demo; Option A means there is no separate app subdirectory to point at).
- **Build command:** `pnpm run build` (same as `triaxis-www-frontend-import`/`triaxis-product-investor-demo`; no Lite-specific build exists this sprint -- see the "known gap" note above and this sprint's decision not to fabricate a fake-distinct `lite:build` script, per this program's standing rule against checklist-theater/stat-padding).
- **Install command:** `pnpm install --frozen-lockfile` (matches `vercel.json`).

## Environment Variables

| Category | Variables | Treatment |
|---|---|---|
| **Can be shared with X0 as-is** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Same backend, same tenant model, per the doctrine's shared-core principle (`docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md` Section 4). Lite tenants are the same kind of row as X0 tenants. |
| **Must differ** | `NEXT_PUBLIC_APP_URL` | Must point at the Lite project's own domain (see below), not `landing.triaxisventures.com` -- this is also the value the Lite Capacitor config's `server.url` fallback reads (see the companion Capacitor doc), so getting this wrong would make a Lite mobile build silently load the wrong web surface. |
| **Must differ (once analytics posture is decided)** | `NEXT_PUBLIC_MIXPANEL_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY` (if used) | Founder decision #4 in the doctrine's Section 13 (analytics privacy posture for Lite's typically more privacy-sensitive small-business/NGO users) is not yet made. Do not copy X0's analytics keys onto the Lite project until that decision is made -- until then, leaving these unset (falling back to `MockAnalyticsProvider`, the existing safe no-op default per `docs/readiness/CUSTOMER_ACQUISITION_FUNNEL_2026_07_24.md`'s Section 8) is the honest default. |
| **Must NOT be copied blindly** | `CAPACITOR_SERVER_URL`, `CAPACITOR_ALLOWED_HOSTS`, `CAPACITOR_APP_ID` (X0 Mobile's Capacitor env vars) | These belong to `apps/mobile-capacitor` and X0 Mobile's identity. The new `apps/mobile-lite-capacitor` scaffold has its own equivalents (`CAPACITOR_LITE_APP_ID`, etc., see the companion Capacitor doc) -- copying X0's values here would misconfigure Lite Mobile to point at X0's web app. |
| **Must NOT be copied blindly** | Any per-project Vercel Cron config | `vercel.json`'s two crons (`pilot-command-center-snapshot`, `social-connector-sync`) are X0/tenant-operational jobs. Whether they should also run against the Lite project (duplicating the job) or only run once against X0's project (since it's the same Supabase backend) is an open question -- **recommendation: do not enable crons on the Lite project**, since the underlying data they operate on is shared, and running the same cron twice against the same backend risks duplicate writes/rate-limit issues. Not decided by this document; flagged for the founder. |

## Suggested Domain

Two options, per this sprint's own framing:

- `lite.triaxisventures.com` (subdomain)
- `app.triaxisventures.com/lite` (path-based, on an existing domain)

**Recommendation: `lite.triaxisventures.com`.** A dedicated subdomain gives the new Vercel project a clean domain-to-project mapping (matching the existing `landing.`/`investor.` pattern already in place), makes the "known gap" above easier to close later via host-based middleware (one hostname to check, not a path prefix that could also appear on other domains), and gives X Lite Mobile's Capacitor `server.url` a stable, dedicated origin rather than a path suffix on a domain that also serves the full X0 app. A path-based approach (`app.triaxisventures.com/lite`) would work but couples Lite's domain identity to whichever project `app.triaxisventures.com` happens to point at, and is harder to reason about for the host-based route-restriction work this doc already flags as a follow-up.

## Deployment Rules

- **Preview deploy first.** The standard `vercel:deploy:preview` script (`node scripts/deploy-vercel.mjs --target=preview`) already exists at the repo root and works unchanged for a third project once it exists and is linked -- use it before any production alias.
- **No production alias without HITL approval.** Matches this sprint's own non-negotiable ("Do not deploy production without founder approval") and this program's existing standing practice for the other two Vercel projects this session.
- **GitHub/GitLab is source control, not a deployment mediator, unless explicit.** This repo's actual production deploy path today is the manual `vercel --prod` CLI flow (per this session's own repeated practice for the investor-demo project) plus the one automated GitHub Actions workflow (`.github/workflows/deploy-production.yml`) that currently deploys only `landing` and `investor-demo` on merge to `main`. Adding a third `deploy-lite` job to that workflow is a reasonable follow-up once the Lite project exists and its scope is founder-approved, but is not done by this sprint -- doing so silently would auto-deploy Lite to production on every future `main` merge before the founder has reviewed the surface at all, which this sprint's non-negotiables explicitly forbid ("Do not mark Lite ready for users yet").

## Vercel CLI Project Creation -- Exact Commands, Not Yet Run

Per this sprint's own instruction, project creation was only to proceed via CLI if it required no secrets and no production deployment, with the exact command documented first and current team/project context confirmed. Creating a new Vercel project is a real, visible, not-easily-reversible action inside the founder's own Vercel team (it appears in the team's project list immediately) -- consistent with this session's standing practice this program has already established (never take a first-time, team-visible infrastructure action without a fresh, explicit go-ahead in the current conversation), **this was not run**. The exact commands, for the founder's review before anyone runs them:

```bash
# 1. Confirm current Vercel team/account context first (read-only, safe to run any time):
npx vercel whoami
npx vercel teams list

# 2. Link this repo directory to a NEW project (interactive -- Vercel CLI will prompt
#    "Set up and deploy? / Link to existing project? / What's your project's name?" the first
#    time; answering with the new name below creates the project without deploying anything yet):
npx vercel link --yes --project=triaxis-product-lite-web

# 3. Once linked and env vars are set in the Vercel dashboard (per the table above), a PREVIEW
#    deploy only (never --prod) to confirm the build works on the new project:
npx vercel --yes
```

If step 2 requires interactive confirmation this session's non-interactive CLI invocation cannot supply (Vercel's `link` flow can prompt for team/scope selection on first use), stop there and hand the exact three commands above to the founder to run themselves, or request an explicit fresh go-ahead in a live conversation turn before running step 2 -- do not create the project as a side effect of any other automated action.
