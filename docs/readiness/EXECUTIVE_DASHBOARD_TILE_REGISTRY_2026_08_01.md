# Executive Dashboard — Full Tile Registry

**Date**: 2026-08-01 (current as of Sprint ED-R3)
**Source of truth**: `src/services/dashboard/buildDashboardSnapshot.ts` — this table is a manual transcription of that file; if the two ever disagree, the code is authoritative.

Every tile carries a live-computed `score = priority(1-5) x criticalityWeight(green=1/yellow=2/orange=3/amber=4/red=5)`. Urgent Attention bars surface tiles with `score >= 16`. Not-connected tiles are pinned at `priority=1, criticality=green` (score 1) so they never qualify for the urgent bar and always sort last within their tier.

## Tier 1 — Executive & performance (17 tiles)

| Tile id | Title | Source | Possible data states | Priority x Criticality policy | Route | Tests | Confidence |
|---|---|---|---|---|---|---|---:|
| `overdue-tasks` | Overdue tasks | Generic `/api/repositories/tasks` (ED-R1) | live, partial | `overdueTasksPolicy` | `/tasks` | `tilePolicies.test.ts` | 95% |
| `overdue-meetings` | Missed meetings | Generic `/api/repositories/meetings` (ED-R1) | live, partial | `overdueMeetingsPolicy` | `/meetings` | `tilePolicies.test.ts` | 95% |
| `pending-ai-reviews` | HITL review inbox | `usePendingAiReviewCount` / `/api/ai/reviews` (pre-existing) | live | `pendingAiReviewsPolicy` | `/ai-workspace/review-inbox` | `tilePolicies.test.ts` | 95% |
| `approval-sla-risk` | Approval SLA risk | `LiveWorkspaceMetrics.pendingApprovals` (pre-existing) | live | `approvalSlaRiskPolicy` | `/approvals` | `tilePolicies.test.ts` | 95% |
| `project-health` | Project health | `projects` list (pre-existing) | live, empty | `projectHealthPolicy` | `/projects` | `tilePolicies.test.ts`, `buildDashboardSnapshot.test.ts` | 95% |
| `social-alerts-status` | External signals | `useSocialAlertsStatus` (pre-existing) | live, partial | `socialAlertsProviderGatedPolicy` | `/integrations` | `tilePolicies.test.ts` | 90% |
| `mail-inbox` | Mails needing reply | `gmail_selected_message_imports` / `microsoft_selected_message_imports` (ED-R2, existing tables) | live, empty, not-connected | `mailNeedingReplyPolicy` | `/ai-workspace` | `mailDashboardSignals.test.ts`, `tilePolicies.test.ts`, `buildDashboardSnapshot.test.ts` | 95% |
| `calendar-today` | Calendar today | `Meeting` domain entity via `/api/repositories/meetings` (ED-R3) | live, empty, not-connected (loading) | `calendarTodayPolicy` | `/meetings` | `calendarDashboardSignals.test.ts`, `tilePolicies.test.ts`, `buildDashboardSnapshot.test.ts` | 90% |
| `upcoming-meetings` | Upcoming meetings | `Meeting` domain entity (ED-R3) | live, empty, not-connected (loading) | `upcomingMeetingsPolicy` | `/meetings` | same as above | 90% |
| `zoom-upcoming-meetings` | Upcoming Zoom meetings | `integration_connections` OAuth status only — no event-fetch service exists (ED-R3) | not-connected (permanent) | none (fixed floor score) | `/integrations` | `externalMeetingsDashboardSignals.test.ts`, `buildDashboardSnapshot.test.ts` | 90% (honesty), N/A (no live data path) |
| `gmeet-upcoming-meetings` | Upcoming Google Meet meetings | Same as above | not-connected (permanent) | none | `/integrations` | same | 90% |
| `critical-social-alerts` | Critical social alerts | `social_alert_events` (ED-R2, existing table, no ingestion pipeline) | live, empty, not-connected (loading) | `criticalSocialAlertsPolicy` | `/alerts` | `socialDashboardSignals.test.ts`, `tilePolicies.test.ts`, `buildDashboardSnapshot.test.ts` | 90% |
| `official-account-alerts` | Official-account alerts | None — no schema field exists; deliberately not queried | not-connected (permanent, by design) | none | none | `buildDashboardSnapshot.test.ts` (asserts it never fabricates a value) | 95% (honesty) |
| `social-provider-health` | Social provider health | `socialAlerts.ts` env-var check (ED-R2) | live, partial | `socialProviderHealthPolicy` | `/integrations` | `socialDashboardSignals.test.ts`, `tilePolicies.test.ts` | 90% |
| `crm-open-leads` | Open leads | `crm_leads` (ED-R2, new table) | live, empty, not-connected (loading) | `openLeadsPolicy` | `/crm` | `crmRepository.test.ts`, `crmDashboardSignals.test.ts`, `tilePolicies.test.ts`, `buildDashboardSnapshot.test.ts` | 90% |
| `crm-follow-ups-due` | CRM follow-ups due | `crm_leads` (ED-R2) | live, empty, not-connected (loading) | `crmFollowUpsDuePolicy` | `/crm` | same | 90% |
| `crm-stalled-leads` | Stalled opportunities | `crm_leads` (ED-R2) | live, empty, not-connected (loading) | `crmStalledLeadsPolicy` | `/crm` | same | 90% |

