# 3-Sprint Roadmap — Pre-Demo Actionables

**Source:** `PRE_DEMO_ACTIONABLES.md`
**Goal:** sequence the 20 actionables so the product stays integrated and seamless at every
sprint boundary (no half-finished, contradictory, or disconnected UX shipped mid-sprint), and so
every change is auditable back to the beta-feedback evidence that motivated it.
**Date:** 2026-07-20
**Sprint length:** assumed 2 weeks each (adjust to your actual cadence — the sequencing and
dependencies matter more than the calendar).

## How to keep this auditable

Every item below carries:
- **Actionable ID** (`A1`–`A20`, matching `PRE_DEMO_ACTIONABLES.md`)
- **Evidence** — the specific report/SWOT finding it addresses
- **Acceptance criteria** — how "done" is verified
- **Audit hook** — the trace artifact proving it shipped and works (a test, an emitted event, or a
  doc update)

When an item ships, append one line to `ITERATION_PROGRESS.md` (same format as the existing
2026-07-20 Supabase-wrappers entry) referencing its Actionable ID, so there is one continuous,
append-only log from beta feedback → SWOT → actionable → sprint → shipped commit/PR.

Recommended GitHub issue labels per item (reusing the taxonomy already defined in
`Enterprise_Beta_Feedback_Batch_1.md` section 15.1): `feedback/batch-1`, the relevant
`priority/P0`–`P2`, and an `area/*` label (`area/onboarding`, `area/reliability`,
`area/ai-quality`, `area/integrations`, `area/analytics`).

---

## Sprint 1 — Stop the bleeding: onboarding friction and trust signals

**Theme:** every item here is UI/config-level, touches no new backend infrastructure, and is safe
to ship without coordination risk. This sprint directly answers the two P0 blockers every
non-promoter cited (unreliable performance, unclear value) with the cheapest possible fixes while
heavier fixes (Sprint 2) are built.

| ID | Item | Evidence | Acceptance criteria | Audit hook |
|---|---|---|---|---|
| A1 | Golden Path opt-in | Onboarding-friction free-text + P0 clarity blocker | On-demand is the default for new sessions; preference persists across reload | ✅ Shipped 2026-07-20. Tests: `useGoldenPathDisplayMode.test.tsx`, `enterpriseComponents.test.tsx` (collapse/expand cases) |
| A2 | Explain blocked/locked steps | Same as A1 — cumbersome onboarding feedback | Every `blocked` or `lockedForRole` step renders a one-line reason, never a bare status badge | ✅ Shipped 2026-07-20. Test: `enterpriseGoldenPath.test.ts` ("explains why each blocked step is blocked") |
| A8 | Empty states with one CTA | Unclear value (P0) | Dashboard/Projects/Tasks/Knowledge Hub each show a single actionable CTA when the tenant has no data, never a blank panel | New RTL test per page asserting the empty-state CTA renders when the relevant collection is empty |
| A5 | Loading/timeout/retry states on long AI ops | Slow/unreliable performance (P0, 100% of non-promoters) | Every AI-generation call site shows a progress indicator past 2s and a retry affordance past a defined timeout | New test asserting the loading state renders while the AI call is pending, and a retry control appears on timeout |
| A19 | Reliability expectation-setter copy | Same as A5 | AI Workspace shows a "usually takes ~Ns" hint sourced from a config constant (placeholder until real p50/p95 telemetry lands) | Snapshot/text assertion that the hint renders; tracked as a placeholder pending the report's own P0 latency-instrumentation item |
| A20 | Role-appropriate default landing pages | Golden path currently shows Employees mostly-locked Executive views | Employee role lands on a route where ≥1 action is immediately available, not a mostly-locked dashboard | Routing test asserting default redirect target per role |
| A12 | Surface feedback button at workflow completion | Feedback dimension — catch signal at the moment of outcome | `BetaFeedbackButton` (or a lightweight variant) appears in the completion state of at least one workflow (e.g. task closed, review approved) | Component test asserting the button renders in the completed-workflow state |

**Sprint 1 exit criteria:** A1/A2 already shipped; remaining 5 items merged, tests green,
`ITERATION_PROGRESS.md` has 7 new entries.

---

## Sprint 2 — Value clarity, AI trust, and feedback instrumentation

**Theme:** items here need real content or moderate backend touch (seed data, retrieval metadata,
event wiring) and build directly on Sprint 1's UX foundation — e.g. the 3 outcome-first onboarding
paths (A7) need the demo workspace (A3) to point to, and the in-context micro-survey (A9) needs a
completed-step trigger that Sprint 1's A12 pattern already established.

