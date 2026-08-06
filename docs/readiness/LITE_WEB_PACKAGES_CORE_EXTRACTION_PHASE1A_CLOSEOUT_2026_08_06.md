# apps/lite-web Standalone Build Target -- packages/core Extraction, Phase 1a

Date: 2026-08-06
Governance source: `docs/FOUNDER_EXECUTION_EVIDENCE_GOVERNANCE.md`

## Need For This Work

`apps/lite-web` has never been a true standalone build target -- flagged as open in
`docs/readiness/XL3_LITE_WORKSPACE_BOUNDARY_BUILD_ISOLATION_CLOSEOUT_2026_08_05.md`'s residual
risks and `docs/readiness/AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md`'s "Extraction path to
genuine Option B." Its `package.json` build script literally delegates to the root app's full
build (`pnpm --dir ../.. run build`), producing no independent artifact. The documented fix path is
to extract the shared repository/service layer (`applicationServices`, `tenantScopeFromUser`, the
concrete repositories) into a `packages/core` workspace package, following the precedent already
proven twice in this repo (`packages/shared`, `packages/features-lite`), so that both the root app
and a genuinely independent `apps/lite-web` can import from it.

## Objectives

1. Map the real, full dependency closure of `applicationServices`/`tenantScopeFromUser` before
   moving anything, rather than assuming its size from the outside.
2. Extract whatever portion of that closure can be moved with near-zero risk to the live X0 app
   (serving 5 real tenants today), using the proven backward-compatible shim pattern.
3. Be explicit and honest about what remains -- do not present a partial extraction as the full
   standalone-build-target outcome.

## Actions Taken

1. Traced `src/providers/serviceProvider.ts` and `src/repositories/supabaseEnterpriseRepositories.ts`'s
   full transitive import graph, file by file, rather than estimating.
2. **Found the real scope was much larger than it looked from the outside**: ~5,000 interconnected
   lines once the AI provider adapter system (`services/ai/router/aiRouter.ts` -> `services/providers`),
   demo dataset, and `security/rbac.ts`'s coupling to `app/navigation`/`app/routing/routes` (X0's own
   routing types) are counted. Moving all of it in one pass, verified only by typecheck/lint/build
   (this sandbox's test suite does not run to completion, so there is no automated regression net),
   was judged too risky to do casually alongside everything else closed today.
3. Presented this finding to the founder directly, with the real numbers, and asked for an explicit
   decision rather than silently scoping down or pushing ahead regardless. Founder chose the
   scoped-safe path.
4. Identified the genuinely zero-risk subset: `domain/` (entities, 494 lines), `services/contracts.ts`
   (166 lines), `repositories/interfaces.ts` (247 lines) -- confirmed, file by file, that every
   export across all three is `export type` or `export interface` with zero runtime code, and that
   their only dependencies are on each other (no auth, demo, AI, or storage coupling).
5. Created `packages/core` (name `@axxess/core`) and moved these three files into it via `git mv`
   (preserving history), following the exact `packages/features-lite` package.json pattern.
6. Left backward-compatible re-export shims (`export type * from "@axxess/core"`) at all four
   original import paths -- zero consumer files anywhere in the codebase needed to change.
7. Registered `@axxess/core` in `tsconfig.json` paths and `vitest.config.mjs` aliases, and added it
   to `scripts/lite-boundary-guard.mjs`'s scan scope (as a purity guarantee going forward, not
   because it currently contains any Lite-forbidden pattern -- it structurally cannot, having zero
   runtime imports).
8. **Found and fixed an unrelated, real bug while verifying**: `eslint.config.mjs`'s `globalIgnores`
   patterns are root-relative and don't match nested inside a stray `.claude/worktrees/*` checkout
   left over from an earlier background session this same day. This caused `pnpm run lint` to
   double-scan that orphaned worktree and report ~18,600 false "problems" masking the real result.
   Added `.claude/worktrees/**` as an explicit ignore, matching the existing `.cache/**` pattern.
   Also removed the stray worktree's git registration (`git worktree remove --force`) -- its
   uncommitted change was a duplicate of the already-merged PR #186 lockfile fix, so nothing unique
   was lost.

