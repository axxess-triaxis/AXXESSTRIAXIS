# Iteration Progress Log — Batch 1 Beta Feedback

Tracks concrete actions taken against the priorities identified in `Enterprise_Beta_Feedback_Batch_1.md`
and `SWOT_Analysis_Batch_1.md`. Each entry references the specific report finding it addresses, what
was actually done, and — honestly — what it does and doesn't yet close. New entries should be appended
below as further iteration work lands.

---

## 2026-07-20 — Supabase-level third-party data connectors enabled

### Feedback this addresses

"Limited integrations" was the single most-selected issue in the product survey — 9 of 20 unique
respondents (45%), ranked #1 among all reported weaknesses (`Enterprise_Beta_Feedback_Batch_1.md`,
section 7.3). The report classifies this as **P1** ("Core integrations") in its priority framework
(section 10.1) and as backlog item **B1-P1-01** ("Ship pilot-driven email and calendar integrations",
section 15.3). The SWOT analysis (`SWOT_Analysis_Batch_1.md`) further notes this is expansion demand
from believers, not an adoption blocker — every respondent who flagged it was a promoter — so this is
correctly sequenced after the P0 reliability/clarity fixes, not instead of them.

### What changed

The following were enabled on the Supabase project (via the Supabase dashboard, at the database
level — not yet reflected as committed migrations in `supabase/migrations/`):

**Third-party data connectors (Wrappers / foreign data wrappers)** — these let Postgres query an
external service's data as if it were a native table:

| Wrapper | Third-party service | Relevance to beta feedback |
|---|---|---|
| `airtable_wrapper` | Airtable | General data-source connectivity request |
| `auth0_wrapper` | Auth0 | Enterprise SSO/identity — relevant to the "security or trust concerns" weakness (15%, section 7.3) and the SWOT's trust-without-verification threat |
| `calendly_wrapper` | Calendly | Directly serves backlog item B1-P1-01 (calendar integration) |
| `clickhouse_wrapper` | ClickHouse | Enterprise data-warehouse connectivity — relevant to "platform scalability" and "enterprise readiness" ratings (section 8, module ratings) |
| `hubspot_wrapper` | HubSpot | CRM/stakeholder coordination use case (section 8.6) |
| `notion_wrapper` | Notion | Knowledge-source connectivity — relevant to "Documents, knowledge and RAG" (30% selection, section 7.1) |
| `mssql_wrapper` | Microsoft SQL Server | Enterprise data-warehouse connectivity |
| `paddle_wrapper` | Paddle | Billing/payments — relevant to future pilot-to-paid conversion (section 14) |
| `s3_wrapper` | Amazon S3 | Document/object storage connectivity |
| `slack_wrapper` | Slack | Notifications/stakeholder coordination |
| `snowflake_wrapper` | Snowflake | Enterprise data-warehouse connectivity |
| `stripe_wrapper` | Stripe | Billing/payments — relevant to future pilot-to-paid conversion |

**Platform primitives** (not integrations themselves, but infrastructure that makes building
integrations, automation, and security features faster going forward):

| Feature | Purpose |
|---|---|
| Cron | Scheduled/recurring database jobs |
| Queues | Asynchronous job/message processing |
| Vault | Encrypted secrets storage at the database level — relevant to closing the security/compliance documentation gap flagged in the SWOT (section: Threats, "trust-without-verification gap") |
| Database Webhooks | Event-driven triggers on data changes, usable to drive integration workflows |
| Data API | Auto-generated REST API surface over the database |
| GraphQL / GraphiQL | GraphQL API surface and its interactive explorer |

### What this does and doesn't close

**Progress:** this is real, concrete infrastructure progress toward the P1 "Core integrations" item —
the data-layer connectivity for 12 third-party services now exists, where none did before at this
layer.

**Not yet closed:** enabling a wrapper extension makes a connection *possible*, it does not by itself
make it *usable by a customer*. Each wrapper still needs, per service: a configured foreign server
with real credentials, a schema/table mapping, and — most importantly — a product-facing surface
(e.g., an Integrations settings page, a workflow trigger, a sync job) before a beta user or pilot
customer experiences this as "AXXESS now integrates with Slack," rather than as a database
capability invisible to them.

This is a different layer from the existing application-level integrations already shipped:
`src/services/integrations/` currently contains OAuth-based connectors for Gmail and Microsoft Graph
mailbox (`gmailSelectedMessage.ts`, `microsoftGraphMailbox.ts`, `microsoftGraphSelectedMessage.ts`),
an `oauthProvider.ts`, a `connectorContract.ts` abstraction, a `pluginRegistry.ts`, and a
`tokenVault.ts` — this is what the report's "Gmail/Microsoft integrations" line (15% selection,
section 7.1) refers to. The new Supabase wrappers are a complementary, database-level mechanism and
are not yet wired into that same application-layer connector architecture.

