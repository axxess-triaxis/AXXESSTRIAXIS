# Beta QA Actionables - Claude Code Report - 2026-07-22

## Purpose

This document extracts 20 engineering actionables from the Claude Code beta end-to-end QA report.

The raw report is preserved as an evidence artifact at:

```text
docs/qa-artifacts/2026-07-22-claude-code-beta-e2e-qa-report.txt
```

This checklist is a derived implementation artifact. It does not replace the raw report.

Five-sprint remediation checklist:

```text
docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md
```

## QA Source

Report title:

```text
AXXESS by Triaxis - Enterprise QA Engagement
Beta End-to-End QA Report
```

Tested URL:

```text
beta.triaxisventures.com
```

Test date:

```text
2026-07-22
```

Reported scores:

```text
Beta readiness: 22/100
Enterprise readiness: 48/100
Investor demo readiness: 35/100
Pilot customer readiness: 12/100
```

Core QA conclusion:

```text
The beta cannot currently complete the real tenant golden path.
```

## Root-Cause Theme

Most high-severity findings appear to trace back to one deployment/authentication mismatch:

- The browser renders a mock authenticated Organization Admin session.
- Server-side routes correctly require a real Supabase session.
- Tenant-scoped requests therefore return `401`.
- Pages that depend on those requests either fail, hang or show misleading fallback content.

Primary suspected setting:

```text
NEXT_PUBLIC_AXXESS_AUTH_SHELL=false or unset in beta/production
```

## The 20 Actionables

### 1. Enforce Real Supabase Auth In Beta And Production

Severity: P0

Source findings:

```text
F-001, F-002, F-003, F-004, F-005
```

Action:

Ensure deployed beta and production environments use real Supabase-backed auth by default. Mock RBAC or auth-shell bypass must require explicit local/demo configuration and must never silently activate in live tenant mode.

Acceptance:

- Fresh unauthenticated browser does not show Organization Admin.
- `/auth` shows a real login form.
- `/api/auth/session` and UI session state agree.
- Deployed environment variables are documented and verified.

Status: Closed locally in Sprint 1 (2026-07-22). `src/config/featureFlags.ts` and `src/middleware.ts` both now default `NEXT_PUBLIC_AXXESS_AUTH_SHELL` to real Supabase auth (`true`) unless explicitly set to `false`. See `docs/SPRINT_LOG.md` Sprint 1 entry for full verification evidence. Live Vercel beta env vars still need to be confirmed/redeployed (tracked as a follow-up).

### 2. Make Sign Out Actually Clear The User State

Severity: P0

Source finding:

```text
F-002
```

Action:

Verify logout clears Supabase session, cookies, client state and any mock/demo fallback state. Prevent immediate mock-session rehydration after logout.

Acceptance:

- User clicks Sign Out.
- User is routed to login or public page.
- Refresh does not recreate an authenticated workspace unless Demo Mode is explicitly forced.

Status: Closed locally in Sprint 1 (2026-07-22). `src/auth/AuthProvider.tsx`'s `logout()` already called the server-side `/api/auth/logout` route (clears httpOnly cookies) and set client state to `unauthenticated`; this was masked in production by the F-001 default. Regression-tested in `src/auth/AuthProvider.test.tsx`.

### 3. Restore Reachability Of The Real Login Form

Severity: P0

Source finding:

```text
F-003
```

Action:

Ensure `/auth` renders the login form when there is no valid server-side session.

Acceptance:

- `/auth` in a fresh browser displays email/password login.
- Investor preview credentials can be tested explicitly.
- Normal login and demo login are visually distinguishable.

Status: Closed locally in Sprint 1 (2026-07-22). Regression-tested in `src/app/auth/page.test.tsx` (asserts the login form renders and no "Signed in" text appears for an unauthenticated session).

### 4. Block Live Workspace Access Without A Real Session

Severity: P0

Source findings:

```text
F-001, F-005
```

Action:

Protected routes should not render live tenant workspaces when `/api/auth/session` returns `401`.

Acceptance:

- `/dashboard`, `/projects`, `/admin/audit-logs` and other protected routes redirect or show a sign-in-required state.
- No live tenant CTAs appear for unauthenticated users.

Status: Closed locally in Sprint 1 (2026-07-22). Fixed `src/middleware.ts` to redirect unauthenticated requests to protected routes to `/auth` at the edge by default (previously required an explicit `=true` env var, so an unset variable left routes unguarded). `src/app/App.tsx` already provided a client-side "Sign in required" fallback for the same case. Regression-tested in `src/middleware.test.ts`.

### 5. Verify Project Creation End To End

