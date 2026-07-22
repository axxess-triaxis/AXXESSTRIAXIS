# Beta End-to-End QA Report - 2026-07-22

## Purpose

This document records one complete external-style walkthrough of the live AXXESS beta and the immediate remediation actions taken in response.

The QA pass was performed as a combined:

- Senior QA engineer review
- Enterprise product review
- Pilot customer-success walkthrough
- Investor-demo readiness check
- Technical due diligence input

The tested beta URL was:

```text
beta.triaxisventures.com
```

The report described the environment as production-like and reached the app through the marketing site's beta workspace link.

## Executive Summary

The QA pass found that the beta deployment was not usable by a real tenant at the time of testing. The UI, information architecture and enterprise product framing were strong, but the deployment behaved as though it had a browser-side mock authenticated user while the server correctly rejected tenant-scoped API calls with `401`.

The most likely root cause identified by QA was deployment auth configuration:

```text
NEXT_PUBLIC_AXXESS_AUTH_SHELL=false or unset in a deployed environment
```

That state allowed the browser to render a mock Organization Admin session while protected server routes found no Supabase session.

This was assessed as one root cause with many symptoms:

- No real login form was reachable.
- Sign out immediately recreated the same mock session.
- Tenant-scoped writes failed with `401`.
- Several workspaces stayed in unresolved loading states.
- Some live-labeled surfaces showed seeded/fallback records in a supposedly clean tenant.

## Readiness Scores From QA

```text
Beta readiness: 22/100
Enterprise readiness: 48/100
Investor demo readiness: 35/100
Pilot customer readiness: 12/100
```

## Golden Path Result

The QA pass concluded that the pilot golden path could not complete.

Target path:

```text
Sign up or log in -> create/select tenant -> upload/import knowledge -> ask AXXESS -> review cited answer -> approve action -> create task/project/approval -> verify dashboard, audit log and workflow timeline update
```

Observed result:

- Real login was not reachable.
- Real tenant selection/onboarding was bypassed.
- AI Workspace did not complete loading.
- Project creation failed with `401`.
- Logout did not terminate the browser-visible session.

## Highest Severity Findings

### F-001 - No Real Authentication Exists In The Tested Deployment

The browser showed a signed-in Organization Admin state without credentials, cookies or local storage.

Expected behavior:

- Deployed beta should require a real Supabase-backed session unless Demo Mode is explicitly enabled.

Remediation in this pass:

- `src/config/featureFlags.ts` now enables auth shell by default.
- Local mock auth now requires explicit `NEXT_PUBLIC_AXXESS_AUTH_SHELL=false`.
- `.env.example`, `docs/AUTH.md` and `docs/VERCEL_DEPLOYMENT.md` now document this production invariant.
- `src/config/featureFlags.test.ts` covers the default and explicit-local-mock behavior.

### F-002 and F-003 - Sign Out And Login Form Were Broken By Mock Rehydration

The QA pass found that `/auth` displayed "Signed in" instead of the login form, and Sign Out recreated the same mock session.

Expected behavior:

- Live beta should wait for `/api/auth/session`.
- A `401` from `/api/auth/session` should show an unauthenticated state and allow sign-in.

Remediation in this pass:

- Covered by the same auth-shell default change. The browser no longer creates mock auth unless explicitly configured for local mock development or Demo Mode.

### F-004 and F-005 - Tenant Writes And Reads Failed With `401`

The QA pass attempted to create a project and observed:

```text
POST /api/repositories/projects -> 401
```

Expected behavior:

- Unauthenticated users should not reach live tenant write forms.
- Authenticated users should write through tenant-scoped repository routes.

Remediation in this pass:

- Client-side mock auth is no longer the default deployment state, so unauthenticated visitors are directed to sign in instead of seeing write-capable UI that cannot persist.

### F-006 Through F-014 - Permanent Loading States

Nine workspaces reportedly stayed on indefinite loading states.

Expected behavior:

- Every workspace should resolve to live data, an honest empty state, a provider-gated state or a user-appropriate error.

Remediation in this pass:

- The root mock-session/server-401 mismatch was fixed at the auth-shell level.
- Additional timeout/error-boundary hardening remains recommended for a follow-up sprint because the QA evidence shows several surfaces still need defensive rendering even after auth configuration is corrected.

### F-015 and F-017 - Demo/Fallback Records Appeared As Live Records

