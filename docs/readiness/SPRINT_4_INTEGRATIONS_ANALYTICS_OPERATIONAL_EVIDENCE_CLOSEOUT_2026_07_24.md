# Sprint 4 Closeout: Integrations, Analytics, and Operational Evidence

Date: 2026-07-24
Program: Five-Sprint QA3 Readiness Execution Program
Executor: Claude Code
Product manager / prompt designer: Codex
HITL authority: Sudipta Koushik Sarmah, Founder and Managing Director, Triaxis Ventures Private Limited

## Sprint Objective

Move AXXESS from product-functional to operator-visible: prove operational evidence after real user actions, capture analytics for beta learning, expose integration readiness truthfully, and prepare a QA3 evidence package. This was explicitly a validation and evidence sprint, not a broad integration marketplace build-out.

## Result Summary

**Not closed, but this is the first sprint in the program with a targeted actionable (A-22, analytics) closed to `Yes` purely on code evidence, with no live-authenticated-session caveat required.** A-25 (QA3 evidence package) also closed `Yes`. A-18, A-19, A-20, A-21 remain `Blocked` — A-18/A-19 on the Sprint 2 golden-path-walkthrough dependency (though both gained real new evidence this sprint), A-20 on a live-authenticated dashboard confirmation this program has never performed, A-21 purely on external OAuth credential provisioning. Like Sprint 3, this sprint's real deliverable is not primarily the six targeted actionables — it is two more found-and-fixed defects in the same class the program keeps surfacing: a fabricated-timeline demo-data-leak, and an unconditional "Investor Preview" banner shown to real tenants across three components.

## Sprint 2 and Sprint 3 Carryover Gate

Checked against `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24.md` and `docs/readiness/SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md`: no evidence exists that the HITL golden-path walkthrough (Sprint 2) or the two-tenant/isolation-harness walkthroughs (Sprint 3) have occurred since those sprints closed. A-13, A-15, A-16, A-17, A-08, A-10, A-11, A-14 remain exactly where those sprints left them, unchanged this sprint except where they intersect Sprint 4's own scope directly (A-18/A-19's audit/timeline evidence, broadened below). Per this sprint's own instruction, neither Sprint 2 nor Sprint 3 was restarted or re-litigated.

## The Two Core Findings

### 1. The Workflow Timeline's Empty-Tenant Fallback Was Fabricating Activity

`listWorkflowTimeline()` (`src/services/workflows/liveTenantWorkflow.ts`) previously fell back to `fallbackWorkflowTimelineEvents(organizationId)` — a hardcoded list of fictional events ("District review note imported," "Cited answer generated" with a fixed 0.82 confidence score, fixed 2026-07-16 timestamps) — whenever the real `workflow_timeline_events` query returned zero rows, **regardless of whether Demo Mode was on**. A brand-new real tenant with genuinely no workflow activity yet would see events that never happened, wrapped with their own real `organizationId` to look plausible. This is the same class of demo-data-leak the original Sprint 5 (2026-07-22) found and fixed for the dashboard, AI Review Inbox, and Social Alerts — but it was never caught in that pass because it lives in a different module (`liveTenantWorkflow.ts`, not the feature components that pass audited that day).

**Fix**: the fallback now only fires when `isDemoModeEnabled()` is true (server-side, this is env-forced only — never a per-request signal, matching the exact pattern already shipped for the AI Review Inbox in `src/services/ai/reviewInbox.ts`). A genuinely empty real tenant now sees an honest empty array. Applied to both branches: Supabase-unconfigured and Supabase-configured-but-zero-rows.

### 2. Three Components Showed An Unconditional "Investor Preview" Banner To Every Tenant

`DemoDataNotice` (`src/components/enterprise/index.tsx`) renders a fixed "**Investor Preview:**" prefix. Ten components in the codebase call it; seven already correctly gate it behind `demoMode &&` (`AnalyticsSection.tsx`, `ApprovalsSection.tsx`, `StakeholdersSection.tsx`, `DashboardSection.tsx`, `ProjectsSection.tsx`, `TasksSection.tsx`, `AIWorkspaceSection.tsx`) — but `KnowledgeHubSection.tsx`, `OrganizationAdminSection.tsx`, and `PilotConversionSection.tsx` called it unconditionally. Every real tenant, not just Investor Preview sessions, saw claims like "Knowledge Hub shows seeded policies... and RAG indexing state" or "Investor Preview uses seeded users, roles, departments, and audit records" on their own live workspace pages.

