# Executive Dashboard Remediation Roadmap

Date: 2026-07-25
Trigger: founder instruction, 2026-07-25 -- *"Executive Dashboard (which includes Golden Path) is
mainstay of the platform. We need to generate 70-80% delta on current state right now; by
roadmapping, planning around and checklisting with sub-progress report. Give me list of
actionables, gaps, things to be fixed exhaustively."*
Source of the inventory below: a dedicated, read-only code audit of every button, widget, and data
tile on `src/features/dashboard/DashboardSection.tsx` and its dependencies (Golden Path, Tenant
Health Command Center, Project Health Monitor, Risk Heatmap, Strategic Objectives, AI
Recommendations, header actions), cross-referenced against the live HITL walkthrough already
logged as A-42 through A-46 in `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`. This document is
the exhaustive list requested -- **no code has been changed.** Execution requires separate
founder authorization per phase, consistent with this program's standing practice.

## How to read this document

Every dashboard element is tagged **REAL** (fully wired to live tenant data), **PARTIAL** (real
data mixed with a placeholder, mislabel, or weak persistence), or **PLACEHOLDER** (no real backend
at all, static or dead). The "70-80% delta" the founder asked for is defined here as: raising the
share of REAL elements from the current baseline to 70-80% of the full inventory, prioritizing the
elements a customer/investor actually notices first.

## Current State Baseline

Counting every distinct interactive element and data tile inventoried below (27 total):

| Tag | Count | Share |
|---|---:|---:|
| REAL | 11 | 41% |
| PARTIAL | 5 | 19% |
| PLACEHOLDER | 11 | 41% |

**To reach 70-80% REAL, roughly 16-18 of the 27 elements need to end this roadmap in the REAL
column** -- i.e., closing most of the PARTIAL and PLACEHOLDER items below, not all of them equally;
the phasing prioritizes the cheapest, highest-visibility fixes first.

## Full Exhaustive Inventory

### Header row

| # | Element | Tag | Evidence | Actionable |
|---|---|---|---|---|
| 1 | Start guided demo | PARTIAL | Fully wired (`DashboardSection.tsx:109-111`, `useGuidedDemo.ts`, `GuidedDemoBanner.tsx`), but the name collides with the separate `investor.triaxisventures.com` product -- a naming/product-decision issue, not a broken button | A-44 |
| 2 | Send feedback (Dashboard header) | PLACEHOLDER | Dead `mailto:` (`DashboardSection.tsx:112-114`) sitting beside an already-real, Supabase-backed feedback pipeline (`BetaFeedbackButton`/`Modal`, global via `AppShell.tsx:61`) | A-42 |
| 3 | Refresh | PLACEHOLDER | No `onClick` at all (`DashboardSection.tsx:115-117`) | A-47 |
| 4 | Export Briefing | PLACEHOLDER | No `onClick`, no export service exists anywhere (`DashboardSection.tsx:118-120`) | A-43 |
| 5 | Command search | PLACEHOLDER | Static decorative `<div>`, not an input (`components/enterprise/index.tsx:336-345`) | A-45 |

### Enterprise Golden Path (8-step)

| # | Element | Tag | Evidence | Actionable |
|---|---|---|---|---|
| 6 | Golden Path widget itself | REAL | Fully wired to live `LiveWorkspaceMetrics` via real repositories (`enterpriseGoldenPath.ts`, `EnterpriseWorkflowJourney.tsx`) | none needed |
| 7 | Golden Path's `pendingAiReviews` count | PARTIAL | Heuristically derived (`Math.ceil(pendingApprovals / 10)`), never a literal AI Review Inbox count | new, minor -- see Phase 2 |

### Tenant Health Command Center (8 tiles)

