# Executive Dashboard Sprint ED-3 Closeout: Net-New Dashboard Intelligence MVPs

Date: 2026-07-25
Planning provenance: Codex-drafted execution prompt, founder-reviewed and approved before execution,
per `CLAUDE.md`'s Planning Provenance rule.
Source docs: `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_ROADMAP_2026_07_25.md`,
`docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_CHECKLIST_2026_07_25.md`,
`docs/readiness/EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md`,
`docs/readiness/EXECUTIVE_DASHBOARD_ED2_CLOSEOUT_2026_07_25.md`

## Sprint Objective

Address the last 3 Executive Dashboard placeholders (Strategic Objectives, AI Recommendations, Risk
Heatmap) with small, honestly-scoped MVPs -- no large analytics/OKR/risk platform, no fake AI claims,
no hardcoded live-tenant data -- and resolve the Golden Path vs. Pilot Onboarding checklist overlap.

## ED-1 / ED-2 Carryover Gate

Checked against `docs/readiness/EXECUTIVE_DASHBOARD_ED2_CLOSEOUT_2026_07_25.md`: ED-2 closed at
24/27 REAL (89%), already exceeding both the minimum (19/27, 70%) and preferred (21/27, 78%) targets,
with **zero PARTIAL elements remaining** -- every non-REAL element was already confirmed PLACEHOLDER
and exactly ED-3's own scope. No carryover fixes were needed; ED-3 began directly on its 3 targets.

## What Changed

**`src/features/dashboard/DashboardSection.tsx`**:
- Renamed the module-level `heatmap` constant to `demoHeatmap` (demo-mode-only, unchanged content).
  Added `aggregateProjectRisk()` (exported, pure): buckets the tenant's own loaded `projects` by
  real risk level (`urgent`/`high` -> High, `medium` -> Medium, everything else -> Low) into
  generic "High/Medium/Low risk projects" counts -- not the demo set's health-specific categories
  ("Oxygen," "Referral," etc.), which have no inherent relationship to a real tenant's own projects.
  Risk Heatmap card now renders: demo set in demo mode, real aggregation when the tenant has
  projects, honest `EmptyState` ("No projects yet...") otherwise.
- Added `deriveDashboardRecommendations()` (exported, pure): builds real recommendation cards from
  data already loaded on the page -- one "Governance recommendation" if `pendingAiReviewCount > 0`
  (linking to the real AI Review Inbox), and up to 3 "Operational recommendation" cards for projects
  flagged `high`/`urgent` risk (linking to `/projects`). Labels deliberately avoid any claim of
  autonomous AI generation. AI Recommendations card now renders: demo set in demo mode (buttons
  converted from dead `<button>`s to real `<a href="/ai-workspace/review-inbox">` links -- these were
  flagged as dead even in demo mode), real derived recommendations for live tenants with evidence,
  honest empty state otherwise.
- Added `objectives` state + a new `useEffect` fetching `getDashboardStrategicObjectives(tenantScope)`
  (new function in `data.ts`), keyed to the existing `refreshToken` so "Refresh" (ED-1) also refreshes
  this. Strategic Objectives card now renders: demo set in demo mode (renamed `dashboardObjectives`
  -> `demoObjectives` for naming consistency with `demoHeatmap`/`demoAiRecommendations`), real derived
  program cards for live tenants with programs, honest empty state otherwise.

**`src/features/dashboard/data.ts`**:
- Renamed `dashboardObjectives` -> `demoObjectives`, `dashboardAiRecommendations` -> `demoAiRecommendations`
  (demo-only content, unchanged) for naming consistency.
- Added `getDashboardStrategicObjectives(scope)`: fetches real `programsRepository.list()` and
  `projectsRepository.list()` in parallel, maps each program to `{ id, name, status, projectCount,
  averageProgress }` where `averageProgress` is the real average `progress` of that program's own
  linked projects (0 if none). Returns `[]` on any failure -- never demo content to a real tenant.
  This is the roadmap's "Option B -- Derived MVP": no new persistence, no new schema, since no
  dedicated objectives model exists and a full OKR platform is explicitly out of scope.