**Fix**: brought all three in line with the codebase's own dominant, already-audited convention — `KnowledgeHubSection.tsx` and `OrganizationAdminSection.tsx` now gate on `isDemoModeEnabled()` (newly imported in the latter two, which had never imported it); `PilotConversionSection.tsx` gates on its own more precise `state.source === "Demo"` local state model, since that component already tracks live-vs-demo per-request more accurately than the global flag.

## Files Changed

- `src/app/App.tsx` — added `app_opened` event dispatch.
- `src/features/auth/EnterpriseAuthFlowPage.tsx` — added `sign_up_started` event dispatch.
- `src/features/documents/DocumentsSection.tsx` — added `document_uploaded` and `rag_ingestion_completed` event dispatch.
- `src/features/ai-workspace/AIWorkspaceSection.tsx` — added `rag_answer_generated` event dispatch.
- `src/features/settings/SettingsSection.tsx` — added `profile_updated` event dispatch (new event).
- `src/services/analytics/types.ts` — added `profile_updated` to `AnalyticsEventName`.
- `src/services/workflows/liveTenantWorkflow.ts` — fixed the timeline fallback demo-data-leak.
- `src/features/knowledge-hub/KnowledgeHubSection.tsx` — gated `DemoDataNotice`.
- `src/features/admin/OrganizationAdminSection.tsx` — gated `DemoDataNotice`, added missing `isDemoModeEnabled` import.
- `src/features/admin/PilotConversionSection.tsx` — gated `DemoDataNotice` on its own `state.source`.
- `docs/ANALYTICS_EVENTS.md` — documented the new events and the Sprint 4 dispatch-proof audit.
- `docs/PLUGIN_RUNTIME.md` — corrected a stale claim that connector OAuth token exchange was unimplemented; documented the real Gmail/Microsoft blocker (missing env vars) and why `plugin_connection_started` was deliberately not wired this sprint.
- New tests: `src/services/analytics/eventTaxonomy.test.ts`, `src/app/api/connectors/oauth/start/route.test.ts`, `src/services/workflows/liveTenantWorkflow.timelineFallback.test.ts`, `src/features/demoDataNoticeGating.test.ts`.

No architecture was rewritten, no UI was redesigned, no working functionality was removed, and no fake integration success state was created.

## Actionables

**Targeted:** A-18, A-19, A-20, A-21, A-22, A-25.
**Also reviewed (no new evidence, unchanged):** A-13, A-14, A-17.

**Closed (`Yes`):** A-22 (analytics event minimum), A-25 (QA3 evidence package).

**Blocked:** A-18 (audit log updates, 90%), A-19 (timeline evidence, 82%), A-20 (dashboard dedupe, 85%), A-21 (Gmail/Microsoft OAuth, 75%).

**Still `No`:** none of the 6 targeted.

## Confidence Score Per Actionable

| Actionable | Status | Confidence | Basis |
|---|---|---:|---|
| A-18 Audit log updates | Blocked | 90% | Multiple confirmed write points; role-change (Sprint 3) and connector-OAuth (Sprint 4) audit events now confirmed. Live-session dependency (Sprint 2) unchanged. |
| A-19 Timeline evidence | Blocked | 82% | Fabricated-fallback defect found and fixed this sprint, closing a real gap in the "no demo-only timeline" standard. Live-session dependency unchanged. |
| A-20 Dashboard dedupe | Blocked | 85% (code) | Fix confirmed intact and unregressed via existing test suite; never live-authenticated-confirmed post-fix, in this sprint or any prior one. |
| A-21 Gmail/Microsoft OAuth | Blocked | 75% (code) | Connector implementation genuinely complete and tested; blocked purely on 7 missing production env vars, confirmed absent via `npx vercel env ls`. |
| A-22 Analytics event minimum | Yes | 85% | 18 of 20 required categories dispatch-proven from real source code, not just declared types; 6 previously-undispatched events wired this sprint. |
| A-25 QA3 evidence package | Yes | 90% | `docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md` created with all required sections. |