## Tier 2 — AI operating infrastructure & business intelligence (4 tiles)

| Tile id | Title | Source | Possible data states | Policy | Route | Tests | Confidence |
|---|---|---|---|---|---|---|---:|
| `document-indexing-health` | Document indexing health | `LiveWorkspaceMetrics.ragReadyDocuments` (pre-existing) | live | `documentIndexingHealthPolicy` | `/knowledge` | `tilePolicies.test.ts` | 95% |
| `workflow-timeline-activity` | Workflow timeline activity | `useWorkflowTimeline` (pre-existing) | live | `workflowTimelineActivityPolicy` | `/dashboard` | `tilePolicies.test.ts` | 90% |
| `integration-health` | Integration health | `LiveWorkspaceMetrics.integrationConfigured` (pre-existing) | live | `integrationHealthPolicy` | `/integrations` | `tilePolicies.test.ts` | 95% |
| `ai-token-usage-spend` | AI token usage / spend | `aiSpendGuard.ts` exists, no client-facing summary endpoint | not-connected (permanent, until a Phase-2 endpoint is built) | none | none | `buildDashboardSnapshot.test.ts` (honesty) | 95% (honesty) |

## Tier 3 — Compliance, audit, governance & policy (5 tiles)

| Tile id | Title | Source | Possible data states | Policy | Route | Tests | Confidence |
|---|---|---|---|---|---|---|---:|
| `audit-log-gap` | Audit trail | `AuditLogsRepository` / `/api/repositories/audit_logs` (pre-existing) | live, partial | `auditLogGapPolicy` | `/admin/audit-logs` | `tilePolicies.test.ts` | 95% |
| `budget-thresholds` | Budget thresholds | `financial_watch_items` (ED-R3, new table, MANUAL tracking) | live, empty, not-connected (loading) | `financialBudgetThresholdsPolicy` | `/analytics` | `financialWatchRepository.test.ts`, `financialDashboardSignals.test.ts`, `tilePolicies.test.ts`, `buildDashboardSnapshot.test.ts` | 90% |
| `budget-overshoot` | Budget overshoot | `financial_watch_items` (ED-R3) | live, empty, not-connected (loading) | `financialBudgetOvershootPolicy` | `/analytics` | same | 90% |
| `accounts-below-threshold` | Accounts below threshold | `financial_watch_items` (ED-R3) | live, empty, not-connected (loading) | `financialAccountsBelowThresholdPolicy` | `/analytics` | same | 90% |
| `accounts-actionables` | Accounts actionables | `financial_watch_items` (ED-R3) | live, empty, not-connected (loading) | `financialAccountsActionablesPolicy` | `/analytics` | same | 90% |

**Every Tier 3 financial tile's `value` explicitly appends "(manual tracking)"** — verified by a dedicated test (`buildDashboardSnapshot.test.ts`, "every financial tile's value explicitly says 'manual tracking'") that also asserts none of them ever contain the phrase "bank connected."

## Summary counts

- **Total tiles**: 26
- **Real (can reach `live` or genuine `empty` states from actual tenant data)**: 22
- **Permanently not-connected by design (no live data path exists, and none is faked)**: 4 — `zoom-upcoming-meetings`, `gmeet-upcoming-meetings`, `official-account-alerts`, `ai-token-usage-spend`
- **Backed by a new migration this program**: 8 (`crm-open-leads`, `crm-follow-ups-due`, `crm-stalled-leads` on `crm_leads`; `budget-thresholds`, `budget-overshoot`, `accounts-below-threshold`, `accounts-actionables` on `financial_watch_items`)
- **Backed by pre-existing tables that had no repository/query layer until this program**: 5 (`mail-inbox` x1 tile on 2 tables; `critical-social-alerts`, `social-provider-health`)
- **Backed by entirely pre-ED-R1 infrastructure**: 9 (`overdue-tasks` through `integration-health`, `audit-log-gap`)