Severity: P0

Source finding:

```text
F-004
```

Action:

After auth correction, re-test the exact failed project creation path.

Acceptance:

- A real authenticated user creates a project.
- The project persists in Supabase.
- The project appears after refresh.
- Audit and activity timeline records are written.

Status: Closed locally in Sprint 2 (2026-07-22). Confirmed `projectsRepository.create` already wrote real Supabase-backed project rows via authenticated REST (not local state), and `ProjectsSection.tsx` already reloaded the project list from the repository after save (so a created project survives refresh) -- both pre-existing and unchanged. The actual gap was that `POST /api/repositories/projects` never wrote audit or workflow-timeline evidence; added `recordProjectCreateEvidence` in `src/app/api/repositories/[resource]/route.ts`, which calls `auditLogsRepository.record` (action `project.created`) and `recordWorkflowTimelineEvent` (event type `workflow_action_created`) after a successful project create. Regression-tested in `src/app/api/repositories/[resource]/route.test.ts` and `src/features/projects/ProjectsSection.test.ts`. The exact QA repro (creating a project as a real authenticated user against a live Supabase project) was not re-run against a live deployment this pass -- only local/test-fixture verification.

### 6. Audit All Tenant-Scoped API Routes For Session Agreement

Severity: P0

Source finding:

```text
F-005
```

Action:

Inventory tenant-scoped API routes and verify that client session state, server session state and repository permissions align.

Acceptance:

- Tenant routes return expected data for valid sessions.
- Tenant routes return controlled auth responses for invalid sessions.
- No route leaks cross-tenant data.

Status: Closed locally in Sprint 2 (2026-07-22), extending the Sprint 1 partial close. Audited `src/app/api/repositories/[resource]/route.ts` and confirmed every verb (`GET`/`POST`/`PATCH`) returns `401` before constructing a tenant scope when `getServerAuthSession` finds no session, and only scopes data via `tenantScopeFromUser(session.user, ...)` after a real session is confirmed. Confirmed `organizationIdForMutation` in `src/repositories/supabaseEnterpriseRepositories.ts` ignores any client-supplied `organizationId` for non-Super-Admin roles (always uses the authenticated scope's own organization), and that the `projects` table's RLS policies (initial schema migration) independently enforce the same boundary at the database level regardless of application code. Added repository-level tests proving a spoofed `organizationId` is ignored for a normal tenant scope and only honored for Super Admin. Live two-tenant cross-isolation testing against a real Supabase deployment with two provisioned tenants was not performed this pass -- the tests prove the query/mutation logic is correctly scoped in isolation, not an end-to-end live check; tracked as a Sprint 5 follow-up, do not assume safe by default without that live check.

### 7. Add Timeout And Error Fallbacks To All Loading Workspaces

Severity: P0

Source findings:

```text
F-006 through F-014
```

Action:

Every data-fetching workspace should resolve to live data, a documented empty state, a provider-gated state or a user-friendly error within a bounded time.

Acceptance:

- No permanent loading states.
- No infinite spinners.
- Failed requests produce actionable UI states.

Status: Closed locally in Sprint 3 (2026-07-22). Audited all 9 named workspaces plus Dashboard's dependent hooks against the *current* local codebase (not the QA report's live deployment, which by this point had not been redeployed since Sprint 1 or 2 either). The honest finding: most of these workspaces do not have a mount-time async gate capable of hanging in the current source -- Approvals, Stakeholders/CRM, and Analytics are synchronous, Demo-Mode-gated stubs with no fetch at all; AI Workspace, Integrations, and Settings populate state asynchronously without ever blocking initial render. Two components (Organization Admin, Audit Logs) had a genuine, if narrow, defect: an early `if (!scope) return;` skipped resetting their `loading` flag to `false`, so `loading` could stay stuck at its initial `true` value if it ever ran before session/tenant scope resolved -- fixed in both. Separately, Approvals' exact QA-reported symptom ("Loading Executive Dashboard") was traced to a real routing bug, not a component bug -- see item 9. See `docs/SPRINT_LOG.md` for the full per-workspace breakdown.

### 8. Fix AI Workspace Loading Failure

Severity: P0

Source finding:

```text
F-006
```

Action:

Ensure AI Workspace loads in live mode and gracefully handles missing provider credentials, no documents, no indexed sources or auth failure.

Acceptance:

- The page resolves.
- User can see either the governed ask flow, a setup state or a provider-gated state.
- No indefinite spinner blocks the flagship workflow.