**`src/features/onboarding/BetaOnboardingChecklist.tsx`** (ED3-04 decision):
- Product decision: **keep both checklists, explicitly differentiate them** (roadmap Option 2),
  rather than merge or hide either. Title changed to "Pilot Onboarding (personal checklist)";
  description now states plainly that progress is "saved to this browser only" and points to "the
  Enterprise Golden Path below" for tenant-wide workflow proof. This directly satisfies the
  acceptance criteria ("localStorage-only state is not presented as enterprise tenant evidence
  unless clearly labeled") without the larger effort of merging two differently-scoped checklists or
  building server-side persistence for a personal/local tool.

## What Did Not Change (Explicitly Out of Scope This Pass)

- No dedicated `strategic_objectives`, `ai_recommendations`, or `risk_heatmap` database tables were
  created -- all three MVPs derive from existing `programs`/`projects`/AI-review data, per the
  roadmap's own non-negotiables ("Do not build a large OKR platform," "Do not build a full risk
  engine").
- The Pilot Onboarding checklist's `localStorage`-only persistence was not changed to server-side
  storage (roadmap Option 3) -- the founder-facing decision made was to differentiate and label, not
  to add new persistence infrastructure for what remains a personal/local tool.
- No dashboard redesign or architecture rewrite, per the sprint's non-negotiables.

## What Was Verified

```
pnpm run typecheck   -> exit 0, zero errors
pnpm run lint         -> exit 0, zero warnings
pnpm run test         -> 140/140 test files passed, 533/533 tests passed, exit 0
pnpm run build        -> exit 0, clean production build (Turbopack), all routes compiled
```

**Note on this pass's own process, stated honestly:** an initial full-suite run genuinely failed --
not the memory-pressure worker-timeout flake seen in ED-1/ED-2, but 3 real test failures in
`BetaOnboardingChecklist.test.tsx`, whose assertions were written against the pre-ED3-04 exact copy
text ("X of 10 complete - first 10 minutes of a real tenant" / exact text "Pilot Onboarding"). Found
and fixed by updating those 4 assertions to match the new, intentionally different copy; re-ran and
confirmed clean before proceeding. Recorded here rather than omitted, consistent with this program's
evidence discipline of reporting what actually happened, not just the final green result.

New/updated tests (13 total): `src/features/dashboard/dashboardIntelligence.test.ts` (new, 6 tests --
`aggregateProjectRisk` bucketing and empty-list behavior; `deriveDashboardRecommendations`'s
governance/operational/cap-at-3/no-autonomous-AI-claim behavior), `src/features/dashboard/data.test.ts`
(+2 tests -- `getDashboardStrategicObjectives` real averaging and failure-returns-empty behavior),
`src/features/dashboard/DashboardSection.test.tsx` (+4 tests -- honest empty states for Risk Heatmap,
AI Recommendations, Strategic Objectives; Pilot Onboarding relabeling), `src/features/onboarding/BetaOnboardingChecklist.test.tsx`
(4 assertions updated for the new copy text, no new test cases -- existing coverage, corrected).

## Before / After Inventory Count

Continuing from `docs/readiness/EXECUTIVE_DASHBOARD_ED2_CLOSEOUT_2026_07_25.md`'s itemized 27-element
basis:

| | REAL | PARTIAL | PLACEHOLDER | REAL share |
|---|---:|---:|---:|---:|
| Before ED-1 | 12 | 5 | 10 | 44% |
| After ED-1 | 21 | 2 | 4 | 78% |
| After ED-2 | 24 | 0 | 3 | 89% |
| After ED-3 | **27** | **0** | **0** | **100%** |

All 3 remaining PLACEHOLDER elements moved to REAL: Strategic Objectives, AI Recommendations, Risk
Heatmap.

**Caveat, stated deliberately rather than left implicit:** "100% REAL" means no dashboard element
shows fabricated live-tenant data, a dead action, or an overclaiming label -- it does not mean every
element is a fully-featured platform. Strategic Objectives and AI Recommendations in particular are
explicitly-scoped MVPs (derived from existing programs/projects/reviews, not a full OKR system or an
AI-generation engine) per this roadmap's own repeated non-negotiables. A future, separately-scoped
initiative could build richer versions of either; that is out of this program's scope by design, not
an oversight.

## Whether 70% Target Was Reached

**Yes, exceeded.** 100% (27/27) vs. the 70% (19/27) minimum.

## Whether Preferred 78% Target Was Reached

**Yes, exceeded.** 100% (27/27) vs. the 78% (21/27) preferred target, and the 81% (22/27) stretch
target.

## Risk Heatmap Result

Real MVP: aggregates the tenant's own project risk levels into generic High/Medium/Low counts.
Demo mode unchanged (illustrative, clearly gated). Honest empty state for a tenant with zero
projects. No health-specific or otherwise inapplicable categories shown to live tenants.

## Strategic Objectives Result

Real, derived MVP (roadmap Option B): one card per real program, "progress" is the real average
progress of that program's own linked projects. No new persistence, no fabricated targets. Honest
empty state for a tenant with zero programs.

## AI Recommendations Result

Real, derived MVP (roadmap Option A/B hybrid): recommendations built from real pending AI reviews
and real at-risk projects already loaded on the page, explicitly labeled "Governance recommendation"
/"Operational recommendation" rather than claiming autonomous AI authorship. Dead buttons fixed in
both demo and live modes. Honest empty state when no such evidence exists yet.

## Golden Path / Pilot Onboarding Decision

Kept both, explicitly differentiated (roadmap Option 2): the 10-step checklist is now labeled "Pilot
Onboarding (personal checklist)" with copy stating plainly it is saved to the browser only, and
points to "the Enterprise Golden Path below" for tenant-wide workflow proof. `localStorage`-only
persistence itself was not changed to server-side storage -- the decision was to label honestly, not
to add new infrastructure for what remains a personal, local tool.

## Evidence Chain

| External signal | Product decision | Changed artifact | Verification | Status |
|---|---|---|---|---|
| ED-3 execution prompt (Codex-drafted, founder-reviewed) following ED-1/ED-2's closeouts, which had already exceeded every numeric target | Small, honestly-scoped MVPs for the 3 remaining placeholders; explicit differentiation for the two onboarding checklists | `DashboardSection.tsx`, `data.ts`, `BetaOnboardingChecklist.tsx`, 4 test files (1 new) | typecheck/lint/build clean (exit 0 each); tests 140/140 files, 533/533 passing, exit 0 (one genuine test-copy mismatch found and fixed mid-pass, documented above) | Done, 27/27 REAL (100%) |

## Tests Run

`pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build` -- see "What Was Verified"
above for exact results.

## Test Results

140/140 test files passed, 533/533 tests passed, exit 0.

## Build Result

Exit 0, clean production build, all routes compiled.

## Remaining Dashboard Gaps

None at the REAL/PARTIAL/PLACEHOLDER level -- all 27 inventoried elements are REAL. Remaining
opportunities, explicitly out of this program's scope: a richer Strategic Objectives model (real
target/quarter fields, not just derived progress), a genuine AI-generated recommendation engine (vs.
this pass's evidence-derived cards), full `social_alert_events` live ingestion (ED-2 left this as
provider-gated status only), and a decision on whether to eventually server-persist Pilot Onboarding
state. None of these are defects -- they are legitimate larger initiatives this program deliberately
did not attempt, per its own non-negotiables.

## Recommendation After ED-3

**Program complete.** All 3 sprints (ED-1, ED-2, ED-3) are closed, verified, and documented; the
Executive Dashboard reached 27/27 (100%) REAL, exceeding every target in the original roadmap
without building any of the large systems the roadmap explicitly excluded. Recommend a live HITL
walkthrough of the Executive Dashboard on the deployed build to confirm these fixes behave as
expected in the browser (this program's standing practice per `CLAUDE.md`'s evidence-chain
discipline: code-plus-test evidence is not the same as a live-confirmed fix) before considering any
further dashboard work, and treating the "remaining opportunities" listed above as a separate,
future-scoped initiative rather than a continuation of this program.

## Git State

See the commit immediately following this closeout for exact hash, branch, and pushed-remote state.