## Tasks Performed

- `git mv src/domain/entities.ts packages/core/src/domain/entities.ts`
- `git mv src/domain/index.ts packages/core/src/domain/index.ts`
- `git mv src/services/contracts.ts packages/core/src/services/contracts.ts`
- `git mv src/repositories/interfaces.ts packages/core/src/repositories/interfaces.ts`
- Created `packages/core/package.json`, `packages/core/src/index.ts`
- Wrote 4 shim files at the original paths
- Edited `tsconfig.json`, `vitest.config.mjs`, `scripts/lite-boundary-guard.mjs`, `eslint.config.mjs`
- `corepack pnpm install` (linked the new workspace package; workspace count went from 7 to 8)

## Tests Done

| Check | Result |
|---|---|
| `pnpm run typecheck` (root) | **Pass**, zero errors |
| `pnpm --dir apps/mobile run typecheck` | **Pass**, zero errors |
| `pnpm run lint` | **Pass**, zero warnings (after the `.claude/worktrees/**` ignore fix -- before that fix, falsely reported ~18,600 problems, all traced to the stray worktree, none to this change) |
| `pnpm run build` | **Pass** -- every route compiled, including all `/lite/*` routes |
| `node scripts/lite-boundary-guard.mjs` | **Pass** -- 49 files scanned, `packages/core` included |
| `pnpm run test` | **Not run to completion** -- known, pre-existing sandbox Vitest worker-crash limitation (documented earlier this session, unrelated to this change) |

## Closeout

**What changed:** `domain/`, `services/contracts.ts`, and `repositories/interfaces.ts` (all
type-only, ~907 lines) physically relocated to `packages/core`, with backward-compatible shims at
every original path. `eslint.config.mjs` gained a `.claude/worktrees/**` ignore. The stray
diagnostic worktree's git registration was removed.

**What did not change:** every consumer file's import statements (zero changes needed, by design).
`applicationServices`, `tenantScopeFromUser`, and the concrete Supabase-backed repositories remain
exactly where they were in `src/`.

**What was verified:** typecheck (root + mobile), lint (genuinely clean, not just quiet), full
build, and the Lite boundary guard, all passing after the change.

**What remains partial or blocked:**
- `apps/lite-web` is **still not a true standalone build target**. This extraction moved pure types
  -- it did not move the actual repository implementations or `applicationServices`, so
  `apps/lite-web`'s build script still delegates to the root app. The genuine "standalone" outcome
  requires the larger, ~5,000-line extraction described above, deliberately deferred as its own
  effort.
- Building a real, independent Next.js page tree for `apps/lite-web` (rather than the current thin
  wrapper) is untouched -- not attempted in this pass.
- Reconfiguring the `triaxis-product-lite-web` Vercel project's Root Directory (currently `.`, the
  repo root) to point at `apps/lite-web` was never reached -- that is a live account-settings
  change requiring its own explicit go-ahead when the app itself is ready to be pointed at.

**What claim is still unsupported:** none -- this closeout claims only what was actually done and
verified above; the larger extraction is explicitly named as not done, not implied as complete.

**Closure statement:** this is real, verified, zero-risk progress toward the standalone-build-target
goal -- not the goal itself. The next, larger phase (moving the concrete repository layer) is scoped
and ready to pick up as its own dedicated pass with proper regression testing, per the founder's
explicit decision on 2026-08-06.

## Evidence Chain

- Commit `b41196b` on `canonical/sprint-1-35-unified-gitlab`, pushed to both `origin` and `gitlab`.
- Exact commands and outputs: this session's tool-call history, 2026-08-06.
- Related: `docs/readiness/XL3_LITE_WORKSPACE_BOUNDARY_BUILD_ISOLATION_CLOSEOUT_2026_08_05.md`
  (original residual risk), `docs/readiness/AXXESS_LITE_VERCEL_PROJECT_SETUP_2026_08_05.md`
  ("Extraction path to genuine Option B"), `docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md`
  (the `packages/features-lite` precedent this follows).