Status: Closed locally in Sprint 3 (2026-07-22). `AIWorkspaceSection.tsx` renders its full ask/review UI immediately -- it has no page-level loading gate to hang on. The interactive "ask a governed question" flow already had a 20-second timeout with `AbortController` and a distinct "taking longer than usual" retry state. Fixed a separate, real defect: the governed-question and review-decision failure paths threw `Error(result.error ?? fallback)`, which could surface a raw backend string (e.g. `"Unauthorized."`) to the user; now they log the raw detail to the console and always show fixed, role-aware copy (sign-in-required for 401, permission-denied for 403, generic failure otherwise).

### 9. Fix Approvals And Governance Loading Failure

Severity: P0

Source finding:

```text
F-010
```

Action:

Repair the approvals workspace data-loading path and correct the mislabeled loading text that references Executive Dashboard.

Acceptance:

- `/approvals` resolves.
- Loading copy references Approvals/Governance.
- Empty, live and demo states are distinct.

Status: Closed locally in Sprint 3 (2026-07-22), and this is the sprint's most significant find. `ApprovalsSection.tsx` itself was already a safe, synchronous, Demo-Mode-gated stub with no fetch to hang on -- but the exact QA-reported symptom ("Loading Executive Dashboard" on the Approvals page) was real, and traced to `src/app/routing/routes.ts`: the `appRoutes` array had **no entry at all** for `id`/`section: "approvals"`, even though `"approvals"` is a valid `NavSection` with its own sidebar item and its own lazy-loaded component. `routeForPath("/approvals")` and `routeForSection("approvals")` therefore silently fell back to `appRoutes[1]` (the Dashboard route, labeled "Executive Dashboard"), and `RouteBoundary`'s `<Suspense fallback={<LoadingState label={\`Loading ${route.label}\`} />}>` used that wrong label. Fixed by adding the missing route entry. Regression-tested in `src/app/routing/routes.test.ts` and `src/app/routing/RouteBoundary.test.tsx`.

### 10. Fix Stakeholders / CRM Loading Failure

Severity: P0

Source finding:

```text
F-011
```

Action:

Ensure stakeholder and CRM data loads or resolves to an honest empty state in live tenant mode.

Acceptance:

- `/stakeholders` resolves for a real tenant.
- Empty tenant state provides a real CTA.
- Errors do not hang the page.

Status: Closed locally in Sprint 3 (2026-07-22). `StakeholdersSection.tsx` is a synchronous, Demo-Mode-gated stub (no live stakeholders/CRM repository exists yet, per its own code comment) -- it has no fetch and cannot hang. Outside Demo Mode it already showed an honest empty state with a real "Add Contact" CTA. Regression-tested with a render test confirming immediate, non-loading output.

### 11. Fix Analytics / Reports Loading Failure

Severity: P0

Source finding:

```text
F-012
```

Action:

Ensure analytics renders usable live, empty, demo or provider-gated states.

Acceptance:

- `/analytics` resolves.
- Charts never remain blank without explanation.
- Live tenant metrics do not reuse misleading demo values.

Status: Closed locally in Sprint 3 (2026-07-22). `AnalyticsSection.tsx` is a synchronous, Demo-Mode-gated stub (no live OKR/analytics computation engine exists yet, per its own code comment) -- it has no fetch and cannot hang. Outside Demo Mode it already showed an honest "not available yet" empty state instead of fabricated charts. Regression-tested with a render test confirming immediate, non-loading output.

### 12. Fix Integrations Workspace Loading Failure

Severity: P0

Source finding:

```text
F-013
```

Action:

Make integrations reachable so OAuth/provider-gated connector states can be tested.

Acceptance:

- `/integrations` resolves.
- Gmail, Microsoft and other connector entries show real status.
- Missing credentials show provider-gated setup, not a spinner.

Status: Closed locally in Sprint 3 (2026-07-22). `IntegrationsSection.tsx` populates its provider/connector state asynchronously without ever blocking initial render -- it has no page-level loading gate and cannot hang. Fixed a real, repeated defect instead: six call sites (Microsoft mailbox listing, email import, Notion page listing/preview/import, and saving connector credentials) threw `Error(result.error/message ?? fallback)`, which could surface a raw backend string to the user -- notably in the credentials panel, where this is a higher-severity concern since that panel handles provider secrets. All six now log the raw detail to the console and always show fixed, role-aware copy instead.

### 13. Fix Settings, Organization Admin And Audit Logs Loading Failures

Severity: P0

Source finding:

```text
F-014
```

Action:

Resolve admin workspace loading failures, especially Audit Logs because it is core compliance evidence.

Acceptance:

- `/settings` resolves.
- `/admin/organization` resolves.
- `/admin/audit-logs` resolves.
- Permission states are role-aware.