| ID | Item | Evidence | Acceptance criteria | Audit hook |
|---|---|---|---|---|
| A3 | Guided demo workspace with seeded data | Unclear value (P0) | A new tenant can opt into a pre-populated sample workspace and reach a completed workflow within one session, without uploading real documents | E2E test (extends existing Playwright specs) walking the seeded workspace to one completed workflow |
| A7 | 3 outcome-first onboarding paths | Report section 11 recommendation | New user chooses one of 3 named paths (knowledge/AI decision support, workflow+approvals, stakeholder/CRM) at first login; each routes into the demo workspace from A3 | Test asserting each path selection routes to its target flow; analytics event per path chosen (ties to A11) |
| A18 | Reduce required setup decisions before first AI interaction | Same as A7 — time-to-value | A solo evaluator can ask a grounded question before completing team provisioning | Test asserting the grounded-question step is reachable without team-provisioning being complete |
| A4 | AI citations + rationale under outputs | AI output quality/explainability (P0, 40%) | Every AI Workspace answer displays its source count and a one-line rationale; no bare answer text | Component test asserting citation/rationale elements render alongside any AI answer |
| A6 | Bulk/quick-approve in Review Inbox | Workflow friction (P0, 35%) | Low-risk queued items can be approved in one action instead of one-by-one; audit event still recorded per item | Test asserting a bulk-approve action emits one audit event per approved item (no loss of auditability for the sake of speed) |
| A9 | In-context micro-survey after first completed step | No telemetry linkage between sentiment and usage (explicit report gap) | A 1-click, 1-question survey appears once per user after their first completed AI review or golden-path step | Test asserting the trigger fires once per user (not repeatedly) and records a response event |
| A11 | Time-to-first-value / onboarding-completion analytics events | Report's own metric spec (section 13.2), not yet instrumented | Events fire into the existing Mixpanel-ready analytics for: account created → workspace configured → first AI task → first review → first workflow action | Test asserting each funnel event fires at the correct trigger point (existing `analytics.test.ts` pattern) |

**Sprint 2 exit criteria:** A3/A7/A18 shipped together (they're interdependent — do not ship one
without the others, or the onboarding experience becomes inconsistent); A4/A6 shipped independently;
A9/A11 wire into whatever completion events Sprint 1 and this sprint's A7 already emit.

---

## Sprint 3 — Visible integrations, retention signals, demo readiness

**Theme:** by this point the core experience (Sprint 1) and value/trust (Sprint 2) are addressed,
so this sprint focuses on converting already-completed infrastructure work (the Supabase wrappers
from `ITERATION_PROGRESS.md`) into customer-visible value, plus low-risk retention/momentum
polish timed close to the actual demo date.

