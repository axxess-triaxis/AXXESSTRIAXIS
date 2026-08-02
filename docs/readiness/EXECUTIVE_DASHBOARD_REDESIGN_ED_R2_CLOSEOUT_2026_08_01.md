# Executive Dashboard Redesign — Sprint ED-R2 Closeout

**Date**: 2026-08-01
**Scope**: Replace the three highest-value ED-R1 placeholders (mail inbox, CRM leads/deals, social monitoring alerts) with real or honestly provider-gated tenant data, all plugged into the existing ED-R1 Priority x Criticality scoring engine. **No changes were made to the scoring engine itself** beyond adding new policy functions, per the sprint's "do not rewrite ED-R1 engine unless fixing a bug" instruction.

## What ED-R2 set out to replace

Three ED-R1 not-connected placeholder tiles: `mail-inbox`, `crm-leads-deals`, `social-alert-feed`.

## Mail implementation status: REAL (no migration needed)

**Key finding**: durable tables for selected/imported email already existed — `gmail_selected_message_imports` and `microsoft_selected_message_imports` (see `supabase/migrations/202607150003_sprint25_token_vault_gmail_rag_gates.sql` and `20260716132406_sprint28_pilot_release_gates_integrations.sql`). Both are already written to by the real AI Workspace "preview/import this email" flow (`src/app/api/connectors/{gmail,microsoft}/messages/import/route.ts`). Per the sprint's explicit instruction ("only add a migration if no durable table exists"), **no new migration was added**.

**v1 definition of "needing reply"**: a row with `status = 'previewed'` — the user selected/previewed a message but hasn't yet confirmed import or rejected it. This is a genuine "awaiting a decision" signal already produced by existing user actions, not a blanket mailbox scan.

**Provider state**: `mailDashboardSignals.ts` checks `integration_connections` for `provider_id in ('gmail','microsoft')` with `status='connected'`. If neither is connected, the tile is honestly `not-connected`. If at least one is connected, the tile is `live` (count > 0) or `empty` (count = 0, genuine live query) — never `not-connected` once a real connection exists.

**Files**: `src/services/dashboard/mailDashboardSignals.ts`, `src/app/api/dashboard/mail-signals/route.ts`, `src/hooks/useMailDashboardSignals.ts`.

**Not implemented**: the optional second tile ("Imported emails awaiting review") was left out to keep scope tight — the single "Mails needing reply" tile is the sprint's required minimum.

## CRM implementation status: REAL (new migration required — none existed)

Confirmed no existing `crm_leads`/`crm_deals` table or Stakeholders-model extension. Built the minimal single-table domain the sprint prefers over separate leads/deals tables.

