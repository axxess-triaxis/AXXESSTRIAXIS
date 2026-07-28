# Tenant Partitioning -- Sprint TP-2 Closeout (2026-07-28)

Date: 2026-07-28
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline; sprint executed per Codex's formal
"Sprint TP-2: Repository, API and Demo Boundary Audit" prompt.
Related: `docs/readiness/TENANT_PARTITIONING_TP1_CLOSEOUT_2026_07_28.md`,
`docs/readiness/TENANT_PARTITIONING_DEMO_REFERENCE_INVENTORY_2026_07_28.md`,
`docs/readiness/TENANT_PARTITIONING_REPOSITORY_BOUNDARY_AUDIT_2026_07_28.md`,
`docs/readiness/TENANT_PARTITIONING_API_BOUNDARY_AUDIT_2026_07_28.md`,
`docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-10, A-11, A-28, A-69),
`docs/readiness/QA3_READINESS_KANBAN.md`.

## Sprint Objective

Move from fixing one visible leak (TP-1) to auditing the architecture around the same failure
class: demo references, repository tenant-boundary enforcement, and API route tenant-boundary
enforcement, proving through code audit and tests -- not by claiming "100% tenant isolation."

## Files Audited

Per the sprint prompt's required-reading list: `SettingsSection.tsx`, all `src/demo/*` files,
repository/service files for organizations/users/projects/tasks/documents/meetings/approvals/
audit-logs/AI-reviews/stakeholders/dashboard-metrics, and a representative, risk-prioritized subset
of the 62 API routes under `src/app/api` (11 read in full -- see the API Boundary Audit doc for
exactly which and why). No required file was missing.

## Demo Reference Inventory Summary

Searched `demoDataset`, `North East Health Mission`, `Investor Preview`, `Ananya Rao`, and the
`isDemoMode`/`demoMode` gating-function call sites. **3 unsafe live renders found, all fixed this
sprint** (all the same failure class as A-28): `/api/admin/mobile-release`,
`src/services/pilot/pilotAcceptanceRuntime.ts` (feeding two routes), and `AIWorkspaceSection.tsx`'s
unconditional demo RAG query. **1 stale/dead-code item found, not removed**
(`mockCurrentUserContext` in `rbac.ts`, zero consumers anywhere). Everything else classified safe.
Full detail, including the classification table: `TENANT_PARTITIONING_DEMO_REFERENCE_INVENTORY_2026_07_28.md`.

## Repository Boundary Audit Summary

Most tenant-scoped repositories share two factory functions (`createTenantRepository`/
`createMutableTenantRepository`) that apply tenant scoping at two independent layers: an explicit
`organization_id=eq.<scope.organizationId>` filter on every read and write, plus RLS via the real
authenticated user's own JWT (never a service-role key for these). Cross-tenant updates combine
`id` and `organization_id` in the same query, matching zero rows rather than silently succeeding.
The one bespoke, non-factory repository (AI reviews) explicitly documents that it uses a
service-role client where RLS does not apply, and compensates with application-layer checks --
already covered by a pre-existing, comprehensive test suite (`src/app/api/ai/reviews/route.test.ts`).
**One named risk, not resolved this sprint**: `scope.role === "Super Admin"` is exempted from the
application-level filter, relying on RLS alone -- exactly what A-10's (still-blocked) isolation
harness exists to prove or disprove. Full detail: `TENANT_PARTITIONING_REPOSITORY_BOUNDARY_AUDIT_2026_07_28.md`.

## API Boundary Audit Summary

Of 62 total API routes, 11 were read and verified directly (chosen for being implicated in this
sprint's findings or explicitly named in the sprint prompt's risk categories). All 11 derive tenant
scope from the authenticated session (`tenantScopeFromUser`/`session.user.organizationId`), never
from client-supplied input. The only dynamic-URL-segment route (`/api/repositories/[resource]`)
combines record id and session organization id in its update filter. The three fixed leaks were
wrong *display values* (organization name), not wrong *record scoping* -- the underlying data
access in all three was already correctly tenant-scoped; only a cosmetic label was hardcoded.
**~50 routes not individually re-read this sprint** -- named as a TP-3/future recommendation, not
claimed as verified. Full detail: `TENANT_PARTITIONING_API_BOUNDARY_AUDIT_2026_07_28.md`.

## Fixes Made

1. `src/app/api/admin/mobile-release/route.ts` -- real organization name via
   `organizationsRepository.getById`, demo name only when `isDemoModeEnabled()`.
2. `src/services/pilot/pilotAcceptanceRuntime.ts` -- same pattern, gated on `seededPilotEvidence`;
   fixes both `/api/admin/pilot-acceptance` and (transitively) `/api/admin/customer-success/live-ops`.
3. `src/services/pilot/pilotAcceptance.ts` and `src/services/mobile/mobileStoreLaunch.ts` -- default
   fallback (when no name is passed at all) changed from the specific demo institution name to the
   honest generic "Organization setup pending".
4. `src/features/ai-workspace/AIWorkspaceSection.tsx` -- the unconditional demo-specific sample RAG
   query now only auto-fires in demo mode, matching the same file's own pre-existing
   `initialRagAnswer()` gating.
5. `src/demo/demoMode.ts` -- added `getRuntimeMode()`, a small composition of `isDemoModeEnabled()`
   and authentication status into a `"demo" | "live-tenant" | "unauthenticated"` result. Not a
   rewrite of the existing (correct) `isDemoModeEnabled()` -- a thin helper so callers stop
   re-deriving the same two-signal check ad hoc, which is exactly how the A-28 failure class kept
   recurring. Wired into `OrganizationPanel` (Settings, TP-1's fix) and `AIWorkspaceSection.tsx`
   (this sprint's fix), per the sprint's "update at least Settings and any fixed high-risk module"
   requirement.

## Tests Added

- `src/services/pilot/pilotAcceptanceRuntime.test.ts` (new, 3 tests): live mode uses the real
  organization name; live mode with no organization record shows an honest placeholder; the
  build-time-forced demo deployment still shows the seeded institution.
- `src/features/ai-workspace/AIWorkspaceSection.test.ts` (extended, +1 test): the sample RAG query
  only fires when `getRuntimeMode(...) === "demo"`.
- `src/repositories/supabaseEnterpriseRepositories.test.ts` (extended, +2 tests): an update combines
  the record id and the caller's own `organization_id` in the same filter; an update targeting
  another tenant's record id matches zero rows and throws rather than silently succeeding.
- `src/app/api/rag/query/route.test.ts` (new, 3 tests): requires an authenticated session; derives
  scope from the session, never the request body; passes that scope (not a client-supplied one)
  into the RAG answer builder.
- Plus the 4 tests already delivered in TP-1 (`OrganizationPanel.test.tsx`) and the pre-existing,
  already-comprehensive `src/app/api/ai/reviews/route.test.ts` (8 tests, unmodified this sprint,
  cited as already satisfying the "AI Review list does not expose another tenant's review"
  requirement rather than duplicated).

**Total: 9 new tests this sprint, across 4 files (2 new, 2 extended), satisfying the "at least 5
high-risk non-leakage tests" exit criterion**, plus reliance on 4 TP-1 tests and 8 pre-existing
AI-review tests for categories already covered.

## Verification

- `pnpm run typecheck` -- clean.
- `pnpm run lint` (`eslint . --max-warnings=0`) -- clean, zero warnings.
- `pnpm run test` -- **160 test files passed, 638 tests passed**, run 2026-07-28. All newly
  added/modified test files individually re-run and confirmed passing before the full run.
- `pnpm run build` -- clean, no errors.

## Remaining Risks

- **A-29** (Security tab dead "Configure" buttons, static Role-Based Permissions table) and
  **A-30** (static Permissions matrix) -- named in TP-1, still not fixed. Neither is a demo/tenant
  identity leak; both are larger than this program's "safe, obvious" mandate.
- **Super Admin exemption** from application-level `organization_id` filtering -- relies on RLS
  alone for that one role. Not resolved by code audit; A-10's harness is the only thing that can
  close this.
- **~50 of 62 API routes** not individually re-read this sprint.
- **The generic `fallback`/`sample`/`mock`/`placeholder` search terms** were not exhaustively
  triaged file by file (too broad/noisy to be a precise signal on their own -- see the inventory
  doc for the specific, higher-confidence terms that were exhaustively covered instead).
- **`DEMO_DATA_LEAKAGE_AUDIT.md`'s own Round 5 note** (a dedicated pass for the
  module-level-constant-computed-from-`isDemoModeEnabled()` pattern) remains an open recommendation
  from a prior sprint, independent of this one.

## Blockers for TP-3

1. **A-10 (isolation harness)**: needs either a local Docker daemon enabled, or a dedicated
   non-production Supabase branch/staging project with its own access token. Neither exists in
   this environment; this agent cannot create either.
2. **A-11 (live two-tenant UI walkthrough)**: needs a HITL session logging into both Triaxis
   Ventures and NEPDSIC (both already exist, no new accounts needed) and checking Dashboard,
   Settings, Projects, Documents, Knowledge Hub, AI Workspace, AI Review Inbox, Tasks, Approvals,
   Stakeholders, Audit Logs, and Analytics for cross-tenant bleed.

## Exact Live HITL Checks Needed

1. Sign in as Triaxis Ventures, check Settings > Organization (TP-1), Mobile Release, Pilot Command
   Center, and Customer Success Live Ops (TP-2) -- confirm each shows "Triaxis Ventures Private
   Limited," never "North East Health Mission."
2. Repeat for NEPDSIC.
3. Open Investor Preview and confirm all of the above still correctly show the seeded institution,
   unaffected.
4. Open AI Workspace as a real tenant and confirm no auto-populated answer about "North East Health
   Mission district risks" appears on load.
5. Report back so A-28 and A-69 can move from "pending HITL live confirmation" to a plain `Yes`.

## Can Tenant Isolation Be Claimed As Code-Hardened?

**Yes, with named exceptions.** The repository and API layers verified this sprint show consistent,
defense-in-depth tenant scoping (explicit application-level filter + RLS) for the resources and
routes actually read. The Super Admin exemption and the ~50 unread routes are named, not silently
assumed safe.

## Can Tenant Isolation Be Claimed As Live-Proven?

**No.** No live two-tenant walkthrough or database-level isolation harness run has occurred yet.
That is exactly TP-3's scope, not this sprint's. Per the sprint prompt's own non-negotiable: this
sprint does not claim "100% tenant isolation."

## Exact File / Commit / PR / Deployment State

Files changed:
- `src/app/api/admin/mobile-release/route.ts`
- `src/services/pilot/pilotAcceptanceRuntime.ts`
- `src/services/pilot/pilotAcceptance.ts`
- `src/services/mobile/mobileStoreLaunch.ts`
- `src/features/ai-workspace/AIWorkspaceSection.tsx`
- `src/features/ai-workspace/AIWorkspaceSection.test.ts`
- `src/demo/demoMode.ts`
- `src/features/settings/SettingsSection.tsx`
- `src/services/pilot/pilotAcceptanceRuntime.test.ts` (new)
- `src/repositories/supabaseEnterpriseRepositories.test.ts`
- `src/app/api/rag/query/route.test.ts` (new)
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/QA3_READINESS_KANBAN.md`
- `docs/readiness/TENANT_PARTITIONING_DEMO_REFERENCE_INVENTORY_2026_07_28.md` (new)
- `docs/readiness/TENANT_PARTITIONING_REPOSITORY_BOUNDARY_AUDIT_2026_07_28.md` (new)
- `docs/readiness/TENANT_PARTITIONING_API_BOUNDARY_AUDIT_2026_07_28.md` (new)
- `docs/readiness/TENANT_PARTITIONING_TP2_CLOSEOUT_2026_07_28.md` (this file, new)

Branch: `canonical/sprint-1-35-unified-gitlab`. Commit and push (to `origin` and `gitlab`) follow
immediately after this closeout, per the sprint's git requirements. No production deployment in
this pass without explicit confirmation, per `CLAUDE.md`'s deployment discipline.