**Planned:** 2026-07-21, after Sprint 1 (7/7) and Sprint 2 (7/7) were confirmed merged to `main`
(PR #146) — see `PRODUCT_ITERATION_I_CLOSEOUT.md` for that close-out record. This plan runs in 4
phases rather than one flat list, because two things found while planning it change how A13/A14/A15
need to be scoped, and because Sprint 3's own retention items (A16/A17) build on a completion-event
surface that was never verified end-to-end.

### Phase 0 — Integration & harmonization check (gates everything below; runs first, not in parallel)

1. **Live browser walkthrough of the A3/A7/A18 onboarding trio.** Carried over from Sprint 2's own
   exit criteria — verified only via `typecheck`/`lint`/unit tests of the pure logic module, never
   walked through in a running app. A16 and A17 both build on the same completion-event surface
   this trio established, so closing this gap first de-risks both.
2. **Runtime audit of `react-router` 7→8 and the Capacitor major-version bumps** (merged via
   dependabot around the same time as the typescript/eslint incompatibility documented in
   `ITERATION_PROGRESS.md`'s 2026-07-21 entry). These passed `typecheck`/`lint` cleanly but were
   never checked for runtime behavior — major version bumps aren't guaranteed typecheck-safe for
   route config shape or hook signatures.
3. **Cross-check that Sprint 1 and Sprint 2 features don't conflict now that both are live together
   on `main` for the first time** — e.g., Golden Path's on-demand default interacting with A7's
   onboarding goal-routing.
4. **Confirm every Sprint 3 branch is cut only after its predecessor PR is actually merged**, not
   merely pushed — the direct, named lesson from the git-reconciliation incident
   (`ITERATION_PROGRESS.md`, 2026-07-21): a PR merged mid-flight, before all its planned commits
   had landed, is what stranded 12 of the 20 actionables on an orphaned branch for roughly a day.

### Phase 1 — A15 first, reordered ahead of A13/A14

Originally sequenced last (see "cross-sprint dependencies" below for why that made sense at the
time this roadmap was written). Reordering it first because scoping Sprint 3 surfaced that the
actual problem is bigger than "hide 10 wrappers": `src/services/integrations/pluginRegistry.ts`
already lists roughly 19 integrations — Slack included — every single one flagged
`demoConnector: true`, rendered as a full "Productivity Plugin Registry" grid in `/integrations`.
This is the exact "generic catalogue" the beta report said not to show, and it predates this
session's actionables entirely (it wasn't caught by the three-round demo-data-leakage audit, which
focused on data shown to tenants rather than this specific catalogue). A15 needs to cut this down
to reality — the integrations that are genuinely real (Gmail, Microsoft) plus whatever Slack/
Calendly become in Phase 2 — before adding more to a page that already overstates capability.

### Phase 2 — A13 + A14 (Slack + Calendly quick-connect)

| ID | Item | Evidence | Acceptance criteria | Audit hook |
|---|---|---|---|---|
| A13 | Slack quick-connect in Settings | Limited integrations (P1, 45%, most-selected issue) | A Settings page lets a user authorize and configure a Slack connection using the already-enabled `slack_wrapper`; connection status is visible | Test asserting the connect flow completes and persists connection state; migration added for the wrapper per `ITERATION_PROGRESS.md`'s recommended next step |
| A14 | Calendly quick-connect in Settings | Same as A13; most directly evidenced by respondent free-text (calendar) | Same pattern as A13, using `calendly_wrapper` | Same pattern as A13 |

**Hard external dependency, not a code gap:** there is no Slack or Calendly connector code anywhere
in `src/` today — `slack_wrapper`/`calendly_wrapper` only appear in documentation. The existing
Gmail/Microsoft pattern (`connectorContract.ts`, `/api/connectors/oauth/start?provider=...`,
rendered honestly as "provider-gated for production credentials" until real env credentials exist)
is the template to extend, and that code can be written without external input. But this sprint's
own exit criterion requires these be demoable live with a **real, not mocked, test account** —
that requires actual Slack App / Calendly OAuth app registrations (client ID/secret), which only
whoever holds those accounts can create. This blocks the *live-verification* step specifically, not
the code-writing step; scoped and flagged here rather than silently assumed to resolve itself.

### Phase 3 — A10, A16, A17 (independent, no external blockers)

| ID | Item | Evidence | Acceptance criteria | Audit hook |
|---|---|---|---|---|
| A10 | Post-demo satisfaction capture | Feedback dimension, demo-specific signal distinct from beta survey | A single question appears at the natural end of a live demo session (e.g. on session/route exit) | Test asserting the prompt fires once per demo session and records a response |
| A16 | "What's New" panel at login | Retention — perceived momentum | Panel shows the 3 most recent shipped items, sourced from real `ITERATION_PROGRESS.md` entries, not placeholder copy | Content test asserting the panel renders and reflects the current release's entries |
| A17 | Completion celebration on finishing a workflow | Retention, reinforces the core knowledge→AI→review→action→audit loop | A visible confirmation (not just a status change) appears when a task/review/report is completed end-to-end, using the same completion-event surface validated in Phase 0 | Component test asserting the celebration state renders on completion, using the same completion trigger as A12/A9 |

**Sprint 3 exit criteria:** Phase 0's 4 checks all closed; A15 ships before A13/A14 are added to the
integrations surface; Slack + Calendly are demoable live against a real test account (or explicitly
still blocked on external credentials, not silently skipped); `ITERATION_PROGRESS.md` updated to
mark the "product-facing surface" gap from the 2026-07-20 entry as closed for these 2 wrappers
specifically (the other 10 remain explicitly open, and the `pluginRegistry.ts` catalogue no longer
overstates the other ~15); What's New panel reflects real Sprint 1-3 work, not placeholder copy;
every PR merges only after its author confirms all planned commits for it are already pushed.

---

## Cross-sprint dependencies (why this order, not another)

- **A1/A2 had to come first** — every other onboarding change (A3, A7, A18) assumes the golden
  path is no longer forced, otherwise new onboarding paths would compete with a mandatory checklist.
- **A3 (demo workspace) must precede A7 (3 onboarding paths)** — the paths need somewhere real to
  route to.
- **A11 (analytics events) is threaded through A7 and A9** rather than batched at the end, so
  instrumentation ships with the features it measures instead of retrofitted later.
- **A13/A14/A15 (all of Sprint 3) come after Sprints 1-2, not before** — shipping integrations
  before the onboarding/trust work would mean the highest-visibility demo item (new integrations)
  sits on top of the same reliability/clarity complaints that caused "limited integrations" to be
  flagged as an *expansion* request rather than the true blocker. Fix the blocker first.
- **Within Sprint 3 itself, A15 now comes before A13/A14** (reordered when Sprint 3 was actually
  planned, 2026-07-21) — see Sprint 3's Phase 1 note. The original assumption was that capping the
  integrations surface only made sense once there were 2 real connectors to cap it *to*; scoping
  the work revealed the existing catalogue (`pluginRegistry.ts`) already overstates ~19 connectors
  as demo-ready, which is worth fixing regardless of whether Slack/Calendly exist yet.

## What "fully auditable" means in practice for this roadmap

1. Every actionable has a named acceptance criterion and audit hook above — no item ships without
   a test or a recorded event proving it works.
2. Every ship event gets one line in `ITERATION_PROGRESS.md`, continuing the existing append-only
   log rather than starting a parallel tracking system.
3. Every actionable traces to a specific, numbered piece of evidence in
   `Enterprise_Beta_Feedback_Batch_1.md` or `SWOT_Analysis_Batch_1.md` — nothing here is a
   speculative addition introduced mid-roadmap.
4. GitHub issues opened from this roadmap should use the label taxonomy already defined in the
   original report (section 15.1) so the full chain — survey response → SWOT finding → actionable
   → issue → PR → shipped commit → audit log entry — is filterable end-to-end.
