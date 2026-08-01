# Tenant Partitioning -- Sprint TP-1 Closeout (2026-07-28)

Date: 2026-07-28
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline; sprint executed per Codex's formal
"Sprint TP-1: Stop Tenant/Demo Data Leakage in Settings" prompt.
Related: `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` A-28 (and A-29/A-30/A-31, named as
follow-ups, not fixed this pass); `docs/readiness/HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md`;
`Enterprise beta feedback - Batch 1 (30 responses)/DEMO_DATA_LEAKAGE_AUDIT.md`.

## Sprint Objective

Fix the confirmed tenant/demo data leak found live on Triaxis Ventures' own Settings page and
sweep Settings for the same failure class -- without redesigning the UI, rewriting architecture,
removing Demo Mode, weakening tenant checks, or overclaiming isolation as "100% proven."

## Root Cause

`OrganizationPanel` (`src/features/settings/SettingsSection.tsx`) rendered
`demoDatasetSummary.organizationName`, `.projects`, and `.documents` unconditionally -- no
`isDemoModeEnabled()` check anywhere in the function. The seeded demo dataset module is imported
directly into the same live product bundle Triaxis Ventures' real session runs in, so a real,
authenticated user's own Settings > Organization tab rendered "North East Health Mission" (186
Projects, 2,200 Documents) regardless of runtime mode. The adjacent "Tenant Boundary" card in the
same panel was already correctly wired to `session.user?.organizationId` -- the panel was half
live-wired, half hardcoded, which is likely why an earlier audit pass marked this file as safe (it
reviewed other parts of the same file and missed this specific panel).

This is a **same-deployment, application-code-level** leak, not an infra-level one. The separate
Vercel projects / deployment-time env-forced demo mode described in
`HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md`'s "Strict Partitioning" section remain accurate and
were never implicated -- no request ever crossed from the Demo deployment to the Product one. The
Product deployment's own code chose to render demo content.

## Files Read First (Per Sprint Prompt)

- `src/features/settings/SettingsSection.tsx` (full read, all tabs)
- `src/repositories/interfaces.ts` (`OrganizationsRepository`, `DocumentsRepository` shapes)
- `src/domain/entities.ts` (`Organization` entity shape)
- `src/auth/AuthProvider.tsx`, `src/demo/demoMode.ts` (`isDemoModeEnabled`/`setDemoModeEnabled`)
- `src/demo/demoDataset.ts` (`demoDatasetSummary` shape)
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-28 and related rows)
- `docs/readiness/HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md` (the "100% Strict Partitioning" claim)
- `Enterprise beta feedback - Batch 1 (30 responses)/DEMO_DATA_LEAKAGE_AUDIT.md` (prior 5-round audit)
- `src/features/settings/SettingsSection.test.ts` (existing Settings tests)

No required file was missing.

## What Changed

- **`src/features/settings/SettingsSection.tsx` -- `OrganizationPanel`**: now queries
  `organizationsRepository.getById(scope, user.organizationId)` plus real
  `projectsRepository.list`/`documentsRepository.list` counts (capped at `pageSize: 100`, the same
  established convention used elsewhere in this file for metric cards) when not in demo mode.
  Demo/Investor Preview mode is unchanged -- still renders `demoDatasetSummary` directly, by
  design. A missing organization record renders "Not set up yet," never a silent demo fallback.