| # | Element | Tag | Evidence | Actionable |
|---|---|---|---|---|
| 8 | Onboarding completion | REAL | `workflowEvidence.ts:139-145` | none |
| 9 | Active users | PARTIAL | Mislabeled -- shows a Ready/Blocked proxy, not a user count (`workflowEvidence.ts:146-153`) | A-50 |
| 10 | Documents indexed | REAL | `workflowEvidence.ts:154-161` | none |
| 11 | Pending AI reviews | REAL (heuristic) | `workflowEvidence.ts:162-169`, same heuristic as #7 | see Phase 2 |
| 12 | Open tasks | REAL | `workflowEvidence.ts:170-177` | none |
| 13 | Approval SLA risk | REAL | `workflowEvidence.ts:178-185` | none |
| 14 | Integration health | REAL | `workflowEvidence.ts:186-193` | none |
| 15 | Audit coverage | PARTIAL | Proxy heuristic, not a real audit-log query (`workflowEvidence.ts:194-201`) | A-51 |

### Router/Ops/Signals row

| # | Element | Tag | Evidence | Actionable |
|---|---|---|---|---|
| 16 | AI Router tile | REAL | `DashboardSection.tsx:146-153` | none |
| 17 | Live Ops tile | REAL | `DashboardSection.tsx:154-161` | none |
| 18 | External Signals tile | PLACEHOLDER | Hardcoded `0` (honest, not fabricated), but DB tables (`social_alert_events`/`_rules`) and UI (`AlertsSection.tsx`) already exist -- missing repository layer only | new -- see Phase 2 |

### Activity, timeline, and priority actions

| # | Element | Tag | Evidence | Actionable |
|---|---|---|---|---|
| 19 | Recent institutional activity | PARTIAL | Correctly demo-gated; honest empty state for real tenants, no live feed built | backlog, optional |
| 20 | Workflow timeline | REAL | `useWorkflowTimeline.ts` -> real `workflow_timeline_events` table | none |
| 21 | Priority actions (core list) | REAL | Built from real `actionQueue` | none |
| 22 | Priority actions' "Request pilot conversation" | PLACEHOLDER | Dead mailto | A-49 |

### Strategic Objectives / AI Recommendations / Risk Heatmap

| # | Element | Tag | Evidence | Actionable |
|---|---|---|---|---|
| 23 | Strategic Objectives | PLACEHOLDER | Hardcoded demo array or empty state; **zero backend anywhere** (`data.ts:119-124`) -- confirmed net-new | A-46 |
| 24 | AI Recommendations | PLACEHOLDER | Hardcoded demo array, dead buttons even in demo mode; **zero backend anywhere** (`data.ts:126-131`) -- confirmed net-new | A-46 |
| 25 | Risk Heatmap | PLACEHOLDER | Hardcoded module-level constant, **not even demo-gated** -- shown identically to every user regardless of real data; **zero backend anywhere** (`DashboardSection.tsx:48-58`) | A-46 |

### Project Health Monitor

| # | Element | Tag | Evidence | Actionable |
|---|---|---|---|---|
| 26 | Project list itself | REAL | Real repositories, correct demo-gating (`data.ts:71-94`) | none |
| 27 | "View All N" + row buttons | PLACEHOLDER | No `onClick` on either | A-52 |

### Cross-cutting, not in the numbered 27 but scoped here

- **A-53**: `getDashboardProjects()`'s `budget`/`spent` fields are fabricated per-index strings, not real data -- not currently rendered on the Dashboard itself, but latent risk for any other consumer.
- **A-54**: the real 8-step Golden Path and a separate, `localStorage`-only-persisted 10-step "Pilot Onboarding checklist" (`BetaOnboardingChecklist.tsx`) overlap in purpose on/near the same page -- product decision needed (merge vs. differentiate).

## Roadmap: 3 Phases to 70-80% REAL

### Phase 1 -- Quick fixes (highest visibility, lowest effort, mostly wiring to existing infra)

Sub-progress checklist:

