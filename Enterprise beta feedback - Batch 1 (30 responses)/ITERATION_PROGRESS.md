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

---

## 2026-07-21 — Git reconciliation: recovered Sprint 1 tail + all of Sprint 2 from an orphaned branch

### What happened

PR #137 was merged mid-flight, before every planned commit had been pushed to its source branch
(`feature/golden-path-optional-plus-pre-demo-docs`). The merge captured exactly one commit —
`5ebf157` ("feat: make Golden Path optional; add pre-demo actionables + 3-sprint roadmap") — which
implements only **A1 and A2**. Every commit pushed to that branch afterward had nowhere to land:

```
5ebf157  MERGED into main as PR #137 (A1, A2 only)
   ↓ pushed after the merge already happened — never merged in:
8a3c41d  feat: complete Sprint 1 (A8, A5, A19, A20, A12)
7de9005  docs: Golden Path rationale + fix critical demo-data leakage into beta
bc5053f  fix: close remaining demo-data leakage found in full-codebase sweep
ce2eaae  feat: Sprint 2 A4 — AI citations + rationale under every answer
2c1a75a  feat: Sprint 2 A6 — bulk/quick-approve in AI Review Inbox
721edc6  feat: Sprint 2 A9 — in-context 1-click micro-survey
4519038  feat: Sprint 2 A11 — wire time-to-first-value/onboarding funnel events
9e7e7fc  feat: Sprint 2 complete — A3 + A7 + A18 (guided onboarding trio)
```

(Hashes shown are post-rebase; the originals — `711b0e5` etc. — are recorded in each item's own
entry above.) The branch itself was never deleted, so nothing was lost, but for approximately one
day `main` genuinely only contained 2 of the 20 actionables while every status document (this log,
`PRE_DEMO_ACTIONABLES.md`, `SPRINT_CHECKLIST_PRE_DEMO.md`) — correctly, on the branch they were
written on — described Sprint 1 and Sprint 2 as fully shipped. Those documents were accurate about
what had been *built and verified*; they were not accurate about what had reached `main`.

### How it was caught

Discovered while responding to a request to plan Sprint 3: pulling the current `PRE_DEMO_ACTIONABLES.md`
from a fresh `origin/main` checkout showed items 3-20 still marked 🔜, contradicting what had been
reported as shipped. `git merge-base --is-ancestor 711b0e5 origin/main` confirmed the Sprint 2 tip
was not an ancestor of `main`; `git show --stat 5ebf157` confirmed the merged commit's actual diff
was limited to A1/A2. This was surfaced before any Sprint 3 planning or further status-document
edits, rather than compounding the discrepancy.

### What was done about it

1. `git merge-tree` dry-run confirmed the orphaned branch would apply onto current `main` with zero
   conflicts (current `main` had since gained an unrelated dependency-hygiene fix, PR #138 — see
   below — but touched none of the same files as the stranded Sprint 1/2 commits).
2. Rebased the orphaned branch (`feature/golden-path-optional-plus-pre-demo-docs` @ `711b0e5`) onto
   post-PR-#138 `main` as a new branch, `reconcile/sprint1-tail-and-sprint2` — all 8 commits applied
   cleanly, no manual conflict resolution needed.
3. Re-ran the full verification suite from scratch against the rebased result (not reused from the
   original, since the base had changed): `pnpm run typecheck`, `pnpm run lint --max-warnings=0`,
   `pnpm run test -- --run`, `pnpm run build`.
4. This entry and the corresponding `PRE_DEMO_ACTIONABLES.md`/`SPRINT_CHECKLIST_PRE_DEMO.md` status
   updates ship as part of the same reconciliation branch, not as a separate follow-up, so the
   status documents and the code they describe land on `main` atomically.

### Unrelated fix discovered and merged in the same window (PR #138)