- **`src/features/settings/SettingsSection.tsx` -- AI Configuration tab's "AI Usage Statistics"
  card**: found during the required sweep (matches existing A-31). Not itself a tenant/demo
  identity leak (same fabricated numbers for every tenant, not another tenant's real data), but the
  same "unlabeled hard numbers presented as live tenant facts" failure class the sprint prompt asks
  to sweep for. Added an explicit "Illustrative, not yet tenant-tracked" badge and a one-line
  disclosure, rather than building a new per-tenant AI-usage aggregation pipeline (out of scope for
  this sprint -- named as a TP-2/future item below).
- **`docs/readiness/HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md`**: added a correction under the
  "Strict Partitioning Between Demo and Beta (100%)" section clarifying that heading describes the
  infra layer only, citing this exact incident as proof that "no application code can ever render
  demo content inside the live product" is not a guarantee that exists.
- **`Enterprise beta feedback - Batch 1 (30 responses)/DEMO_DATA_LEAKAGE_AUDIT.md`**: corrected the
  Executive Summary's claim that `SettingsSection.tsx` "correctly gates its demo-related behavior"
  (true for the file's other panels, false for this one); added "Round 6" following the doc's own
  established per-round pattern, documenting this finding, root cause, and fix.
- **`docs/readiness/ACTIONABLES_READINESS_MATRIX.md`**: A-28 moved from `No (confirmed defect)` to
  `Yes (code + test shipped 2026-07-28, pending HITL live confirmation)`, 88% confidence, with full
  root-cause/fix detail appended to the existing row (history preserved, not overwritten).

## Settings Tab Sweep (Required Step 3)

All tabs rendered from Settings were reviewed for the same failure class (unconditional demo
imports, hardcoded seeded names, static counts presented as live facts, dead controls, over-broad
permission disclosure):

| Tab | Finding | Action |
|---|---|---|
| Organization | The A-28 leak (above) | Fixed this sprint |
| AI Configuration | A-31 (already tracked): static usage stats identical for every tenant | Labeled honestly this sprint (see above); real per-tenant pipeline is a larger, separate follow-up |
| Security | A-29 (already tracked): 6 "Configure" buttons are dead ends; Role-Based Permissions table is a hardcoded, non-tenant-specific reference table | **Not fixed this sprint** -- named follow-up below. Not a demo/tenant identity leak (same content for every viewer, not another tenant's data); larger remit than "safe, obvious" fixes this sprint's scope calls for |
| Permissions | A-30 (already tracked): static, read-only role/access matrix, same for every tenant | **Not fixed this sprint** -- same reasoning as Security tab above |
| Integrations | `IntegrationsQuickConnectPanel` -- real, uses `getPilotIntegrations()`, tenant-role-gated (`canConnect`) | No issue found |
| Users | `UserAdministration` -- real, repository-backed (`usersRepository`, `invitationsRepository`), already fixed for its own defects earlier this session (A-08/A-65) | No new issue found |
| Demo | `DemoModePanel` -- always shows the seeded dataset | Correct by design, not a leak |
| Profile | Real, session-backed form | No issue found |

`grep -rln "demoDatasetSummary" src` confirms this object is referenced in exactly one other file
besides its own definition (`SettingsSection.tsx` itself) -- so this specific leak was isolated to
one panel, not a widespread import pattern. This does not rule out other, differently-shaped
placeholder/static-data issues elsewhere in the app (A-29/A-30/A-31 above are examples) -- a
broader, dedicated sweep (TP-2 below) is still recommended.

## Tests Added

`src/features/settings/OrganizationPanel.test.tsx` (new), 4 tests, rendering the real
`<SettingsSection />` with `?tab=organization` and mocked repositories/session:
1. Live tenant mode shows the real organization's own name and real project/document counts, and
   never shows "North East Health Mission."
2. Live tenant mode with no organization record yet shows "Not set up yet," never the demo fallback.
3. Demo/Investor Preview mode still shows the seeded institution, unaffected by the fix.
4. Live tenant mode looks up the organization using the real session organization id (not a
   demo/placeholder one) -- asserted directly against the mocked repository call arguments.

## Verification

- `pnpm run typecheck` -- clean.
- `pnpm run lint` (`eslint . --max-warnings=0`) -- clean, zero warnings (one intermediate run
  surfaced 2 unused-parameter warnings in the new test file's mock; fixed by dropping the unused
  typed parameters rather than suppressing the rule).
- `pnpm run test` -- **158 test files passed, 629 tests passed**, run 2026-07-28. (An earlier run in
  this same session hit `[vitest-pool-runner]: Timeout waiting for worker to respond` -- a runner
  teardown timeout, not a test failure: that run's own summary still read "157 passed (157) / 627
  passed (627), 0 failed." Re-ran clean to confirm it was a one-off infra flake, not a regression;
  the second run is the one recorded here.)
- `pnpm run build` -- clean, no errors.

## Demo/Live Behavior After Fix

- **Live tenant (Production mode)**: Organization Profile card shows the tenant's own real name and
  real project/document counts, sourced from `organizationsRepository`/`projectsRepository`/
  `documentsRepository`, scoped to the authenticated session's own `organizationId`. No path
  renders `demoDatasetSummary` in this mode.
- **Demo/Investor Preview mode**: unchanged -- still shows the seeded "North East Health Mission"
  institution and its counts, exactly as before. Demo Mode itself was not touched, weakened, or
  removed.
- **Missing organization record** (a real, authenticated user whose org row doesn't exist yet):
  shows "Not set up yet" -- an honest state, not a demo fallback.

## A-28 Status

`Yes (code + test shipped 2026-07-28, pending HITL live confirmation)` -- per this repo's own
established vocabulary (matching A-50/51/56/57/35/36/37/39's prior pattern). **Not closed as fully
`Yes`** -- no live HITL walkthrough of the fixed page has occurred yet. Exact live check needed:
sign in as Triaxis Ventures (or NEPDSIC) on `landing.triaxisventures.com`, open Settings >
Organization, confirm the real organization name and counts render (not "North East Health
Mission"), then separately open the Demo/Investor Preview experience and confirm it still shows
the seeded institution unchanged.

## Remaining Settings Risks (Named, Not Fixed This Sprint)

- **A-29**: Security tab's 6 "Configure" buttons remain dead ends; Role-Based Permissions table
  remains a static, non-tenant-specific reference table. Not a leak, but still a defect; deferred
  as too large for "safe, obvious" scope this sprint (matches this sprint's own instruction: "if a
  fix is too large, do not silently ignore it, add it to the closeout as a named follow-up").
- **A-30**: Permissions tab's read-only role/access matrix is static for every tenant. Same
  reasoning as A-29.
- **A-31 (AI Usage Statistics)**: now honestly labeled, but still not backed by a real per-tenant
  aggregation pipeline. Building that pipeline is separate, larger work.
- **Not independently re-verified**: whether any other panel across the whole app (not just
  Settings) has the same plain-unconditional-demo-reference pattern this sprint found and fixed.
  `demoDatasetSummary` itself was confirmed narrow (one other reference, legitimate), but other
  differently-named demo/seed data sources were not exhaustively re-swept this pass.

## TP-2 Recommended Scope

1. Repo-wide search and classification of every demo/seed/placeholder reference (`demoDataset`,
   `North East Health Mission`, `Investor Preview`, `sample`, `mock`, `placeholder`, `Ananya Rao`,
   etc.), cross-referenced against each consuming component's own demo-mode gating -- not limited
   to Settings.
2. Repository-level tenant-scoping audit across organizations/users/projects/tasks/documents/
   meetings/approvals/audit-logs/AI-reviews/stakeholders, confirming every live query either
   includes explicit tenant/org scoping or relies on verified RLS.
3. API-route audit for every route accepting a resource ID (organization/project/document/task/
   AI-review/approval/stakeholder/meeting), confirming cross-tenant access returns a safe 403/404
   rather than another tenant's data.
4. Decide fix scope for A-29 (dead Configure buttons + empty-feeling permissions table) and A-30
   (static Permissions matrix) -- both named risks above, not yet actioned.

## Exact HITL Live Checks Needed

1. Sign in as Triaxis Ventures on `landing.triaxisventures.com`, open Settings > Organization,
   confirm real org name/counts, confirm no "North East Health Mission."
2. Repeat for NEPDSIC.
3. Open Investor Preview / `investor.triaxisventures.com`, confirm the seeded institution still
   renders correctly and is unaffected.
4. Report back so A-28 can move from "pending HITL live confirmation" to a plain `Yes`.

## Exact File / Commit / PR / Deployment State

Files changed:
- `src/features/settings/SettingsSection.tsx`
- `src/features/settings/OrganizationPanel.test.tsx` (new)
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `docs/readiness/HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md`
- `Enterprise beta feedback - Batch 1 (30 responses)/DEMO_DATA_LEAKAGE_AUDIT.md`
- `docs/readiness/TENANT_PARTITIONING_TP1_CLOSEOUT_2026_07_28.md` (this file, new)

Branch: `canonical/sprint-1-35-unified-gitlab`. Commit and push (to `origin` and `gitlab`, this
repo's established dual-remote practice) follow immediately after this closeout. No production
deployment in this pass without explicit confirmation, per `CLAUDE.md`'s deployment discipline.