## Dashboard Dedupe Result

Confirmed intact, no regression. `src/hooks/liveWorkspaceMetricsCache.ts`'s shared, tenant-scoped, 5-second-TTL in-flight cache is used by all three dashboard hook call sites (`useLiveWorkspaceMetrics`, and by composition `useEnterpriseGoldenPath` and `useLiveRagHealth`) — verified by direct source read, not assumed. No other Dashboard-consumed hook (`useLiveNotifications`, `useLiveApprovals`, `useLiveIntegrationHealth`) is currently wired into `DashboardSection.tsx`, so no new duplication surface was introduced since the original fix. Existing test coverage (`liveWorkspaceMetricsCache.test.ts`) already proves concurrent-call collapsing, cross-scope isolation, failure-doesn't-poison-cache, and cache-clear-on-logout. What remains unproven: an actual authenticated browser session confirming the network tab shows one request per resource, not the pre-fix 2-3x — this program has never performed that specific live check, in Sprint 4 or the original Sprint 5.

## Analytics Instrumentation Result

`src/services/analytics/types.ts` declares 66 event names. A dedicated dispatch-proof test suite (`eventTaxonomy.test.ts`) reads the actual application source — not the type declarations — to confirm 18 of the sprint's 20 required categories fire from real code. Two categories remain unaddressed by design: "AI review created" has no dedicated event (the review-decision event `ai_answer_reviewed` covers approval/rejection, but nothing fires distinctly on review *creation* — a candidate for a future sprint), and "integration connect attempted" (`plugin_connection_started`) remains declared-but-undispatched because the "Connect Gmail/Microsoft" UI elements are plain anchor-tag navigations with no safe client-side moment to fire and flush an event before the page unloads — the server-side `connector.<provider>.oauth.started` audit log already captures every attempt with stronger guarantees (see `docs/PLUGIN_RUNTIME.md`).

Provider status: `MixpanelAnalyticsProvider` and `PostHogAnalyticsProvider` are both real, tested implementations (`analytics.test.ts`), but neither has a live project token configured in production — the app correctly and safely falls back to `MockAnalyticsProvider` (a no-op), per `docs/PRIVACY_ANALYTICS.md`'s own design. No live third-party analytics event has been observed by either provider; this is documented as `Blocked`, not claimed as `Yes`, consistent with this sprint's own non-negotiable ("Do not claim analytics are live unless events are observed or logged through the implemented provider path").

## Gmail/Microsoft Readiness Result

**Gmail: Blocked.** **Microsoft: Blocked.** Both share the identical blocker and evidence.

The connector OAuth implementation (`src/services/integrations/oauthProvider.ts`, `src/services/integrations/tokenVault.ts`, `src/app/api/connectors/oauth/start/route.ts`, `src/app/api/connectors/oauth/callback/route.ts`) is genuinely complete: real PKCE support, timing-safe signed/verified OAuth state, real authorization-code token exchange, AES-256-GCM encrypted token vault storage, and a real `integration_connections` upsert on successful connect. Every start and connect attempt writes a real, tenant-scoped audit log (`connector.<provider>.oauth.started`/`.connected`). This directly contradicts `docs/PLUGIN_RUNTIME.md`'s prior claim that "Sprint 22 should complete provider callback token exchange" — corrected this sprint.

Required environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `AXXESS_OAUTH_STATE_SECRET`, `AXXESS_TOKEN_VAULT_KEY`, `AXXESS_TOKEN_VAULT_KEY_ID` — confirmed absent from the production Vercel project via `npx vercel env ls` (all `.env.example`-listed names checked; none appear in the current production variable list).

OAuth callback/redirect path: `{NEXT_PUBLIC_APP_URL}/api/connectors/oauth/callback?provider={gmail|microsoft}`, built by `getOAuthProviderConfiguration()`.

Tenant ownership of credentials: OAuth state is signed and bound to `organizationId`/`userId` at issuance and re-verified against the active session at callback (`verifyOAuthState`) — a token exchanged under one tenant's state cannot be attributed to another.