**Migration**: `supabase/migrations/20260801120000_crm_leads.sql` — `crm_leads` table (id, organization_id, stakeholder_id, title, organization_name, contact_name, stage, estimated_value, currency, priority, owner_user_id, next_follow_up_at, status, source, created_by, created_at, updated_at), RLS org-scoped (`is_org_member` for select, owner/creator/admin-role check for insert/update — matches `approval_requests`' current RLS pattern, the most recent precedent in this repo).

**Domain type**: `CrmLead`/`CrmLeadStage`/`CrmLeadStatus` added to `src/domain/entities.ts`.

**Repository**: `src/repositories/crmRepository.ts` — `listCrmLeads`, `createCrmLead`, `updateCrmLead`, `listFollowUpsDue`, `countStalledLeads`. Uses the same service-role `supabaseAdminRest` pattern as `reviewInbox.ts`/`workflowActionRepositories.ts`, with `organization_id` always taken from the caller's `TenantScope`.

**API**: `src/app/api/crm/leads/route.ts` — GET (list) / POST (create), audit-logged on create (`crm.lead.created`).

**Files**: `src/services/dashboard/crmDashboardSignals.ts`, `src/hooks/useCrmLeads.ts`.

## Social monitoring implementation status: PARTIAL — 2 of 3 named tiles real, 1 honestly not-connected

**Key finding**: `social_alert_rules`/`social_alert_events` tables already existed with real schema and RLS (`supabase/migrations/202607100001_sprint14_rag_integrations_alerts.sql`), but a repo-wide search confirmed **nothing in this codebase writes to them** — no cron job, webhook, or manual-entry UI. Querying them is therefore real (a genuine live query against a real table), but reads as an honest zero for every tenant today, not "not connected." **No new migration was added.**

**Second key finding — two unrelated "social provider" mechanisms exist**:
1. Platform-level env-var credentials (`src/services/alerts/socialAlerts.ts`'s `getSocialAlertProviderStatus`, reading `X_BEARER_TOKEN`/`META_APP_ID` etc.) — global, not tenant-owned. **This is the mechanism that actually gates whether `social_alert_events` could ever be populated**, so it's what `socialDashboardSignals.ts` uses for "Social provider health."
2. Tenant-owned OAuth connectors (`connectorContract.ts`'s `x_twitter` provider + `integration_connections` table, used by Settings' quick-connect catalogue) — unrelated to whether `social_alert_events` ever gets populated. Deliberately **not** used for this signal, to avoid conflating two systems that don't actually interact.

**Tiles implemented**:
- `Critical social alerts` (real): count of `social_alert_events` rows with `urgency='high' AND reviewed_at IS NULL`, scoped to organization. `dataState: "empty"` when the real query returns zero, `"live"` when it returns rows.
- `Social provider health` (real): reflects the actual env-var-based platform check. `dataState: "live"` if X or Facebook credentials are configured, `"partial"` otherwise.
- `Official-account alerts` (**honestly not-connected, not a real tile**): `social_alert_events` has no column or metadata convention identifying an "official account" alert. Building a heuristic guess here would risk fabricating a classification that doesn't exist in the schema — left as an explicit not-connected gap rather than a fabricated query, per the sprint's "do not fabricate social alerts" non-negotiable.

**Supported-language precision** (per the sprint's explicit requirement):
- X/Twitter: provider-gated unless `X_BEARER_TOKEN`/`X_API_KEY`/`X_API_SECRET` are all set (env-var check, not the tenant OAuth connector).
- Facebook/Meta: provider-gated unless `META_APP_ID`/`META_APP_SECRET`/`META_PAGE_ACCESS_TOKEN` are all set.
- LinkedIn: no real code exists anywhere in this codebase for social-alert ingestion — not represented as a tile at all, not even provider-gated (would be fabricating a capability that doesn't exist even in gated form).
- WhatsApp Business: same as LinkedIn — no real ingestion code exists; not represented.

**Files**: `src/services/dashboard/socialDashboardSignals.ts`, `src/app/api/dashboard/social-signals/route.ts`, `src/hooks/useSocialDashboardSignals.ts`.

## Migrations added

- `supabase/migrations/20260801120000_crm_leads.sql` (new table, RLS, indexes).

Mail and social required **zero** new migrations — both were built on existing, previously-unused-for-this-purpose infrastructure.

## APIs added

- `GET /api/dashboard/mail-signals`
- `GET /api/dashboard/social-signals`
- `GET, POST /api/crm/leads`

All three derive `organization_id` exclusively from `getServerAuthSession(true)` / `tenantScopeFromUser` — never from client input.

## Repositories/services added

`mailDashboardSignals.ts`, `crmRepository.ts`, `crmDashboardSignals.ts`, `socialDashboardSignals.ts`.

## Dashboard tiles added (replacing 3 placeholders with 8 tiles)

| Tile id | Title | Tier | Data state (varies) |
|---|---|---|---|
| `mail-inbox` | Mails needing reply | 1 | not-connected / empty / live |
| `crm-open-leads` | Open leads | 1 | not-connected / empty / live |
| `crm-follow-ups-due` | CRM follow-ups due | 1 | not-connected / empty / live |
| `crm-stalled-leads` | Stalled opportunities | 1 | not-connected / empty / live |
| `critical-social-alerts` | Critical social alerts | 1 | not-connected (loading) / empty / live |
| `official-account-alerts` | Official-account alerts | 1 | not-connected (permanent — no schema support) |
| `social-provider-health` | Social provider health | 1 | partial / live |
| `calendar-view`, `zoom-gmeet-upcoming` | (unchanged ED-R1 placeholders) | 1 | not-connected |

## Policies added (`tilePolicies.ts`)

`mailNeedingReplyPolicy`, `openLeadsPolicy`, `crmFollowUpsDuePolicy`, `crmStalledLeadsPolicy`, `criticalSocialAlertsPolicy`, `socialProviderHealthPolicy` — 6 new pure functions, each independently tested, following the exact `{priority, criticality, rationale}` shape established in ED-R1.

## Tests run

**102 tests passing across 10 files** (`npx vitest run` on the full dashboard test directory plus modified files): `tileScoring.test.ts`, `tilePolicies.test.ts` (24 new assertions across 6 new policies), `buildDashboardSnapshot.test.ts` (13 new ED-R2 integration tests covering not-connected/empty/live states for all three sources, plus the "official-account-alerts never fabricated" guarantee), `mailDashboardSignals.test.ts` (6 tests: no provider, connected-but-empty, real count, staleness/oldest-age, tenant isolation, unconfigured-admin honest zero), `socialDashboardSignals.test.ts` (6 tests: no provider, configured-but-empty, real critical count, query scoping, query-failure honesty, unconfigured-admin honesty), `crmRepository.test.ts` (8 tests: empty list, unconfigured-admin empty list, tenant-scoped list query, create with defaults, update scoped by id+org, not-found-on-update throws, follow-ups-due filtering, stalled counting), `crmDashboardSignals.test.ts` (2 tests), `CriticalityBadge.test.tsx`, `DashboardSection.test.tsx` (2 stale ED-R1 assertions caught and fixed during this sprint — see "Errors found and fixed" below).

Full-repo verification (`typecheck`, `apps/mobile typecheck`, `lint`, `test`, `build`, `supabase:verify`) run separately — see final status below.

## Errors found and fixed during this sprint

1. `DashboardSection.test.tsx` had a stale ED-R1 assertion checking for tile title "CRM leads / deals," which no longer exists after ED-R2 replaced that single placeholder with three real tiles ("Open leads," "CRM follow-ups due," "Stalled opportunities"). Fixed to assert on "Open leads."
2. `mailDashboardSignals.test.ts`'s own mock had a key-construction bug (didn't account for the `eq.` prefix Supabase's PostgREST query params use), causing a false failure in the "provider connected, zero mail" test. Fixed the mock, not the underlying service code (the service code was correct).

## Real vs provider-gated vs still-not-connected counts

- **Real** (live/empty/partial data states possible, genuinely querying real tenant data): mail-inbox, crm-open-leads, crm-follow-ups-due, crm-stalled-leads, critical-social-alerts, social-provider-health — **6 tiles**.
- **Honestly not-connected, permanently** (no schema support, not a loading state): official-account-alerts — **1 tile**.
- **Still not-connected** (unchanged from ED-R1, out of this sprint's scope): calendar-view, zoom-gmeet-upcoming, ai-token-usage-spend, budget-deficit-overshoot, bank-account-thresholds, accounts-actionables — **6 tiles**, explicitly left for ED-R3/later per this sprint's scope boundary.

## Confidence scoring

| Area | Confidence | Evidence |
|---|---:|---|
| Mail tile correctness | 95% | 6 passing tests covering all data-state transitions; built on already-live, already-populated production tables, not new speculative infrastructure |
| CRM tile correctness | 90% | 10 passing tests (repository + signals); new migration, RLS pattern matches most recent precedent in repo but has not been applied to a live Supabase project in this session (see `supabase:verify` result below for schema-level validation only) |
| Social tile correctness | 90% | 6 passing tests; genuinely real query against real RLS-protected table, but the underlying `social_alert_events` table has zero real rows in any environment today (confirmed no ingestion path exists) — correctness is proven for the empty case and for synthetic non-empty cases in tests, not yet observed against real non-empty production data |
| Tenant isolation | 95% | Every new query asserts `organization_id: eq.<scope.organizationId>` in tests; `organization_id` is derived exclusively from server-side session in every new route, never from client input; RLS also enforced at the database layer for `crm_leads` |
| Placeholder honesty | 95% | Dedicated tests assert not-connected tiles always render the literal string "Not connected yet," never a fabricated number; the official-account-alerts gap is explicit and tested |
| Dashboard integration | 90% | 13 new `buildDashboardSnapshot` integration tests; not yet visually verified in a live browser render (see HITL checklist) |
| HITL acceptance | pending | Not yet walked through live by the founder |

## HITL checklist

- [ ] Confirm the "Mails needing reply" tile reflects a real previewed Gmail/Outlook message end-to-end (preview a message in AI Workspace, then check the dashboard tile updates).
- [ ] Confirm creating a CRM lead via `POST /api/crm/leads` and seeing it reflected in the "Open leads"/"CRM follow-ups due" tiles (no UI exists yet to create leads through — this sprint built the API/repository only, not a CRM management page).
- [ ] Confirm `crm_leads` migration applies cleanly to the live Supabase project (this session validated schema/RLS syntax via `supabase:verify`'s local checks, not a live `supabase db push`).
- [ ] Sign off on the "Official-account alerts" gap being left honestly not-connected rather than guessed at.
- [ ] Confirm the two-separate-social-provider-mechanisms finding (env-var platform credentials vs. tenant OAuth) matches the founder's actual intent for how social monitoring should eventually work — this sprint used the one that's technically load-bearing today, but if the intended long-term design is the tenant-OAuth path instead, `socialDashboardSignals.ts` will need to be revisited.

## What remains partial or blocked

- No CRM management UI exists yet — leads can only be created via the API directly (e.g. via `curl` or a future UI). This was out of this sprint's scope (dashboard signals only, not a full CRM feature).
- Social alert ingestion pipeline (the thing that would actually populate `social_alert_events`) does not exist — this sprint only builds the query/read layer, honestly reporting real zeros until an ingestion pipeline is built (a distinct, larger piece of work, likely its own future sprint).
- `crm_leads` migration has not been confirmed applied against the live production Supabase project in this session — `supabase:verify`'s local schema check passing is necessary but not sufficient proof of that.
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` was deliberately **not** edited in this sprint — it is a large (40+KB), item-by-item founder-facing evidence matrix, and a rushed edit risked introducing an inaccuracy into a document this session's own evidence discipline holds to a high bar. `CONNECTOR_CREDENTIAL_READINESS_MATRIX_2026_07_30.md` was checked and left unchanged since ED-R2 didn't advance or verify any connector credential state — it only built query infrastructure on top of whatever credential state already exists.