The QA pass found seeded-looking workflow timeline and workflow record content appearing in a clean live tenant.

Expected behavior:

- Seeded institutional records should appear only in Demo Mode or explicit Investor Preview.
- Clean live tenants should show empty-state guidance.

Remediation in this pass:

- `src/hooks/useWorkflowTimeline.ts` now returns fallback workflow timeline events only when Demo Mode is enabled.
- `src/features/workflow-records/WorkflowRecordsPage.tsx` now returns empty workflow records for unauthenticated live mode instead of demo records.
- `src/hooks/useWorkflowTimeline.test.ts` and `src/features/workflow-records/WorkflowRecordsPage.test.ts` cover the demo-only fallback behavior.

### F-016 - Raw Unauthorized Text

The QA pass observed literal "Unauthorized." copy in the AI Review Inbox.

Expected behavior:

- Auth failures should render user-appropriate empty or sign-in states, not raw server strings.

Status:

- The auth-shell default fix prevents the most likely live-beta route into this state.
- A follow-up UI hardening task should still normalize unauthorized errors across all fetch-driven surfaces.

### F-019 - `/documents` Rendered Knowledge Hub

The QA pass reported that `/documents` rendered the same content as `/knowledge`.

Remediation in this pass:

- Confirmed in `src/app/routing/lazyRoutes.tsx`.
- `documents` now lazy-loads `../../features/documents/DocumentsSection`.
- `knowledge` remains mapped to `../../features/knowledge-hub/KnowledgeHubSection`.
- `src/app/routing/lazyRoutes.test.ts` covers the route/component distinction.

## Remediation Summary

This pass intentionally focused on the highest-leverage root cause and the most misleading live/demo data leakage.

Code changes:

- Made Supabase-backed auth shell the safe default.
- Required explicit local opt-out for mock-RBAC auth.
- Prevented workflow timeline demo fallback from rendering in live mode.
- Prevented workflow record demo fallback from rendering for unauthenticated live users.
- Fixed `/documents` so it renders the dedicated Documents workspace rather than Knowledge Hub.
- Added focused tests for auth-shell default behavior and demo-only fallback behavior.

Documentation changes:

- Added this QA report.
- Updated auth and Vercel deployment docs.
- Updated changelog and sprint log.

## Verification Required After Deployment

After deploying this remediation, rerun the exact QA walkthrough against:

```text
beta.triaxisventures.com
```

Minimum acceptance checks:

- Cold `/auth` shows a login form when no cookies exist.
- `investor.preview@axxess.demo` / `preview` enters labeled Demo Mode.
- Sign Out exits the current session unless Demo Mode is forced by environment.
- Unauthenticated `/dashboard` shows sign-in required rather than mock Organization Admin.
- A real authenticated Supabase user can create one tenant-backed project or task.
- AI Workspace resolves to a real, demo, provider-gated or empty state.
- Workflow timeline is empty for a clean live tenant.
- Workflow Records is empty for a clean live tenant.
- Audit Logs and Organization Admin resolve without indefinite loading.
- `/documents` and `/knowledge` show intentionally distinct routes or documented shared behavior.

## Remaining Risks

- This pass did not interact with the live Vercel environment variables directly.
- This pass did not create a real Supabase beta user or validate production cookies remotely.
- Several loading-state surfaces still need defensive timeout/error rendering.
- `/documents` route mapping was corrected locally and still needs deployed visual re-test.
- Tenant isolation needs a two-tenant live re-test after real sessions are confirmed.
- OAuth integrations need re-testing after auth is confirmed.

## Recommended Next Work

Recommended next sprint:

```text
Sprint 33 - Beta Auth Remediation, Live Tenant QA Re-Test And Loading-State Hardening
```

Scope:

- Confirm Vercel production/beta env vars.
- Re-run the external QA path with screenshots.
- Add timeout/error fallback to every fetch-driven workspace.
- Normalize unauthorized error copy.
- Re-test `/documents` and `/knowledge` after deployment to confirm distinct visual behavior.
- Re-test one real tenant write path.
- Re-test AI Workspace, Review Inbox, Audit Logs, Integrations and Organization Admin after auth is corrected.

## Status

```text
QA report documented.
Root auth-shell default remediated in code.
Demo/live workflow fallback leakage remediated in code.
Remote beta environment still requires redeploy and re-test.
```