Revocation/error state: confirmed via direct code read of `IntegrationsSection.tsx`'s "Enterprise Data & Billing Connections" panel (a separate, non-OAuth credential-storage flow for warehouse/billing/SSO connectors) — `revokeCredentials()` is real, and the panel's own copy honestly discloses "Live connectivity verification against the external service is not implemented in this pass." The OAuth-specific connector flow's revocation path is not yet built (out of this sprint's smallest-safe-change scope); noted as a gap, not fixed.

No fake connected state exists for either provider: confirmed the `integrations` array feeding the top-of-page connected/disconnected badges in `IntegrationsSection.tsx` resolves through `src/demo/emptyRepositories.ts`'s `getIntegrations: () => []` for any real tenant outside Demo Mode.

## Audit/Timeline Evidence Result

Audit writes confirmed for: invitation created/accepted (Sprint 2/3), role/department/status change (Sprint 3), tenant-bound resource creation across projects/tasks/documents/knowledge_articles/meetings (`recordResourceCreateEvidence`), RAG answer generation (`rag.answer.generated`), connector OAuth start/connect (Sprint 4, newly confirmed). All tenant-scoped, actor/timestamp/source/action preserved per the existing `audit_logs` schema. Evidence retrieval path confirmed real: `POST /api/audit-exports` (`src/app/api/audit-exports/route.ts`, 218 lines, tenant-scoped, writes its own export audit event). Timeline events confirmed for documents, RAG answers, human review decisions, created tasks, and (via Sprint 3) role changes — extending well beyond the single-module (`projects`-only) coverage this readiness program's earlier gap analysis flagged. The one real defect found this sprint (the fabricated fallback) is fixed, per "The Two Core Findings" above.

## Social Alerts Audit Result

**Status: Provider-gated / Demo-only for real ingestion, honest empty state for live tenants.** Confirmed unchanged and correct since the original Sprint 5 (2026-07-22) fix: `AlertsSection.tsx` gates all seeded demo alerts behind `isDemoModeEnabled()`, shows an honest `EmptyState` ("Social alert ingestion isn't wired to a live provider or tenant-scoped repository yet") for real tenants, and its provider-status cards ("Ready for governed ingestion" / "Awaiting provider credentials") are computed from real env-var configuration, not fabricated. Existing test coverage (`AlertsSection.test.tsx`) re-confirmed passing with no changes needed. No live social alert ingestion repository exists yet — this remains accurately labeled as future work, not overclaimed as live.

## Badge/Count Overclaim Audit Result

Sixteen modules inspected per the sprint's list. Confirmed correct (real or honestly gated): Dashboard, AI Workspace, Projects & Programs, Tasks & Workflow, Meetings & Decisions, Documents & Files (Sprint 2 fix, unchanged), Analytics & Reports (Sprint 5 2026-07-22 fix, unchanged), Social Alerts (see above), Stakeholders & CRM (Sprint 3 finding: fully demo-gated, no live repository — unchanged, documented), Approvals & Governance, Audit Logs, Product Analytics, Integrations (confirmed this sprint — no fake connected state), Settings, Beta Readiness.

**Found and fixed this sprint**: Knowledge Hub, Organization Admin, and Pilot Conversion all showed an unconditional "Investor Preview:" banner to every tenant — see "The Two Core Findings" above.

**Found, documented, not fixed (remaining overclaim risk)**: Knowledge Hub's "Indexed"/"Ready" stat tiles (`buildRagIngestionRecord`) compute a client-side simulated staging estimate from document metadata, not a real check against `rag_document_chunks` — this was already known from Sprint 2 and remains unresolved; fixing it properly requires deciding whether to wire a real chunk-existence query or relabel the tiles, a product decision out of this sprint's low-risk-copy-correction scope. `PilotConversionSection.tsx` falls back to fabricated demo events for a real tenant with genuinely zero pilot-readiness events — the `DataStateBadge` honestly labels this as "Demo," but the underlying content is still fabricated; consistent with the AlertsSection/AnalyticsSection pattern of an honest empty state instead would be a stronger fix, deferred to a future sprint given time budget.

## QA3 Evidence Package Status

Created: `docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md`. Tracks Sprint 1-4 evidence with links to every closeout, pending Sprint 5 scope, a consolidated cross-sprint "Known Blockers" table (owner + next action for each), test/deployment references, HITL retest priority order, and QA3 trigger criteria per the program's own recommendation document. No secrets or credential values are stored in the package.