Status: Closed locally in Sprint 3 (2026-07-22). `SettingsSection.tsx` has no page-level loading gate and cannot hang (audited, no fix needed). `OrganizationAdminSection.tsx` and `AuditLogsSection.tsx` both had the same genuine defect: `if (!scope) return;` (or `!scope || !user`) inside their load function skipped resetting the `loading` flag to `false`, so it could stay stuck at its initial `true` value if the load ran before session/scope resolved -- fixed in both, and both now show an explicit "Sign in required" state instead of rendering blank (`return null`) when `user` is unexpectedly absent. Regression-tested in new `OrganizationAdminSection.test.ts` and `AuditLogsSection.test.ts`.

### 14. Gate Dashboard Workflow Timeline Fallback To Demo Mode Only

Severity: P1

Source finding:

```text
F-015
```

Action:

Ensure fabricated or seeded workflow timeline events cannot appear as live tenant data.

Acceptance:

- Clean live tenant shows no fake activity.
- Demo Mode shows seeded timeline with a Demo Environment label.
- Investor Preview remains polished but explicitly identified.

Status: Regression-verified as already closed in Sprint 4 (2026-07-22). `useWorkflowTimeline.ts` and `WorkflowRecordsPage.tsx` already gated their seeded/fallback timeline events behind `isDemoModeEnabled()` prior to this sprint; re-audited this sprint with no regression found. See `docs/SPRINT_LOG.md` Sprint 4 entry.

### 15. Remove Raw Unauthorized Text From User-Facing UI

Severity: P2

Source finding:

```text
F-016
```

Action:

Normalize unauthorized API responses into clear product states.

Acceptance:

- No page renders raw `Unauthorized.`
- User sees sign-in, insufficient-permission or provider-gated copy.
- Error copy is consistent across workspaces.

Status: Closed locally in Sprint 3 (2026-07-22). The confirmed instance -- `AIReviewInboxPage.tsx`'s `loadReviews()` and `decide()` -- surfaced the raw `payload.error` string (e.g. `"Unauthorized."`) verbatim via `setMessage`. Fixed by checking `response.status` explicitly (401 -> sign-in copy, 403 -> permission copy, other failures -> generic retry copy) and logging the raw detail via `console.error` for developer diagnostics instead of showing it. The same anti-pattern (`throw new Error(result.error ?? fallback)` then displaying `error.message`) was found and fixed in two more places in `AIWorkspaceSection.tsx` and six more in `IntegrationsSection.tsx` -- see items 8 and 12 above. Regression-tested in `AIReviewInboxPage.test.ts`, `AIWorkspaceSection.test.ts`, and `IntegrationsSection.test.ts`.

### 16. Gate Workflow Records Fallback To Demo Mode Only

Severity: P1

Source finding:

```text
F-017
```

Action:

Prevent seeded workflow records from appearing in a clean live tenant.

Acceptance:

- Clean live tenant has honest empty workflow records.
- Demo tenant has populated workflow records.
- Badges and records remain consistent.

Status: Regression-verified as already closed in Sprint 4 (2026-07-22). `WorkflowRecordsPage.tsx`'s fallback records are already gated behind `isDemoModeEnabled()`; re-audited this sprint with no regression found. See `docs/SPRINT_LOG.md` Sprint 4 entry.

### 17. Fix Onboarding Progress Inconsistency

Severity: P2

Source finding:

```text
F-018
```

Action:

Investigate why the onboarding widget shifted from `0 of 10` to `2 of 10` without user action.

Acceptance:

- Onboarding progress is deterministic.
- Progress changes only when durable actions occur.
- Dashboard and onboarding views agree.

Status: Closed locally in Sprint 4 (2026-07-22). Root cause was not in the onboarding widget itself: `DashboardSection.tsx` initialized its `projects` state via an unconditional `useState<DashboardProject[]>(() => getDashboardFallbackProjects())` -- 186 fabricated demo projects -- and repeated that same unconditional fallback on any live-fetch failure. `BetaOnboardingChecklist.tsx`'s completion logic (`projectCount > 0 || loaded.first_project`) then permanently marked the "first_project" onboarding step complete for any tenant, live or not, before the real fetch ever resolved. Fixed by gating both the initial state and the failure-path fallback behind `isDemoModeEnabled()`, matching the pattern already used correctly elsewhere in the same file for KPIs. A clean live tenant with zero real projects now deterministically shows the same progress on every load (1 of 10 -- the "organization" step only, from having an `organizationId`) instead of fluctuating. Regression-tested in `src/features/dashboard/DashboardSection.test.ts` and `src/features/onboarding/BetaOnboardingChecklist.test.tsx`.

