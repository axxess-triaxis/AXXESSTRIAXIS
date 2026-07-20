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