## Tests Run And Results

```
pnpm run typecheck            -> clean
pnpm run lint                 -> clean, zero warnings
pnpm run test                 -> 127 files / 439 tests passing (up from 123/409 at Sprint 3 close)
pnpm run build                -> succeeded (Next.js, all routes compiled)
```

New/targeted test runs, all passing:

```
src/app/api/connectors/oauth/start/route.test.ts + src/services/analytics/*  -> 15 tests passing
src/services/analytics/eventTaxonomy.test.ts                                  -> 19 tests passing
src/services/workflows/liveTenantWorkflow.timelineFallback.test.ts
  + liveTenantWorkflow.test.ts                                                -> 7 tests passing
src/features/demoDataNoticeGating.test.ts                                     -> 3 tests passing
```

## Live / Manual Verification Notes

**Performed:** every OAuth-readiness and connector claim in this closeout was verified by direct source read of the actual route/service implementation, not assumed from documentation; the missing-env-var claim was verified by a live `npx vercel env ls` call against the real production Vercel project, not assumed. The analytics dispatch-proof suite reads the actual shipped component source for every claimed event.

**Not performed, and cannot be performed by Claude Code:** an authenticated live dashboard load confirming the dedupe fix's network behavior (A-20), a live third-party analytics event observed by Mixpanel or PostHog (requires production credentials this environment does not have and cannot set without HITL-provided values), and a completed Gmail/Microsoft OAuth consent flow (requires external provider console registration, a credentialed action outside Claude Code's operating constraints).

## Remaining Risks

- **A-20 has still never been live-confirmed post-fix**, in this sprint or the original Sprint 5 that shipped it — the dedup mechanism is strongly code-and-test-evidenced but genuinely unproven against a real authenticated browser session.
- **Knowledge Hub's "Indexed/Ready" badges remain a client-side simulation**, not a real backend check — a real risk if a buyer or investor trusts those numbers as confirmed RAG-index status.
- **`PilotConversionSection.tsx`'s demo-fallback-for-empty-real-tenant pattern** is honestly labeled but still shows fabricated content — a softer version of the defect class this sprint fixed elsewhere, deliberately left for a future sprint given time budget.
- **`GET /api/ai/reviews` has no role check** (found during Sprint 3's tenant-model audit, not yet fixed) — any authenticated org member can see every AI review in the tenant, not just their own. Same-tenant exposure, not cross-tenant.
- **Mixpanel/PostHog have never actually received a live event** — the instrumentation and provider code are both real and tested, but zero production credentials exist to prove third-party capture end to end.
- **The Gmail/Microsoft OAuth connector's revocation path is not yet built** (distinct from the separate Enterprise Data & Billing Connections panel's revocation, which is real) — a gap if a tenant ever needs to disconnect a completed OAuth connection.

## Recommended Sprint 5 Readiness

**Do not begin Sprint 5 yet**, per this sprint's own instruction. Two new, independent HITL actions from this sprint (live-authenticated dashboard confirmation for A-20; OAuth provider registration + env vars for A-21) join the still-outstanding Sprint 2 golden-path walkthrough and Sprint 3 two-tenant/isolation-harness walkthroughs as the program's highest-leverage next actions. None of these four is a product, business, legal, or security judgment call — all are environment-provisioning or live-verification actions only the HITL can perform.

## HITL Decision Required

1. **Dashboard dedupe live confirmation (A-20)**: load the dashboard while signed in as a real tenant and confirm via browser devtools that each live-metrics request fires once per resource, not the pre-fix 2-3x.
2. **Gmail/Microsoft OAuth provisioning (A-21)**: register OAuth applications in Google Cloud Console and Azure Portal, then set the 7 required environment variables via `npx vercel env add` (values only — never share the actual client secret or token vault key as plain text in chat).
3. Everything else in this closeout requiring HITL action is a restatement of Sprint 2/3's still-outstanding requests (golden-path walkthrough; two-tenant walkthrough; Docker or non-production Supabase project for the isolation harness) — see `docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md`'s "HITL Retest Requirements" for the full, prioritized list.