While verifying this branch, a second, unrelated problem surfaced: several `dependabot` PRs
(`typescript` 5.9.3→7.0.2, `eslint` 9.39.4→10.7.0/`@eslint/eslintrc` 3.3.5→3.3.6,
`react-resizable-panels` 2.1.7→4.12.2) had each been merged individually and were never verified
together. In combination they broke `typecheck`, `lint`, and `build` on `main`:
`@typescript-eslint/typescript-estree@8.62.1` (pulled in transitively via `eslint-config-next`)
declares `peerDependencies: { typescript: ">=4.8.4 <6.1.0" }`, so TS7 crashed ESLint outright rather
than producing a lint finding; separately, `eslint-plugin-react@7.37.5` (also transitive) crashes
under ESLint 10's context API. Fixed in PR #138 (merged `2026-07-21T05:30:35Z`) by reverting both to
their last known-good versions and adding `ignore` rules to `.github/dependabot.yml` for
`typescript >=6.1.0` and `eslint >=10.0.0` so the same combination isn't silently re-proposed. Also
in that PR: a real, pre-existing (not introduced by this session) typed-route error in
`src/app/page.tsx`, and removal of `src/app/components/ui/resizable.tsx` (confirmed zero importers;
broken outright by the `react-resizable-panels` v4 rewrite). This is a process finding independent
of the actionables work, but it's the reason the reconciliation in this entry needed a rebase rather
than a direct merge.

### What this does and doesn't close

**Closed:** all 8 stranded commits are now verified against current `main` and ready to merge
through a normal PR, restoring Sprint 1 to 7/7 and Sprint 2 to 7/7 on `main` once merged. The root
cause (a PR merged while its source branch still had planned commits arriving) is named and its
mechanics documented so it's recognizable if it recurs.

**Not yet closed:**
- **Process gap, not fixed by this entry:** nothing in this repo currently prevents a PR from being
  merged mid-flight. That's a process/communication matter between however many people or agents are
  pushing to a shared branch, not something a doc or a git hook alone resolves — flagging it rather
  than proposing a specific control here, since that's a workflow decision, not a code fix.
- All the honest gaps already named in each item's own entry above (no e2e browser verification of
  A3/A7/A18, no dedicated tests for A8/A5/A19/A12, A9's golden-path-step trigger unwired, etc.)
  are unchanged by this reconciliation — rebasing and re-verifying doesn't add coverage that wasn't
  there before.

### Audit trail

- Branch: `reconcile/sprint1-tail-and-sprint2`, rebased from `feature/golden-path-optional-plus-pre-demo-docs`
  (`711b0e5`) onto `origin/main` post-PR-#138.
- Verification re-run from scratch on the rebased branch: `pnpm run typecheck` clean, `pnpm run lint
  --max-warnings=0` clean, `pnpm run test -- --run` — see this entry's companion PR for the exact
  file/test counts, `pnpm run build` succeeds.
- `PRE_DEMO_ACTIONABLES.md` and `SPRINT_CHECKLIST_PRE_DEMO.md` updated in the same branch to remove
  "pending PR merge" language once this reconciliation PR itself merges.

---

## 2026-07-21 — Sprint 3 Phase 1: A15, stop presenting the full integrations catalogue as available

### What happened

