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
  re-run pending at time of writing (see this session's final commit for confirmed result).
- Verification: `pnpm run typecheck` clean, `pnpm run lint` clean (zero warnings), full suite
  re-run pending at time of writing (see this session's final commit for confirmed result).