**Also not committed as code yet:** none of these wrappers currently appear in
`supabase/migrations/` — they were enabled directly against the live Supabase project. Per this
repo's normal practice (every other extension, e.g. `pgcrypto`, is enabled via a versioned
migration), these should eventually be captured as migrations (e.g. via `supabase db pull` or a
hand-written `create extension if not exists <wrapper_name>;` migration) so the infrastructure state
is reproducible and reviewable, rather than living only in the dashboard.

### Recommended next steps to fully close B1-P1-01 / P1 "Core integrations"

1. Commit the wrapper enablement as versioned Supabase migrations.
2. Pick 2–3 wrappers tied to an actual pilot workflow (per the report's own guidance: "Deliver 2–3
   integrations tied to pilot workflows, not a generic catalogue," section 10.1) rather than
   activating all 12 in the product at once. Calendly (calendar) and Slack (notifications) are the
   most directly evidenced by respondent free-text requests (section 7.6).
3. Build the product-facing configuration surface (foreign server setup + credential entry +
   sync/workflow trigger) for those 2–3 first.
4. Track adoption per the experiment backlog's `B1-EXP-10` ("Promoter integration requests convert
   to active use") — only prioritize further wrappers once committed usage is observed for the first
   batch.

---

## 2026-07-20 — 20 pre-demo actionables identified; Golden Path made optional (A1/A2 shipped)

### What happened

`SWOT_Analysis_Batch_1.md` was used to derive 20 immediately-executable actionables targeting
customer ease, experience, retention, feedback, and execution, documented in
`PRE_DEMO_ACTIONABLES.md` and sequenced into a 3-sprint plan in `SPRINT_ROADMAP_PRE_DEMO.md`.

Two items (A1, A2) were implemented immediately rather than scheduled, since they directly
answered the reported onboarding-friction feedback:

- **A1 — Golden Path made opt-in.** The enterprise golden path
  (`src/services/workflows/enterpriseGoldenPath.ts`, rendered via
  `src/components/enterprise/EnterpriseWorkflowJourney.tsx`) was previously always-on with no
  way to dismiss it. Added a `GoldenPathDisplayMode` ("guided" | "on-demand"), defaulting new
  sessions to **on-demand** (a collapsed one-line summary with a "View recommended setup path"
  expander), with the choice persisted per user via `src/hooks/useGoldenPathDisplayMode.ts`
  (localStorage-backed, mirrors the existing `useGuidedDemo.ts` pattern). High-discretion users
  can still opt into the full guided view and make it their default.
- **A2 — Blocked/locked steps now explain themselves.** Previously a blocked or role-locked step
  showed only a bare "Blocked" badge with no next action. Added a `blockedReason` field (service
  layer) populated for every step that can actually be blocked, and a "Requires {role}" hint for
  role-locked steps, both rendered inline in the journey UI.

### Evidence

Both changes trace directly to `Enterprise_Beta_Feedback_Batch_1.md` section 7.6 (qualitative
theme: "Usability — more user-friendly; reduce friction") and the user-reported feedback that
onboarding felt cumbersome, plus the SWOT's P0 weakness "value clarity is the second unanimous
blocker."

### What this does and doesn't close

**Closed:** the golden path no longer forces every user through an 8-step checklist with no
escape hatch, and blocked/locked states are self-explanatory rather than dead ends.

**Not yet closed:** this is UI/config-level only (Sprint 1 of the 3-sprint roadmap). The deeper
P0 items — actual reliability instrumentation, AI output explainability, and a guided demo
workspace — remain scheduled for Sprints 1-2 per `SPRINT_ROADMAP_PRE_DEMO.md`. Items A3-A20 are
not yet implemented.

### Audit trail

- Service logic: `src/services/workflows/enterpriseGoldenPath.ts`, tested in
  `enterpriseGoldenPath.test.ts` ("explains why each blocked step is blocked instead of leaving it
  unexplained", "leaves blockedReason unset for steps that are not blocked").
- Display-mode hook: `src/hooks/useGoldenPathDisplayMode.ts`, tested in
  `useGoldenPathDisplayMode.test.tsx`.
- UI: `src/components/enterprise/EnterpriseWorkflowJourney.tsx`, wired into
  `src/features/dashboard/DashboardSection.tsx` and `src/features/ai-workspace/AIWorkspaceSection.tsx`,
  tested in `enterpriseComponents.test.tsx` ("collapses the golden path to an on-demand summary...",
  "lets a user persist their preference...", "explains why a blocked or locked step can't be
  actioned yet").

---

## 2026-07-20 — Sprint 1 complete: remaining 5 items shipped (A8, A5, A19, A20, A12)

### What happened

Continuing Sprint 1 of `SPRINT_ROADMAP_PRE_DEMO.md` (tracked in `SPRINT_CHECKLIST_PRE_DEMO.md`),
the remaining 5 items were implemented, bringing Sprint 1 to 7/7:

- **A8 — Empty states with a clear CTA.** `DashboardSection.tsx` (Project Health Monitor card),
  `ProjectsSection.tsx`, and `TasksSection.tsx` previously rendered nothing (a blank area or an
  empty table body) when a tenant had no real projects/tasks yet. All three now render the
  existing `EmptyState` component with a "Create your first..." CTA. Knowledge Hub already had
  this pattern; it was the only page previously covered.
- **A5 — Loading/timeout/retry on AI operations.** `AIWorkspaceSection.tsx`'s
  `askGovernedQuestion` had no timeout at all and no loading indicator beyond a disabled send
  button. Added a 20-second `AbortController` timeout, an inline "Generating governed answer..."
  progress indicator while pending, and a distinct timeout message with a one-click Retry
  (reusing the preserved input, since it's only cleared on success).
- **A19 — Reliability expectation-setter copy.** Shipped together with A5: "usually takes 5-8
  seconds" shown alongside the loading indicator.
- **A20 — Role-appropriate default landing pages.** Every authenticated user previously landed
  on the Executive Dashboard regardless of role, including Employees who can't act on most of its
  golden-path items (team provisioning, human review, audit evidence all require
  Admin/Executive/Manager). Added `defaultSectionForRole()` in `src/app/routing/routes.ts` and a
  one-time redirect effect in `App.tsx`, scoped specifically to the generic post-login entry route
  (`activeRoute.id === "app"`) so it never overrides an explicit deep link. Employees now land on
  Tasks & Workflow; all other roles are unchanged.
- **A12 — Surface feedback at workflow completion.** `TasksSection.tsx` now shows a
  one-time-per-session dismissible prompt the first time a task is marked complete, opening the
  existing `BetaFeedbackModal`. The persistent floating `BetaFeedbackButton` in `AppShell.tsx` is
  unchanged — this is additive, not a replacement.

### Evidence

Each item traces to the specific SWOT/report findings cited in `PRE_DEMO_ACTIONABLES.md` items
5, 8, 12, 19, 20 (all updated to ✅ there) and `SPRINT_ROADMAP_PRE_DEMO.md`'s Sprint 1 table.

### What this does and doesn't close

**Closed:** Sprint 1 is functionally complete — onboarding friction (golden path optionality,
blocked-state clarity, role-appropriate landing, empty-state CTAs) and basic reliability
perception (loading/timeout/retry, expectation-setting copy) are all addressed at the UI level.

**Not yet closed, honestly:** unlike A1/A2/A20, items A8/A5/A19/A12 do not have dedicated new unit
tests — `DashboardSection.tsx`, `ProjectsSection.tsx`, `TasksSection.tsx`, and
`AIWorkspaceSection.tsx` have no existing component-test coverage in this repo to begin with (this
repo relies on Playwright e2e specs for these heavy page components, not Vitest/RTL unit tests).
Adding first-time test infrastructure for four large page components was judged out of scope for
"immediately executable pre-demo" work; verification here is `typecheck` + `lint` (both clean,
zero warnings) + the full existing suite still passing (no regressions) + manual code review. This
gap is tracked in `SPRINT_CHECKLIST_PRE_DEMO.md`'s Sprint 1 exit criteria as a flagged follow-up,
not silently skipped.

The real backend reliability instrumentation (p50/p95 latency, AI evaluation harness) that A19's
copy is a placeholder for remains unbuilt — that is Sprint 2/P0 work per the original report, not
this entry.

### Audit trail

- `src/features/dashboard/DashboardSection.tsx`, `src/features/projects/ProjectsSection.tsx`,
  `src/features/tasks/TasksSection.tsx` — empty-state CTAs (A8), completion feedback prompt (A12,
  Tasks only).
- `src/features/ai-workspace/AIWorkspaceSection.tsx` — query timeout/retry/loading copy (A5, A19).
- `src/app/routing/routes.ts` (`defaultSectionForRole`, tested in `routes.test.ts`) and
  `src/app/App.tsx` (redirect effect) — role-appropriate landing (A20).
- Verification: `pnpm run typecheck` clean, `pnpm run lint` clean (zero warnings), full Vitest
  suite passing with no regressions.

---

## 2026-07-20 — Golden Path rationale documented; demo-data leakage audit and fix

### What happened

Two separate requests, both documented and (for the second) remediated in the same pass:

1. **Golden Path rationale.** Wrote `GOLDEN_PATH_OPTIONAL_RATIONALE.md`, laying out the exact beta
   feedback stats behind the A1 decision (35% "too many steps", 20% "difficult onboarding", 30%
   "unclear value", 100% of non-promoters citing both reliability and clarity issues — all cited
   to `Enterprise_Beta_Feedback_Batch_1.md` section numbers), the code-level mechanism found during
   the A1/A2 audit that plausibly explains those numbers, and an explicit argument for why this is
   additive (two new capabilities: persisted preference, inline explanations) rather than a
   removal of anything that existed before.

2. **Demo data leakage audit.** Triggered by an explicit requirement that beta must contain zero
   content from the investor-demo build. Audit findings and full remediation detail are in
   `DEMO_DATA_LEAKAGE_AUDIT.md`. Summary of what was found and fixed:
   - **Critical:** `serviceProvider.ts`'s `resilientRepositories` — the repository set used for
     every real beta/production request — silently substituted fake demo data for projects, tasks,
     documents, users, orgs, and more whenever a live Supabase call threw for any reason (network
     blip, expired session, RLS misconfig). Fixed: fallback target changed from `demoRepositories`
     to `emptyRepositories` everywhere, so a live failure now surfaces as a genuine empty result or
     a thrown error, never fabricated content.
   - **Critical:** `institutionalRepository` was hardcoded to the demo repository in both the live
     and resilient repository sets (no real one exists yet), feeding a fake `pendingApprovals`
     count into `getLiveWorkspaceMetrics` for every real tenant. Fixed: now uses
     `emptyRepositories.institutionalRepository`, resolving to `0` honestly instead of a plausible
     fake number.
   - **Critical:** `useLiveWorkspaceMetrics.ts` initialized its state with, and fell back on error
     to, `getFallbackLiveWorkspaceMetrics()` — 186 fake projects, 412 fake tasks, 2200 fake
     documents — unconditionally. This is the highest-visibility instance found: these are the
     headline numbers on Dashboard, AI Workspace, and the golden path. Fixed: now demo-mode-gated,
     with a new `getZeroLiveWorkspaceMetrics()` used for real tenants.
   - **High:** decorative demo content rendered unconditionally (not gated by
     `isDemoModeEnabled()`) in `DashboardSection.tsx` (fake org name in the header, fake executive
     metric cards, fake activity feed), `ProjectsSection.tsx` and `TasksSection.tsx` (decorative
     fake project/audit-timeline strips, plus a "Demo"/"Live" badge that was inferring mode from
     data presence rather than checking real demo-mode state), and `AIWorkspaceSection.tsx` (a
     fully fabricated RAG answer with fake citations used as both the initial state and the
     error fallback, plus a hardcoded fake audit-trail ID). All now gated behind
     `isDemoModeEnabled()`, matching the pattern already correctly used in Knowledge Hub and
     Settings.

### What this does and doesn't close

**Closed:** the specific mechanisms found that would show a real beta customer fabricated data —
either through a silent error-triggered fallback or through always-on decorative UI — are fixed.

**Honest gaps:**
- `pendingApprovals` and `socialAlerts` now read `0` for every real tenant, not a real count, until
  genuine live repositories for those are built. This is a capability gap made visible, not
  introduced by this fix.
- Three more real-runtime call sites of `getFallbackLiveWorkspaceMetrics()` were identified but not
  fixed in this pass: `EnterpriseAdminPage.tsx`, `pilotAcceptanceRuntime.ts`, and the
  customer-success live-ops API route. Listed explicitly in `DEMO_DATA_LEAKAGE_AUDIT.md` as a
  follow-up, not silently left out.
- No dedicated new unit tests for the `resilientRepositories` fallback change or the
  `isDemoModeEnabled()` gating — verified via typecheck, lint, full-suite regression check, and
  manual review only. See `DEMO_DATA_LEAKAGE_AUDIT.md` for why (would require mocking
  `featureFlags.enableSupabaseRuntime`, computed once at module import).

### Audit trail

- `src/providers/serviceProvider.ts` — `withResilientFallback` (renamed from `withDemoFallback`),
  `resilientTenantRepository`/`resilientMutableRepository` now take an `emptyRepository` fallback.
- `src/services/live-platform/livePlatform.ts` — `getZeroLiveWorkspaceMetrics()` added, tested in
  `livePlatform.test.ts`.
- `src/hooks/useLiveWorkspaceMetrics.ts` — `initialMetrics()` helper, demo-mode-gated.
- `src/features/dashboard/DashboardSection.tsx`, `src/features/projects/ProjectsSection.tsx`,
  `src/features/tasks/TasksSection.tsx`, `src/features/ai-workspace/AIWorkspaceSection.tsx` — all
  decorative demo content gated behind `isDemoModeEnabled()`.

---

## 2026-07-20 — Full codebase sweep: zero dummy data (Round 2)

### What happened

Following an explicit instruction that beta must have "no dummy or placeholder data anywhere,"
ran a full-codebase search (every `src/lib/demo/*` and `src/demo/*` import, not just the four
pages already fixed) and closed every additional instance found. Full detail in
`DEMO_DATA_LEAKAGE_AUDIT.md`'s "Round 2" section; summary:

- **`dashboard/data.ts`** bypassed the earlier `serviceProvider.ts` fix by importing
  `demoRepositories` directly. Worst instance found: a brand-new, genuinely empty real tenant
  (zero projects) was shown **fabricated project and KPI data** instead of an honest empty state.
  Also fixed: the "live" KPI branch was mixing in a fake approvals count and a hardcoded literal
  `"2,200"` RAG-documents number even when otherwise using real data. Fixed all of it; added
  `getZeroDashboardKpis()` for honest zero-state.
- Gated `dashboardObjectives`, `dashboardAiRecommendations`, `governanceAlerts`, `workloadData`,
  `performanceData` in `DashboardSection.tsx` behind `isDemoModeEnabled()` (one alert card even had
  a hardcoded "Live" badge on fabricated data).
- **`AnalyticsSection.tsx`, `ApprovalsSection.tsx`, `StakeholdersSection.tsx`** are, in their
  entirety, illustrative content with no live repository backing at all (no OKR engine, no
  approvals workflow, no CRM repository exist). Fully gated behind `isDemoModeEnabled()` with an
  honest "not available yet" `EmptyState` for real tenants.
- **`DocumentsSection.tsx`, `IntegrationsSection.tsx`** are hybrids — ingestion and connector
  health are genuinely live; only a decorative browse-list/gallery was fake. Added `EmptyState`
  messaging for the now-empty (already-fixed) sections.
- **`pilotAcceptanceRuntime.ts`** and **`src/app/api/admin/customer-success/live-ops/route.ts`**
  had the same silent-fallback-to-fake-metrics-on-error bug as `useLiveWorkspaceMetrics.ts`. Fixed
  the same way (demo fixture only when genuinely in demo/preview mode, honest zero otherwise).
- **Reviewed and left as-is:** `EnterpriseAdminPage.tsx`'s `pilotAcceptancePreviewSnapshot()` /
  `customerSuccessPreviewSnapshot()` are explicitly named "preview," use a fixed timestamp and demo
  IDs, and read as an intentional internal admin tool, not a customer-facing leak.

### What this does and doesn't close

**Closed:** every feature page and runtime call site found in a full-codebase sweep now either
shows real data, an honest zero/empty state, or demo content strictly gated behind
`isDemoModeEnabled()`. No page silently substitutes fabricated content for a real tenant anymore
that this sweep could find.

**Explicitly does not close:** "no dummy data" (achieved) is different from "Approvals,
Stakeholders/CRM, and Analytics/OKRs are genuinely live, linkable, and feedable" (not achieved,
and not achievable via hygiene fixes). No `approvalsRepository`, `stakeholdersRepository`,
`okrRepository`, or `analyticsRepository` exists anywhere in `src/repositories/` — building real
versions of these is a multi-sprint product build (schema, migrations, RLS, repository
implementations), not something this pass could or should attempt piecemeal. Recommended as its
own tracked initiative; see `DEMO_DATA_LEAKAGE_AUDIT.md`'s closing section for suggested priority
order (approvals first, tying into the AI Review Inbox's existing `pendingAiReviews` concept).

A handful of lower-risk, not-yet-reverified consumers of `src/demo/*` remain (`TopBar.tsx`,
`AuthProvider.tsx`, the legacy institutional view repository) — named and flagged, not silently
skipped.

### Audit trail

- `src/features/dashboard/data.ts` — removed empty-tenant fake-data branches; added
  `getZeroDashboardKpis()`.
- `src/features/analytics/AnalyticsSection.tsx`, `src/features/approvals/ApprovalsSection.tsx`,
  `src/features/stakeholders/StakeholdersSection.tsx`, `src/features/documents/DocumentsSection.tsx`,
  `src/features/integrations/IntegrationsSection.tsx` — demo content gated behind
  `isDemoModeEnabled()`.
- `src/services/pilot/pilotAcceptanceRuntime.ts`,
  `src/app/api/admin/customer-success/live-ops/route.ts` — fixed the same
  silent-fallback-to-fake-data bug as `useLiveWorkspaceMetrics.ts`.
- Verification: `pnpm run typecheck` clean, `pnpm run lint` clean (zero warnings), full suite
  87 files / 239 tests passing (1 existing test in `data.test.ts` rewritten to match the corrected
  behavior, not just new tests added).

---

## 2026-07-20 — Sprint 2 started: A4 (AI citations + rationale) shipped

### What happened

First item of Sprint 2 (`SPRINT_ROADMAP_PRE_DEMO.md`), tracked in `SPRINT_CHECKLIST_PRE_DEMO.md`.

Added a genuine, retrieval-derived `rationale` field to the `RagAnswer` type
(`src/services/rag/governedRag.ts`), computed from the actual matched sources rather than being a
decorative label:

- With sources: `"Synthesized from N governed source(s) (top match: \"<title>\", <score>%
  relevance)."`
- With zero sources: an honest `"No authorized institutional source matched this question closely
  enough to generate a governed answer."`

Wired into both RAG answer paths: `answerWithGovernedRag` (`governedRag.ts`) and
`answerTenantQuestion` (`src/services/rag/tenantRagWorkflow.ts`, the one actually used by the
`/api/rag/query` production endpoint — it constructs a `RagAnswer` inline for its
persistent-citations branch, so the same rationale logic was added there too, not just in the
service used by tests).

Rendered under the answer bubble in `AIWorkspaceSection.tsx`, alongside the pre-existing "Sources
Used" side panel (which already showed per-source excerpts/scores — the rationale line is the new
piece, not a replacement).

### Evidence

`Enterprise_Beta_Feedback_Batch_1.md` section 7.3: "AI output quality" flagged by 40% of
respondents; the report's own 30/60/90 plan calls for "Add source citations/provenance and concise
model-rationale display" (section 11, Days 0-30 engineering).

### What this does and doesn't close

**Closed:** every governed AI answer now carries a real, derivation-based explanation, not just a
raw answer string — addressing the specific "concise rationale" gap the report calls out.

**Not yet closed:** this is a retrieval-transparency improvement, not a full AI-output evaluation
harness (the report's actual P0 item). It doesn't improve answer *quality* or add a systematic
evaluation suite — those remain open per the original 30/60/90 plan.

### Audit trail

- `src/services/rag/governedRag.ts` — `rationale` field added to `RagAnswer`, computed in
  `answerWithGovernedRag`. Tested in `governedRag.test.ts` (existing test extended with rationale
  assertions; new test added for the zero-source honest-rationale case).
- `src/services/rag/tenantRagWorkflow.ts` — same rationale logic added to `answerTenantQuestion`'s
  inline `RagAnswer` construction. Tested in `tenantRagWorkflow.test.ts` (existing test extended).
- `src/features/ai-workspace/AIWorkspaceSection.tsx` — rationale rendered under the answer bubble;
  `fallbackRagAnswer` and `emptyRagAnswer` updated to satisfy the now-required field.
- Verification: `pnpm run typecheck` clean, `pnpm run lint` clean (zero warnings),
  `governedRag.test.ts` + `tenantRagWorkflow.test.ts` run in isolation: 2 files / 6 tests passing;
  full-suite re-run confirmed 87 files / 241 tests passing (committed as `31f8306`).

---

## 2026-07-20 — Sprint 2 A6: bulk/quick-approve in AI Review Inbox

### What happened

Second item of Sprint 2. `AIReviewInboxPage.tsx` now shows an "Approve all N low-risk items" bar
whenever there are pending reviews with `humanReviewFlag: false` (no mandatory human review
required). Each item in the bulk action is still submitted as its own API call to
`/api/ai/reviews`, so per-item audit logging is unchanged — the feature removes repeated clicking,
not the audit trail (matching the acceptance criterion in `SPRINT_ROADMAP_PRE_DEMO.md`: "audit
event still recorded per item").

While implementing this, found and fixed two more demo-data leaks in the same files (Round 3 of
`DEMO_DATA_LEAKAGE_AUDIT.md`):

- `reviewInbox.ts`'s `listAiReviewInbox` showed 2 fabricated pending reviews whenever the real
  Supabase query returned zero rows (not just when Supabase admin access was unconfigured) — a
  real tenant with a genuinely empty inbox saw fake reviews.
- `AIReviewInboxPage.tsx` treated `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true` as equivalent to demo mode.
  That flag is explicitly required in **real deployed beta environments** per `docs/BETA_TESTING.md`
  (it's an auth-facade flag, unrelated to demo content) — meaning every real beta customer with a
  clean inbox was shown a fake "Dibrugarh referral SLA variance" review. Both now correctly gated
  on `isDemoModeEnabled()`.

### Evidence

`Enterprise_Beta_Feedback_Batch_1.md` section 7.3: "too many steps or approvals" flagged by 35% of
respondents (the P0 workflow-friction finding this item addresses).

### What this does and doesn't close

**Closed:** low-risk reviews no longer require one click each; the specific demo-leak instances
found while building this are fixed.

**Not yet closed:** "low-risk" is currently defined purely as `!humanReviewFlag`. There's no
confidence-threshold or risk-scoring refinement beyond what the review-generation logic already
sets on that flag — if that upstream logic under- or over-flags reviews as requiring human review,
this feature inherits that inaccuracy. Not a new gap, just worth naming.

### Audit trail

- `src/features/ai-workspace/AIReviewInboxPage.tsx` — `bulkApproveLowRisk()`, `lowRiskPendingReviews`
  derived state, bulk-approve action bar; `isDemoReviewFallbackEnabled` replaced with direct
  `isDemoModeEnabled()` checks.
- `src/services/ai/reviewInbox.ts` — `listAiReviewInbox` no longer falls back to fake data on an
  empty (not failed) real result. Tested in `reviewInbox.test.ts` (new test: empty inbox when
  Supabase unconfigured and demo mode off).
- Verification: `pnpm run typecheck` clean, `pnpm run lint` clean (zero warnings),
  `reviewInbox.test.ts` run in isolation: 1 file / 3 tests passing (2 pre-existing + 1 new); full
  suite confirmed 87 files / 241 tests passing.

---

## 2026-07-20 — Sprint 2 A9: in-context 1-click micro-survey

### What happened

Third item of Sprint 2. Added `src/hooks/useMicroSurveyPrompt.ts` (localStorage-backed, mirrors
the `useGoldenPathDisplayMode.ts` pattern — shows at most once per user, ever, tracked via
`axxess.micro-survey.shown`) and `src/components/feedback/MicroSurveyPrompt.tsx` (a dismissible,
one-click 1-5 rating prompt).

Wired into `AIReviewInboxPage.tsx`: the survey triggers the first time a user successfully records
any AI review decision (approve/reject/edit/escalate, including via the new A6 bulk-approve path).
Fires `micro_survey_shown` on mount and `micro_survey_responded` (with the 1-5 score and trigger
source) when answered -- both new `AnalyticsEventName` entries, closing the report's own flagged
gap that survey sentiment was never linked to actual product usage events.

### Evidence

`Enterprise_Beta_Feedback_Batch_1.md` section 18 (limitations register): "No telemetry
linkage -- Cannot correlate ratings with use" is listed as an explicit, named gap with the
recommended mitigation "Assign anonymized respondent IDs and connect to product events." This is
the first concrete step toward that.

### What this does and doesn't close

**Closed:** one of the two trigger points named in the actionable (`PRE_DEMO_ACTIONABLES.md` item
9) -- the first completed AI review decision -- now surfaces the survey and records a
usage-linked sentiment score.

**Not yet closed:** the second named trigger point, "first completed golden-path step," is not
wired. The hook and component are reusable for it (same `trigger()` call, a different
`trigger="golden_path_step"` prop value already exists in the type), but finding the right moment
in `enterpriseGoldenPath.ts`'s step-completion flow to fire it was left for a follow-up rather than
guessed at under time pressure. Tracked here explicitly, not silently dropped.

### Audit trail

- `src/hooks/useMicroSurveyPrompt.ts` — new hook, tested in `useMicroSurveyPrompt.test.tsx` (3
  tests: shows once, never shows again once already shown, can be dismissed).
- `src/components/feedback/MicroSurveyPrompt.tsx` — new component, exported from
  `src/components/feedback/index.ts`. No dedicated component test, consistent with this repo's
  existing convention for small feedback components (none in that folder have one).
- `src/services/analytics/types.ts` — added `micro_survey_shown` and `micro_survey_responded` to
  `AnalyticsEventName`. (A third placeholder, `first_value_milestone_reached`, was also added
  here as "reserved for A11" but turned out unneeded -- A11 below reused better-fitting existing
  event names instead, so it was removed rather than left as unused scaffolding.)
- `src/features/ai-workspace/AIReviewInboxPage.tsx` — wired `microSurvey.trigger()` into the
  `decide()` success path; renders `MicroSurveyPrompt` when visible.
- Verification: `pnpm run typecheck` clean, `pnpm run lint` clean (zero warnings),
  `useMicroSurveyPrompt.test.tsx` run in isolation: 1 file / 3 tests passing; full suite confirmed
  88 files / 244 tests passing (up from 87/241 -- 1 new test file, 3 new tests).

---

## 2026-07-20 — Sprint 2 A11: time-to-first-value / onboarding funnel events

### What happened

Fourth item of Sprint 2. Audited the report's section 13.2 activation-funnel spec (account
created → workspace configured → document/data connected → first AI task completed → human
review completed → task/workflow action created → second workflow completed) against what's
actually fired via `trackEvent(...)` in the codebase, not just defined in `AnalyticsEventName`.

Already wired: `sign_up_completed` (`EnterpriseAuthFlowPage.tsx`), `organization_created` and
`onboarding_step_completed` (`EnterpriseOnboardingPage.tsx`, `BetaOnboardingChecklist.tsx`).

Found defined-but-never-fired and wired the three matching the remaining funnel steps:
- `rag_query_submitted` — fired in `AIWorkspaceSection.tsx`'s `askGovernedQuestion` on a
  successful governed answer (first AI task completed).
- `ai_answer_reviewed` — fired in `AIReviewInboxPage.tsx`'s `decide()` on any recorded decision
  (human review completed).
- `workflow_action_completed` — fired in `TasksSection.tsx`'s `toggleTaskStatus` when a task is
  marked complete, alongside the pre-existing `task_status_changed` (task/workflow action
  created).

### Evidence

`Enterprise_Beta_Feedback_Batch_1.md` section 13.2's activation funnel and section 13.3's
recommended activation definition ("connects or uploads real context, completes an AI-assisted
task, sends it through human review, and converts the result into a project, task, approval, or
stakeholder action") — this entry wires the events needed to actually measure that definition,
which previously had no client-side instrumentation for 3 of its 4 non-onboarding steps.

### What this does and doesn't close

**Closed:** every named funnel step from account creation through workflow-action-completed now
has at least one `trackEvent` call firing at the right moment.

**Not yet closed:** "second workflow completed within 7 days" (the funnel's retention step) isn't
instrumented — that requires a time-windowed aggregation, which belongs in the analytics backend
querying these events, not new client-side code. "Time to first value" and "onboarding completion
rate" are not computed or displayed anywhere in-product; they're derivable from these events'
timestamps in whatever analytics backend (Mixpanel/PostHog) ingests them, which is consistent with
how the actionable was scoped ("wire... events into the existing analytics", not "build a funnel
dashboard").

### Audit trail

- `src/features/ai-workspace/AIWorkspaceSection.tsx` — `rag_query_submitted` on query success.
- `src/features/ai-workspace/AIReviewInboxPage.tsx` — `ai_answer_reviewed` on decision success.
- `src/features/tasks/TasksSection.tsx` — `workflow_action_completed` on task completion.
- `src/services/analytics/types.ts` — removed the unused `first_value_milestone_reached`
  placeholder added in the A9 commit (see correction note above).
- No dedicated new tests: none of these three page/feature files have existing unit-test coverage
  to extend (consistent with the pattern noted throughout Sprint 1/2 for heavy page components).
  Verified via `typecheck`, `lint`, `analytics.test.ts` re-run in isolation (6/6 passing,
  confirming the type change didn't break anything), and full-suite regression check.
- Verification: `pnpm run typecheck` clean, `pnpm run lint` clean (zero warnings),
  `analytics.test.ts` 1 file / 6 tests passing in isolation; full suite confirmed 88 files / 244
  tests passing (unchanged from the A9 commit, as expected -- no new tests added in this entry).

---

## 2026-07-21 — Sprint 2 complete: A3 + A7 + A18 (guided onboarding trio)

### What happened

Final three items of Sprint 2, shipped together per `SPRINT_ROADMAP_PRE_DEMO.md` (they're
interdependent). All three build on the existing onboarding flow rather than replacing it.

- **A18 (reduce setup decisions).** Found that `provisionTenantForUser` (the onboarding backend)
  already treated `departmentName`/`workspaceName` as optional -- it silently skips creating
  them when blank, no error. The only thing forcing a user to fill them in was the frontend's
  `isOnboardingComplete()` check requiring both. Removed that artificial requirement in
  `src/onboarding/enterpriseOnboarding.ts`; the `workspace` step's UI copy now says "optional."
- **A7 (3 outcome-first paths).** Added an optional "What do you want to try first?" section to
  the existing onboarding `start` screen (not a new wizard step, to avoid adding friction) with 3
  paths: *Knowledge & AI decision support*, *Workflow & task execution*, *Meetings &
  institutional coordination*. The third path deliberately replaces the originally-planned
  "stakeholder/CRM" option -- Stakeholders/CRM has no live repository at all (confirmed in
  `DEMO_DATA_LEAKAGE_AUDIT.md`), so routing a new user into a module that can't persist their
  choice would recreate the exact problem the rest of this session's work just fixed.
- **A3 (seeded sample workspace).** New `/api/onboarding/seed-sample-data` route. For the chosen
  path, it creates **real, persisted** records via the live `projectsRepository`,
  `tasksRepository`, `meetingsRepository`, and the same `ingestTenantDocument` path used by real
  document uploads -- not fabricated demo content. Every seeded record is tagged `sample-data`
  and titled with a `Sample:` prefix, so it's identifiable and the customer can delete it, but to
  every other part of the app it's indistinguishable from data the customer created themselves:
  genuinely live, linkable, and feedable. On successful provisioning, if a path was chosen, the
  route seeds data for it and the user lands on that path's most relevant page (`/ai-workspace`,
  `/tasks`, or `/meetings`) instead of an empty `/dashboard`.

### Evidence

`Enterprise_Beta_Feedback_Batch_1.md` section 11 (Days 0-30 product plan): "Replace
capability-first onboarding with role- and outcome-first onboarding... Offer three initial paths...
Reduce the number of required setup decisions before first value... Add clear sample data and a
guided demo workspace." This entry implements that recommendation close to verbatim.

### What this does and doesn't close

**Closed:** the three specific gaps named in the actionables -- forced department/workspace
fields, a single generic onboarding path, and no sample data to explore before uploading real
documents.

**Not yet closed, honestly:**
- **No end-to-end browser verification.** Everything here was verified via `typecheck`, `lint`,
  and unit tests of the pure logic module (`enterpriseOnboarding.test.ts`). The actual sequence --
  pick a path, finish onboarding, seed data, land on the right page with real seeded records
  visible -- has not been walked through in a running app. This is a real gap, flagged explicitly
  in `SPRINT_CHECKLIST_PRE_DEMO.md`'s Sprint 2 exit criteria, not silently assumed to work.
- The seeding route has no dedicated test, consistent with this repo's existing convention that
  Next.js API routes in this area (e.g. `/api/documents/ingest`) don't have unit tests of their
  own.
- Sample data seeded once cannot currently be re-seeded or reset from the UI if a customer deletes
  it and wants it back; there's no "reseed" affordance, only the one-time onboarding trigger.

### Audit trail

- `src/onboarding/enterpriseOnboarding.ts` — `OnboardingGoal` type, `onboardingGoals` list,
  `primaryGoal` state field, `isOnboardingComplete()` no longer requires department/workspace.
  Tested in `enterpriseOnboarding.test.ts` (2 new tests: completion without department/workspace,
  completion still requires the core fields).
- `src/features/onboarding/EnterpriseOnboardingPage.tsx` — goal-selection UI on the `start` step,
  optional-field copy on the `workspace` step, seeding call + goal-based redirect on `complete`.
- `src/app/api/onboarding/seed-sample-data/route.ts` — new route, real repository writes per goal.
- Verification: `pnpm run typecheck` clean, `pnpm run lint` clean (zero warnings; one
  `react/no-unescaped-entities` error caught and fixed during this pass), `enterpriseOnboarding.test.ts`
  run in isolation: 1 file / 4 tests passing (up from 2); full suite confirmed 88 files / 246
  tests passing (up from 88/244); `pnpm run build` also run to verify the new API route and typed
  Next.js `Route` casts compile correctly (not previously covered by typecheck/lint/vitest alone).