### 18. Fix `/documents` Route Mapping

Severity: P1

Source finding:

```text
F-019
```

Action:

Ensure `/documents` renders the Documents & Files workspace, not Knowledge Hub.

Acceptance:

- `/documents` and `/knowledge` are distinct routes.
- Each route has a clear product purpose.
- Tests protect against route regression.

Status: Regression-verified as already closed in Sprint 3 (2026-07-22), and re-confirmed in Sprint 4. `lazyRoutes.tsx` maps `documents` to `DocumentsSection` ("Documents & File Intelligence") and `knowledge` to `KnowledgeHubSection` ("Knowledge Hub") as two distinct components with distinct headings and no cross-reference to each other's product name. Added a dedicated regression test this sprint asserting both files carry their own heading and never the other's: `src/app/routing/lazyRoutes.test.ts`.

### 19. Reconcile Sidebar Badge Counts With Live Tenant State

Severity: P2

Source finding:

```text
F-020
```

Action:

Audit badge data sources and ensure navigation counts reflect real tenant state or labeled Demo Mode state.

Acceptance:

- Clean live tenants do not show fabricated counts.
- Demo tenants show coherent seeded counts.
- Badge data matches workspace data.

Status: Closed locally in Sprint 4 (2026-07-22). `navigation.ts`'s `NavItem` type gained a `badgeKind?: "tag" | "count"` discriminator: the "AI" badge on AI Workspace is tagged `"tag"` (a static feature label, not a tenant count, so it renders unconditionally), while the hardcoded "4" (Social Alerts) and "23" (Approvals & Governance) counts are tagged `"count"`. `Sidebar.tsx` now only renders a `"count"`-kind badge when `isDemoModeEnabled()` is true. A clean live tenant sees the AI tag but not the fabricated counts; Demo Mode sees both. Regression-tested in `src/app/layout/Sidebar.test.tsx`.

### 20. Deduplicate Repeated Dashboard API Requests

Severity: P2

Source finding:

```text
F-021
```

Action:

Reduce duplicate fetches for notifications, projects, tasks and documents on Dashboard load.

Acceptance:

- Dashboard does not issue repeated identical requests on first render.
- Fetch logic is cached, memoized or consolidated.
- Auth failures are handled once and surfaced cleanly.

## Release Gate Checklist

The QA remediation should not be considered complete until these checks pass:

- Fresh browser auth test.
- Real login test.
- Logout test.
- Real project creation test.
- Workspace loading-state sweep.
- Demo/live data separation test.
- Documents route distinction test.
- Two-tenant isolation test.
- Audit log evidence test.
- Full local verification suite.
- Live beta replay of the Claude QA golden path.

## Required Verification Commands

```text
pnpm run typecheck
pnpm --dir apps/mobile run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run supabase:verify
pnpm run mobile:store:release-gate
pnpm run mobile:capacitor:store:doctor
```

## Governance Note

This checklist is intentionally derived from the QA artifact rather than from engineering assumptions. It should remain linked to the raw report so reviewers can trace each remediation item back to observed behavior.

## Current Status

```text
Raw QA artifact preserved.
20 actionables extracted.
Actionables 1-20 (Sprints 1-4 scope) closed or regression-verified
locally as of 2026-07-22.
See docs/SPRINT_LOG.md "Sprint 1 Complete", "Sprint 2 Complete",
"Sprint 3 Complete" and "Sprint 4 Complete" entries for implementation
and verification evidence (typecheck, mobile typecheck, lint, 110 test
files / 331 tests, build, supabase:verify, mobile release gates all
passing).
Actionable 20 (dashboard request deduplication, Sprint 5 scope) is the
only actionable not yet addressed.
Live Vercel beta redeploy and QA golden-path replay against the live URL
remain pending for all sprints.
Full Sprint 1 findings ledger and estimated score deltas:
docs/SPRINT_1_CLOSEOUT_2026_07_22.md.
Full cumulative Sprint 1+2 findings ledger, isolated Sprint 2 delta, and
composite Sprint 1+2 delta (all estimated, not live-verified):
docs/SPRINT_2_CLOSEOUT_2026_07_22.md.
Full cumulative Sprint 1+2+3 findings ledger, isolated Sprint 3 delta, and
composite Sprint 1+2+3 delta (all estimated, not live-verified):
docs/SPRINT_3_CLOSEOUT_2026_07_22.md.
Sprint 4 closeout (isolated + composite Sprint 1+2+3+4 delta) is produced
only if/when requested, per this project's established closeout cadence.
```