Sprint 3 was planned (PR #148) as 4 phases, with A15 reordered ahead of A13/A14. Scoping it found
`src/services/integrations/pluginRegistry.ts` listed roughly 20 integrations (Gmail, Slack, Jira,
Salesforce, Razorpay, etc.), every one flagged `demoConnector: true` — only Gmail and Outlook had
real, working connector code anywhere in this repo (`connectorContract.ts`). Replaced
`demoConnector` with `pilotEnabled` (true only for connectors with a real connect flow) and added
`getPilotIntegrations()`/`getInfrastructureOnlyIntegrations()` to split the two groups explicitly.

Traced every consumer of the removed field and found the same "demo dressed up as real" pattern in
two more places: `IntegrationsSection.tsx` rendered all ~20 as one undifferentiated grid plus a
"Demo Ready" stat that always equaled the full catalogue count; split into a "Pilot integrations"
section and an honest "Also available at the infrastructure level" list. `pluginRuntime.ts`'s
`defaultStatus()` reported every unconfigured plugin as `"available"` whenever `demoConnector` was
true — i.e., always — which feeds real admin/platform-readiness logic
(`platform-readiness/route.ts`, `pilotCommandCenter.ts`, `commandCenterScheduler.ts`), not just
decorative UI. Now gated on `pilotEnabled`.

### Evidence

`Enterprise_Beta_Feedback_Batch_1.md`'s own guidance: "2-3 integrations tied to pilot workflows, not
a generic catalogue" — this closes that gap at its actual scope (~20 items), not the 12 originally
assumed (the 2026-07-20 Supabase-wrappers entry above).

### What this does and doesn't close

**Closed:** the integrations surface (registry, `/integrations` UI, and platform-readiness logic)
no longer implies more real capability exists than actually does.

**Not yet closed:** A13/A14 (below) hadn't shipped yet at this point, so `pilotEnabled` was only
true for gmail/outlook until the next entry.

### Audit trail

- `src/services/integrations/pluginRegistry.ts`, `src/features/integrations/IntegrationsSection.tsx`,
  `src/services/plugins/pluginRuntime.ts`.
- Tests: `pluginRegistry.test.ts` (2 new), `pluginRuntime.test.ts` (1 new regression test).
- Verification: `pnpm run typecheck` clean, `pnpm run lint --max-warnings=0` clean, `pnpm run test --
  run`: 88 files / 249 tests passing (up from 88/246), `pnpm run build` succeeds.
- Branch `feat/sprint3-a15-integrations-catalogue`, merged via PR #150 (`2026-07-21T08:20:22Z`).

---

## 2026-07-21 — Sprint 3 Phase 2: A13 + A14, Slack and Calendly quick-connect

### What happened

Extended the existing Gmail/Microsoft OAuth architecture (`connectorContract.ts`, `oauthProvider.ts`,
the shared `/api/connectors/oauth/start`+`callback` routes, `tokenVault.ts`) to Slack and Calendly,
rather than building a parallel system. `ConnectorProviderId` extended to 4 providers;
`ConnectorContract.category`'s hardcoded `"email"` literal broadened to
`"email" | "messaging" | "calendar"`; per-provider env-var maps replaced inline gmail/microsoft
ternaries in `buildConnectorOAuthUrl()`, `providerClient()`, and `getOAuthProviderConfiguration()`
(the last of which had error messages that would have mislabeled Slack/Calendly's missing
credentials as Microsoft's). New Settings > Integrations tab
(`IntegrationsQuickConnectPanel` in `SettingsSection.tsx`), gated to Organization Admins, matching
the actionables' literal wording ("quick-connect in Settings").

**Real bug found while testing:** Slack's OAuth API returns scopes comma-separated
(`"chat:write,channels:read"`), but `exchangeOAuthCode()` only split on whitespace
(Google/Microsoft's format). A successful Slack connection would have stored one comma-joined
string as its only granted scope, so `pluginRuntime.ts`'s `missingScopes` check
(`grantedScopes.includes(individualScope)`) would never match — Slack connections would report as
permanently missing scopes even when fully authorized. Fixed the split regex to handle both
separators.

**Cost constraint, applied explicitly before building further:** told to skip any API requiring
payment/subscription/metering, zero-cost for 6-12 months. Slack's standard OAuth/Web API scopes
are free on any workspace tier. Calendly's Developer API requires a Standard-plan-or-higher
account for whoever connects it — not available on Calendly's free tier. Asked explicitly how to
handle this; decision was to keep Calendly (the cost falls on the customer's own subscription
choice, not AXXESS) but surface the caveat directly in the Settings UI, not just in docs — an amber
notice on the Calendly connect card.

### Evidence

`Enterprise_Beta_Feedback_Batch_1.md` section 7.6: Slack and Calendly are the two integrations most
directly evidenced by respondent free-text requests.

### What this does and doesn't close

**Closed:** both connectors have real, working OAuth code following the exact same pattern and
rigor as Gmail/Microsoft, plus a genuine cross-provider bug (the Slack scope-parsing issue) that
would otherwise have shipped silently broken.

**Not yet closed:**
- **No live OAuth verification.** Requires real Slack App / Calendly OAuth app credentials that
  only whoever holds those accounts can create — none available in this environment. Verified via
  unit tests against mocked token exchanges, the same rigor Gmail/Microsoft already had.
- The OAuth callback still redirects to `/integrations` regardless of where the flow started
  (pre-existing behavior, not introduced here) — connecting from Settings lands back on
  `/integrations`, not `/settings`.
- No dedicated test for the new Settings panel itself, consistent with this repo's convention that
  heavy page components rely on Playwright e2e specs, not unit tests.

### Audit trail

- `src/services/integrations/connectorContract.ts`, `oauthProvider.ts`,
  `src/app/api/connectors/oauth/callback/route.ts`, `src/features/settings/SettingsSection.tsx`,
  `.env.example` (new `SLACK_CLIENT_SECRET`/`CALENDLY_CLIENT_ID`/`CALENDLY_CLIENT_SECRET` placeholders).
- Tests: `connectorContract.test.ts` (2 new), `oauthProvider.test.ts` (2 new, including the Slack
  scope-parsing regression test).
- Verification: `pnpm run typecheck` clean, `pnpm run lint --max-warnings=0` clean, `pnpm run test --
  run`: 88 files / 253 tests passing (up from 88/249), `pnpm run build` succeeds.
- Branch `feat/sprint3-a13-a14-slack-calendly`, merged via PR #151 (`2026-07-21T09:01:02Z`).

---

## 2026-07-21 — Sprint 3 Phase 3: A10 + A16 + A17, satisfaction capture, What's New, celebration

### What happened

Final phase of Sprint 3, all 3 items independent of A13/A14's external OAuth-credential dependency.

**A10 (post-demo satisfaction):** `usePostDemoSatisfactionPrompt.ts` (sessionStorage-scoped, not
localStorage — a later demo session can prompt again, unlike A9's once-ever micro-survey) +
`PostDemoSatisfactionPrompt.tsx` (thumbs-up/down, distinct from A9's 5-point scale). Trigger:
turning Investor Preview off in Settings. **Real bug found while wiring this up:** `DemoModePanel`
hard-navigates to `/dashboard` 250ms after toggling demo mode off, destroying any transient "show
now" React state before it renders. Fixed with a two-step handoff:
`markPostDemoSatisfactionPromptPending()` writes a flag before the navigation; the hook consumes it
on its next mount (wherever `/dashboard` resolves to) and triggers itself there.

**A16 ("What's New" panel):** `useWhatsNewPanel.ts` (localStorage, keyed on
`services/analytics/config.ts`'s `releaseVersion` — shows once per release, not once ever) +
`WhatsNewPanel.tsx`. Content cites 3 real shipped items (Golden Path optionality, AI answer
rationale, bulk-approve), per the actionable's own acceptance criteria ("reflects real Sprint 1-3
work, not placeholder copy"). Rendered from `App.tsx`, gated behind the same `screenshotMode` check
`GuidedDemoBanner` already uses.

**A17 (completion celebration):** `useWorkflowCompletionCelebration.ts` (no persistence — fires
every completion, unlike A9/A10/A16's once-per-scope prompts) + `WorkflowCompletionCelebration.tsx`
(auto-dismissing toast, top-right so it doesn't collide with A9's bottom-center micro-survey or
A12's inline banner). Wired into the two completion points the roadmap names explicitly ("using the
same completion trigger as A12/A9"): `TasksSection.tsx`'s task-completion path, and
`AIReviewInboxPage.tsx`'s `decide()` success path (scoped to `decision === "approved"` specifically
— rejecting/escalating isn't a "completion").

### Evidence

`PRE_DEMO_ACTIONABLES.md` items 10, 16, 17 — Feedback and Retention dimensions.

### What this does and doesn't close

**Closed:** all 3 items built and unit-tested to the same rigor as the rest of this iteration, with
one genuine sequencing bug found and fixed (A10's navigation-timing issue).

**Not yet closed:**
- **This PR (#152) is not yet merged as of this entry.** Per the lesson from the 2026-07-21
  git-reconciliation incident, this is stated plainly rather than assumed complete because it was
  built and verified — see `PRODUCT_ITERATION_I_CLOSEOUT.md` section 5 for why that distinction
  matters.
- A10's trigger point (demo-mode-off) is the one concrete, testable interpretation of "session/route
  exit" available in this codebase today; a customer closing the tab entirely still isn't captured.
- `WhatsNewPanel`'s 3 entries are a manually-curated snapshot as of this commit — nothing pulls them
  from `ITERATION_PROGRESS.md` automatically, so they will go stale without hand-updates each release.
- No dedicated tests for the host components (`SettingsSection.tsx`, `App.tsx`, `TasksSection.tsx`,
  `AIReviewInboxPage.tsx`) beyond what already existed. All 3 new hooks have full unit coverage.

### Audit trail

- New: `usePostDemoSatisfactionPrompt.ts`/`.test.tsx`, `useWhatsNewPanel.ts`/`.test.tsx`,
  `useWorkflowCompletionCelebration.ts`/`.test.tsx`, `PostDemoSatisfactionPrompt.tsx`,
  `WhatsNewPanel.tsx`, `WorkflowCompletionCelebration.tsx`.
- Modified: `src/app/App.tsx`, `src/features/settings/SettingsSection.tsx`,
  `src/features/tasks/TasksSection.tsx`, `src/features/ai-workspace/AIReviewInboxPage.tsx`,
  `src/services/analytics/types.ts` (5 new `AnalyticsEventName` entries).
- Verification: `pnpm run typecheck` clean, `pnpm run lint --max-warnings=0` clean, `pnpm run test --
  run`: 91 files / 261 tests passing (up from 88/253), `pnpm run build` succeeds.
- Branch `feat/sprint3-a10-a16-a17-retention`, PR #152 (open, not yet merged as of this entry).

---

## 2026-07-21 — Sprint 3 Phase 0 byproduct: local Supabase seed + audit-trigger fixes

### What happened

While attempting a genuinely live (non-demo-mode) walkthrough of the onboarding flow for Sprint 3's
Phase 0 integration & harmonization check, `supabase start` failed in two successive layers before
the local stack could come up at all.

1. All 3 local dev seed files (`supabase/seeds/001-003`) insert into
   `organizations`/`programs`/`projects`/`tasks`/`meetings`/`notifications`/`audit_logs` without
   setting `tenant_id`. A later migration made that column NOT NULL, backfilling only pre-existing
   rows at migration-apply time — seed-inserted rows never got a value. Fixed every affected insert.

2. **More significant, not local-dev-specific:** `public.record_enterprise_audit_log()` — the
   trigger firing on every insert/update to `projects`/`tasks`/`meetings`/`organizations` — has a
   `CASE` expression that unconditionally references `old.role is distinct from new.role`, a branch
   meant only for its separate `users`-table trigger. Postgres must resolve every column reference
   across a `CASE`'s branches before executing any of them, so this failed every write to those 4
   tables outright with `record "old" has no field "role"`, regardless of which branch's condition
   was actually true. Its sibling `record_permission_audit_log()` had a related bug: it never set
   `tenant_id` on its own `audit_logs` insert, which would fail the same constraint once reached.
   Fixed via a new migration (doesn't edit the original, to preserve applied-migration history) that
   recreates both functions.

### What this does and doesn't close

**Closed:** `supabase start` now gets past every migration and every seed file with no SQL errors.
The local stack's non-database containers (analytics/realtime/storage/pg-meta/studio) then failed
their own health checks in this sandboxed environment (Docker reported 3.7GiB total memory,
resolved with `--exclude`/`--ignore-health-check` flags for a one-off run) — an environment-specific
limit, not a code issue.

**Not yet closed:**
- **The actual live browser walkthrough of A3/A7/A18 was never carried out**, even after the local
  stack came up — Sprint 3 code work took priority once it became available. This remains open.
- **Whether the audit-trigger bug was ever live on the actual production/beta Supabase project is
  unconfirmed** — no production credentials available in this environment to check. This migration
  may only ever have existed in this repo's `supabase/migrations/` folder without being applied
  remotely (there's a documented precedent for the inverse gap — the Supabase wrapper enablement
  that happened on the live project without a corresponding migration).

### Audit trail

- `supabase/seeds/001_local_enterprise_seed.sql`, `002_sprint6_enterprise_seed.sql`,
  `003_sprint7_e2e_seed.sql`; new migration `20260721130000_fix_enterprise_audit_log_trigger.sql`.
- SQL-only change; no typecheck/lint/test/build impact. Verified via the actual failure mode
  (`supabase start` reaching every migration/seed with no errors).

---

## 2026-07-21 — First genuine live browser walkthrough of A3/A7/A18, four real bugs found and fixed

### What happened

Following up on "how much more can we clear/rectify right now" after the Sprint 1–3 iteration
report, this closes the single highest-priority carried gap from `PRODUCT_ITERATION_I_CLOSEOUT.md`'s
honest-gap register (#1): **the live browser walkthrough of A3 (guided workspace with real seeded
sample data), A7 (goal-based onboarding redirect), and A18 (optional department/workspace fields)
that had never actually been carried out**, even after the local Supabase stack came up in the prior
entry. Ran a genuine signup → onboarding → provisioning → goal-based-redirect → sample-data-seed →
governed-RAG-query flow against a real local Supabase instance (`.env.local` pointed at
`http://127.0.0.1:54321`, `NEXT_PUBLIC_AXXESS_DEMO_MODE=false`) — not demo mode, not a mock session.

Four distinct, real bugs surfaced, each blocking the flow outright until fixed:

1. **New signups were routed straight into a broken workspace.** `src/auth/supabaseUser.ts`'s
   `userContextFromAuthUser()` defaulted a brand-new (not-yet-onboarded) user's `organizationId` to
   `cleanTenantUserContext.organizationId` ("org_clean_tenant", a non-UUID placeholder), and
   `src/app/auth/page.tsx` routed every successful login straight to `/dashboard` with no check for
   whether onboarding had actually completed. Every live repository query then failed outright with
   Postgres `22P02: invalid input syntax for type uuid`. Fixed: added a `needsOnboarding?: boolean`
   flag to `UserContext` (`src/security/rbac.ts`), an honest empty-string fallback instead of the
   fake placeholder, login routing that checks the flag (`/onboarding` vs `/dashboard`), and a
   defensive redirect in `src/app/App.tsx` as a safety net for any other entry path (bookmarks,
   direct links).
2. **A bare local Supabase CLI instance was missing baseline grants Supabase Cloud provisions
   automatically.** Provisioning a new organization failed with `403 permission denied for table
   organizations` (missing `service_role` grants on foundational tables), then — after fixing that —
   `403 permission denied for table user_roles` when seeding sample data (missing `authenticated`
   grants on the same class of foundational tables). Later migrations (sprint18 onward) already
   grant per-table access to both roles for the tables they introduce; this never happened for
   tables that predate that convention, because on Supabase Cloud it happens automatically at
   project creation and so was never captured as a migration. Fixed via two new migrations doing a
   dynamic `GRANT` loop over every `public` schema table plus `ALTER DEFAULT PRIVILEGES` for future
   tables: `20260721140000_grant_service_role_public_schema.sql` and
   `20260721150000_grant_authenticated_public_schema.sql`. Safe/idempotent on Supabase Cloud
   projects where these grants already exist.
3. **Genuinely production-relevant, not local-only: `tenant_id` was never set on insert for 11
   tables that require it.** `202607090001_sprint12_security_compliance_foundation.sql` made
   `organizations.tenant_id` NOT NULL; `202607090002_sprint13_onboarding_rls_persona_readiness.sql`
   did the same for `programs`, `projects`, `tasks`, `meetings`, `stakeholders`, `documents`,
   `notifications`, `audit_logs`, `beta_feedback`, and `knowledge_articles` (tenant_id mirroring
   `organization_id` for these). Both migrations backfilled only the rows that existed *at
   migration-apply time* — neither added a default for rows inserted afterward, and no application
   call site (`src/auth/provisioning.ts`, `src/services/rag/tenantRagWorkflow.ts`, and every
   enterprise repository writing to these tables) ever sets `tenant_id` explicitly. This meant every
   brand-new organization signup, and every write to any of those 11 tables, has been failing this
   constraint since those migrations landed — plausibly true in production too, not confirmed either
   way (no production credentials available from this environment; same open question as gap #10 in
   `PRODUCT_ITERATION_I_CLOSEOUT.md`). Fixed at the schema level with two `BEFORE INSERT` triggers
   (rather than passing an application-generated id/tenant_id, which would be unsafe here
   specifically — `provisionTenantForUser`'s organizations insert upserts on `conflict(slug)`, and an
   application-supplied id would let that conflict path reassign an *existing* organization's primary
   key if two signups ever raced on the same org name): `default_organization_tenant_id()` defaulting
   `tenant_id := NEW.id` for `organizations` (it's the tenant root), and
   `default_tenant_id_from_organization()` defaulting `tenant_id := NEW.organization_id` for the
   other 10 (`20260721140500_organizations_tenant_id_default.sql`,
   `20260721160000_tenant_child_tables_tenant_id_default.sql`).
4. **Four more demo-data-leakage instances in `AIWorkspaceSection.tsx`**, found because this was the
   first time anyone actually looked at this page as a genuinely new, real tenant rather than in
   demo mode. Documented in full in `DEMO_DATA_LEAKAGE_AUDIT.md`'s new "Round 4" section: a
   module-level constant that could permanently freeze demo chat content in memory across an SPA
   session, a hardcoded "2,200 documents indexed" status line, a hardcoded "Context Window" panel,
   and a hardcoded "AI Audit Trail" panel — none gated behind `isDemoModeEnabled()`, all rendered
   unconditionally. A fifth instance (`src/features/knowledge/KnowledgeSection.tsx`) was found but
   confirmed unreachable dead code (never imported/routed anywhere) and left unfixed, flagged
   separately for cleanup/removal rather than gating code no customer can reach.

### What this does and doesn't close

**Closed:** A3, A7, and A18 are now confirmed working end-to-end against a real, live tenant, not
just unit tests and code review:
- **A7** — all 3 outcome-first onboarding paths correctly redirect by goal; verified the
  "Knowledge & AI decision support" path lands on `/ai-workspace`.
- **A18** — department/workspace fields are genuinely optional; completed onboarding without either.
- **A3** — `POST /api/onboarding/seed-sample-data` genuinely persists real records (verified all
  three goals: `knowledge_ai` → 2 real documents, `workflow_tasks` → 1 project + 2 tasks,
  `meetings_coordination` → 1 meeting, each a `201` with real repository writes, not a mock). Then
  asked the AI Workspace a real question ("What does the oxygen resilience note say?") and got back
  a governed answer citing the actual seeded "Sample: District Oxygen Resilience Note" document by
  name, with a real (non-fabricated) confidence score and relevance score, correctly flagged for
  human review — proving the full governed-RAG pipeline works against genuinely live tenant data,
  not demo fixtures.
- Also closes gap #1 in `PRODUCT_ITERATION_I_CLOSEOUT.md`'s honest-gap register (see that
  document's own update alongside this entry).

**Not yet closed:**
- **Whether bugs #2 and #3 above ever affected the real production/beta Supabase project is
  unconfirmed** — this environment has no production credentials to check. Bug #2 (missing
  service_role/authenticated grants) is Supabase-Cloud-vs-bare-CLI-specific and very likely does
  *not* affect production, since Cloud provisions these automatically. Bug #3 (missing `tenant_id`
  defaults) is schema/application-level, not CLI-vs-Cloud-specific, and so is the more plausible
  candidate for also affecting production — this should be checked against the real project before
  assuming it's local-only, the same open item as gap #10.
- **The fifth demo-data-leakage instance (`KnowledgeSection.tsx`) was found, not fixed** — flagged
  as a separate cleanup task rather than addressed here, since it's unreachable dead code, not an
  active customer-facing leak.
- **No new automated test coverage was added for any of the four fixes in this entry.** All were
  found and verified via a live, manual, in-browser walkthrough (the gap this entry closes was
  specifically the *absence* of that kind of verification) plus `typecheck`/`lint`/full-suite
  regression checks on the resulting code changes. The schema-level trigger fixes (#2, #3) have no
  corresponding test infrastructure in this repo to extend (no existing SQL/migration test suite).

### Audit trail

- Modified: `src/security/rbac.ts`, `src/auth/supabaseUser.ts`, `src/auth/AuthProvider.tsx`,
  `src/app/auth/page.tsx`, `src/app/App.tsx`, `src/auth/provisioning.ts` (comment only — insert body
  unchanged), `src/features/ai-workspace/AIWorkspaceSection.tsx`.
- New migrations: `20260721140000_grant_service_role_public_schema.sql`,
  `20260721140500_organizations_tenant_id_default.sql`,
  `20260721150000_grant_authenticated_public_schema.sql`,
  `20260721160000_tenant_child_tables_tenant_id_default.sql`.
- Verification: `pnpm run typecheck` clean, `pnpm run lint --max-warnings=0` clean, full existing
  suite re-run on the final branch state: **91 files / 265 tests passing** (re-run deliberately
  because an earlier in-flight run started before the last two `AIWorkspaceSection.tsx` edits
  landed, so its result predated the final diff and wasn't trustworthy to cite). Manually verified
  live in-browser: full signup → onboarding → provisioning → redirect → sample-data-seed →
  governed-RAG-query flow, and all four `AIWorkspaceSection.tsx` fixes, against a real local
  Supabase-backed tenant. `src/features/knowledge/KnowledgeSection.tsx` (the fifth demo-data
  instance, confirmed unreachable dead code) was deleted after this test run and re-verified with a
  separate clean `typecheck` pass — it has zero test coverage and zero other references, so its
  removal does not affect the 91/265 figure above.
- Branch `fix/live-tenant-onboarding-and-rag-walkthrough`, moved off `docs/close-product-iteration-1`
  (which already carried unrelated, separately-PR'd documentation commits) before committing, per the
  same corrective pattern used earlier for A15.
- Branch `fix/supabase-seed-and-audit-trigger`, merged via PR #149 (`2026-07-21T08:20:24Z`).