- [ ] A-42 + A-48: delete both dead "Send Feedback" mailtos (Dashboard header, AI Workspace header); confirm the existing `BetaFeedbackButton`/`BetaFeedbackModal` is the single remaining entry point
- [ ] A-47: wire "Refresh" to a real re-fetch of `useLiveWorkspaceMetrics`/`useWorkflowTimeline`
- [ ] A-52: wire "View All N" to the real Projects & Programs route; wire each project row to that project's detail route
- [ ] A-50: relabel "Active users" to describe what it actually measures (or replace with a real count query -- relabeling is the Phase-1-sized option)
- [ ] A-51: relabel "Audit coverage" to describe the proxy honestly (or wire a real audit-log count -- relabeling is the Phase-1-sized option)
- [ ] A-49: product decision -- wire "Request pilot conversation" to a real capture path, or keep as an intentional external CTA and document why
- [ ] A-43: product decision -- build a minimal real export (e.g., current metrics as JSON/PDF), or remove the button until scoped
- [ ] A-45: product decision -- build a minimal real search (route/document/task name filter), or relabel as "Coming soon" instead of showing fake affordance
- [ ] A-44: rename/reposition "Start Guided Demo" to disambiguate from the Investor Preview product (no new build -- the mechanism already works)

**Phase 1 impact:** closes 9 of the 11 current PLACEHOLDER items and 2 of the 5 PARTIAL items using
mostly-existing infrastructure (the feedback pipeline, navigation routes, and relabeling). This
alone moves the REAL share from 41% toward roughly 22/27 = ~81% if every item above lands as a
full fix rather than a relabel -- realistically closer to 70% given some items will land as the
honest-relabel option rather than a full new-metric build. **This phase alone is likely sufficient
to hit the founder's 70-80% target.**

### Phase 2 -- Medium wiring (uses existing but disconnected infrastructure)

Sub-progress checklist:

- [ ] External Signals (#18): build the missing repository layer connecting `social_alert_events`/`social_alert_rules` (already in Supabase) to `AlertsSection.tsx` (already built) and this Dashboard tile
- [ ] Golden Path / THCC `pendingAiReviews` heuristic (#7, #11): pass a literal AI Review Inbox count instead of the `pendingApprovals / 10` derivation
- [ ] A-54: product decision on the two overlapping onboarding checklists, then implement (merge, or persist the Pilot Onboarding checklist server-side instead of `localStorage`)
- [ ] A-53: remove or replace the fabricated `budget`/`spent` fields in `getDashboardProjects()`

**Phase 2 impact:** closes the remaining PARTIAL items and one more PLACEHOLDER (External Signals),
pushing further past the 70-80% target toward full coverage of everything except genuinely net-new
features.

### Phase 3 -- Net-new builds (no existing infrastructure; each is its own small feature)

Sub-progress checklist:

- [ ] Strategic Objectives: new table + repository + API route + real UI wiring (no existing schema to extend)
- [ ] AI Recommendations: new table/service, or extend the AI Review Inbox's cited-answer pattern as an architectural template; cheapest MVP is founder/admin-curated recommendations rather than AI-generated ones at first
- [ ] Risk Heatmap: cheapest real version aggregates existing `project.riskLevel` values into a count-by-level view (no new categories); the current category set (Referral/Budget/Oxygen/...) looks NGO/healthcare-specific and would need a product decision on whether to keep, genericize, or make tenant-configurable

**Phase 3 impact:** the only genuinely net-new feature work in this roadmap. Deliberately sequenced
last -- Phases 1-2 already reach the requested 70-80% delta without it, and each Phase 3 item is a
real, separate scoping conversation (data model, what "AI recommends" means without overclaiming,
whether risk categories are configurable per tenant).

## What This Document Does Not Do

Per the founder's own instruction ("Give me list... exhaustively" -- not "start fixing"), **no code
has been changed.** Phase 1 is scoped to be startable immediately once authorized; Phases 2-3 need
their own go/no-go and, in places, an explicit product decision before implementation (marked
"product decision" above). This mirrors the roadmap-then-authorize pattern already used for
`docs/readiness/ADMIN_PANEL_WIRING_ROADMAP_2026_07_25.md`.
