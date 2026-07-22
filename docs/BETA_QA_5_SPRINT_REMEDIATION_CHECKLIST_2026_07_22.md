# Beta QA 5-Sprint Remediation Checklist - 2026-07-22

## Purpose

This document converts the 20 Claude Code QA actionables into a five-sprint remediation checklist.

It is intended to guide disciplined execution across engineering, QA, investor-readiness, enterprise-readiness and due-diligence review.

Raw QA artifact:

```text
docs/qa-artifacts/2026-07-22-claude-code-beta-e2e-qa-report.txt
```

Derived actionable list:

```text
docs/BETA_QA_ACTIONABLES_2026_07_22.md
```

## Global Completion Rule

No sprint should be marked complete unless:

- All scoped actionables are implemented or explicitly deferred with rationale.
- TypeScript checks pass.
- Lint checks pass.
- Relevant tests pass.
- Documentation is updated.
- Any provider-gated or environment-gated requirement is documented.
- Remaining risks are recorded.
- The sprint output is traceable to the QA findings it addresses.

## Required Baseline Verification Commands

Use the full suite unless a sprint is intentionally documentation-only:

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

For focused work, run narrower tests during development, but do not use focused tests alone as final completion evidence.

## Sprint 1 - Auth Integrity And Protected Access

### Objective

Eliminate the mock-auth/live-backend mismatch found in the beta QA report.

### QA Actionables Covered

- Real Supabase auth in beta/production
- Working sign out
- Reachable login form
- Protected live workspaces
- Tenant-scoped API session agreement

### Implementation Checklist

- [x] Confirm the production/beta default uses real Supabase-backed auth.
- [x] Ensure mock auth requires explicit local/demo configuration.
- [x] Ensure `/auth` shows the email/password login form with no valid session.
- [x] Ensure logout clears Supabase session state, cookies and local client session state.
- [x] Prevent mock session rehydration after logout.
- [x] Confirm protected routes do not render live workspace screens without a valid server session.
- [x] Confirm client session state and `/api/auth/session` state agree.
- [x] Add graceful unauthenticated states for protected pages.
- [x] Keep Investor Preview/Demo Mode explicit and labeled.

### Tests Required

- [x] Unit test: auth-shell default is production-safe. (`src/config/featureFlags.test.ts`)
- [x] Unit test: explicit local mock setting is honored only when configured. (`src/config/featureFlags.test.ts`)
- [x] Unit test: logout clears local auth state. (`src/auth/AuthProvider.test.tsx`)
- [x] Route/protection test: unauthenticated access is blocked. (`src/middleware.test.ts`)
- [x] Route/protection test: `/auth` renders login when unauthenticated. (`src/app/auth/page.test.tsx`)
- [x] Integration test: server `401` does not render mock-authenticated UI. (`src/auth/AuthProvider.test.tsx`, `src/auth/supabaseAuthClient.test.ts`)

### Lint And Type Checks

- [x] `pnpm run typecheck` -- PASS
- [x] `pnpm run lint` -- PASS (zero warnings)

### Build And Regression Checks

- [x] `pnpm run test` -- PASS (96 test files, 286 tests)
- [x] `pnpm run build` -- PASS (114 routes generated)

### Documentation Required

- [x] Update `docs/AUTH.md`.
- [x] Update `docs/VERCEL_DEPLOYMENT.md`.
- [x] Update `.env.example`.
- [x] Update `CHANGELOG.md`.
- [x] Update `docs/SPRINT_LOG.md`.
- [x] Update beta QA checklist status.

### Diligence Evidence

- [x] Record exact auth environment variables expected in beta/production. `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true`, `NEXT_PUBLIC_AXXESS_DEMO_MODE=false` (see `docs/VERCEL_DEPLOYMENT.md`).
- [x] Record what remains local-only or demo-only. `NEXT_PUBLIC_AXXESS_AUTH_SHELL=false` for local mock-RBAC UI work; investor-preview/demo login (`investor.preview@axxess.demo`, `demo@axxess.local`) for Demo Mode.
- [x] Record whether live Vercel environment variables were verified. **Not verified this pass** -- this was a local repository fix, build and test pass only; live beta redeploy and env var confirmation remain pending (Sprint 5 scope).
- [x] Record whether investor preview login was tested. Exercised via existing code path and demo-mode test coverage only; not manually re-tested against a live deployment this pass.

### Exit Criteria

- [x] Fresh browser does not show mock Organization Admin.
- [x] `/auth` shows login form without cookies/session.
- [x] Logout remains logged out after refresh.
- [x] Protected routes block unauthenticated access.
- [x] Investor Demo Mode remains available only through explicit demo configuration.
- [x] No P0 auth finding remains reproducible locally.

### Completion Statement Template

```text
Sprint 1 is complete when live-mode authentication, logout, login reachability, protected route enforcement and client/server session agreement are implemented, tested, documented and verified.
```

### Sprint 1 Status - 2026-07-22

```text
Complete locally. All implementation checklist items, required tests,
lint/type checks, build/regression checks and documentation updates are
done and verified (see docs/SPRINT_LOG.md "Sprint 1 Complete" entry for
full command-by-command evidence). Live Vercel beta env var verification
and redeploy remain outstanding and are explicitly deferred to Sprint 5's
live beta re-verification step, per repository policy against deploying
this remediation as part of a documentation-and-code-only local pass.
Full findings-by-finding ledger, constraint-compliance checklist and
estimated (not live-verified) QA score deltas: docs/SPRINT_1_CLOSEOUT_2026_07_22.md.
```

## Sprint 2 - Live Tenant Persistence And Golden Path Writes

### Objective

Prove that a real authenticated tenant can create durable records and that the system records evidence of the action.

### QA Actionables Covered

- Project creation persistence
- Tenant-scoped API route audit
- Tenant-scoped API session agreement continuation
- Dashboard/audit/timeline update after writes

### Implementation Checklist

- [ ] Re-test the exact failed project creation path from the QA report.
- [ ] Ensure project creation writes to Supabase for authenticated tenants.
- [ ] Confirm created project appears after refresh.
- [ ] Confirm tenant ID, user ID and role are attached correctly.
- [ ] Confirm task/document/meeting write paths follow the same repository pattern where in scope.
- [ ] Write audit events for successful creates.
- [ ] Write activity timeline events for successful creates.
- [ ] Ensure failed writes show user-facing errors.
- [ ] Confirm unauthenticated writes return controlled auth responses.

### Tests Required

- [ ] Repository test: project create persists tenant-scoped data.
- [ ] API test: unauthenticated project create fails safely.
- [ ] API test: authenticated project create succeeds.
- [ ] Audit test: project create writes audit event.
- [ ] Timeline test: project create writes activity event.
- [ ] Tenant isolation test: tenant A cannot read tenant B project.

### Lint And Type Checks

- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`

### Build And Regression Checks

- [ ] `pnpm run test`
- [ ] `pnpm run build`
- [ ] `pnpm run supabase:verify`

### Documentation Required

- [ ] Update `docs/ARCHITECTURE.md` or equivalent repository-pattern documentation.
- [ ] Update `docs/SUPABASE_CLI.md` if schema/migration behavior changes.
- [ ] Update `docs/AUDIT.md` or audit documentation if present.
- [ ] Update `CHANGELOG.md`.
- [ ] Update `docs/SPRINT_LOG.md`.
- [ ] Update beta QA checklist status.

### Diligence Evidence

- [ ] Record tables/routes touched.
- [ ] Record RLS impact.
- [ ] Record whether migrations were added.
- [ ] Record exact test evidence for persistence and tenant isolation.
- [ ] Record whether live Supabase was tested or only local test fixtures were used.

### Exit Criteria

- [ ] Real authenticated user can create a project.
- [ ] Created project persists after refresh.
- [ ] Audit log records the action.
- [ ] Activity timeline records the action.
- [ ] Cross-tenant access is blocked.
- [ ] No tenant-scoped write path silently fails with `401` while UI claims success.

### Completion Statement Template

```text
Sprint 2 is complete when authenticated tenant-backed writes persist, refresh correctly, produce audit/timeline evidence and pass tenant-isolation tests.
```

## Sprint 3 - Workspace Loading And Error-State Hardening

### Objective

Eliminate indefinite loading states and raw backend errors across core workspaces.

### QA Actionables Covered

- Timeout/error fallbacks
- AI Workspace loading
- Approvals loading
- Stakeholders/CRM loading
- Analytics loading
- Integrations loading
- Settings/Admin/Audit Logs loading
- Removal of raw `Unauthorized`

### Implementation Checklist

- [ ] Inventory all fetch-driven workspace loading states.
- [ ] Add timeout or settled-state handling to data-fetching hooks.
- [ ] Normalize unauthorized responses into sign-in or insufficient-permission UI.
- [ ] Normalize provider-missing responses into provider-gated UI.
- [ ] Normalize empty live tenant responses into clear empty states.
- [ ] Fix AI Workspace loading.
- [ ] Fix Approvals loading and mislabeled loading copy.
- [ ] Fix Stakeholders/CRM loading.
- [ ] Fix Analytics loading.
- [ ] Fix Integrations loading.
- [ ] Fix Settings loading.
- [ ] Fix Organization Admin loading.
- [ ] Fix Audit Logs loading.

### Tests Required

- [ ] Unit test: loading hook resolves timeout state.
- [ ] Unit test: unauthorized response maps to safe UI copy.
- [ ] Route test: AI Workspace does not hang.
- [ ] Route test: Approvals does not hang.
- [ ] Route test: Integrations does not hang.
- [ ] Route test: Audit Logs does not hang.
- [ ] Snapshot or DOM test: raw `Unauthorized.` is not rendered.

### Lint And Type Checks

- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`

### Build And Regression Checks

- [ ] `pnpm run test`
- [ ] `pnpm run build`

### Documentation Required

- [ ] Update workspace-specific docs where behavior changes.
- [ ] Update `docs/AUTH.md` for unauthorized-state behavior.
- [ ] Update integration docs for provider-gated states.
- [ ] Update `CHANGELOG.md`.
- [ ] Update `docs/SPRINT_LOG.md`.
- [ ] Update beta QA checklist status.

### Diligence Evidence

- [ ] Record each workspace tested.
- [ ] Record whether the state is live, empty, demo, permission-blocked or provider-gated.
- [ ] Record known provider credentials not available locally.
- [ ] Record screenshots or textual verification notes for beta replay.

### Exit Criteria

- [ ] No listed workspace hangs indefinitely.
- [ ] No raw `Unauthorized.` appears in user-facing UI.
- [ ] Audit Logs load or show a clear state.
- [ ] AI Workspace resolves to an actionable state.
- [ ] Integrations workspace is reachable for OAuth/provider-gated testing.

### Completion Statement Template

```text
Sprint 3 is complete when every core workspace resolves to live data, empty state, demo state, permission state or provider-gated state without infinite spinners or raw backend errors.
```

## Sprint 4 - Demo/Live Data Separation And Navigation Integrity

### Objective

Make live tenant data honest and Demo Mode polished, explicit and non-confusing.

### QA Actionables Covered

- Demo-only dashboard timeline fallback
- Demo-only workflow records fallback
- Onboarding progress consistency
- `/documents` route mapping
- Sidebar badge count consistency

### Implementation Checklist

- [ ] Gate dashboard workflow timeline fallback to Demo Mode only.
- [ ] Gate workflow records fallback to Demo Mode only.
- [ ] Ensure clean live tenants show honest empty states.
- [ ] Ensure Demo Mode remains populated and clearly labeled.
- [ ] Fix `/documents` route mapping.
- [ ] Confirm `/documents` and `/knowledge` are distinct.
- [ ] Audit sidebar badge data source.
- [ ] Align badge counts with actual tenant state.
- [ ] Fix onboarding progress calculations.
- [ ] Ensure onboarding progress changes only after durable user actions.

### Tests Required

- [ ] Unit test: live mode does not load demo timeline fallback.
- [ ] Unit test: Demo Mode loads seeded timeline fallback.
- [ ] Unit test: live mode does not load demo workflow records.
- [ ] Route test: `/documents` loads Documents workspace.
- [ ] Route test: `/knowledge` loads Knowledge Hub.
- [ ] Unit test: badge counts derive from tenant state.
- [ ] Unit test: onboarding progress is deterministic.

### Lint And Type Checks

- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`

### Build And Regression Checks

- [ ] `pnpm run test`
- [ ] `pnpm run build`

### Documentation Required

- [ ] Update `docs/DEMO_MODE.md`.
- [ ] Update `docs/PRODUCT_ARCHITECTURE.md` or equivalent route/workspace documentation if present.
- [ ] Update `CHANGELOG.md`.
- [ ] Update `docs/SPRINT_LOG.md`.
- [ ] Update beta QA checklist status.

### Diligence Evidence

- [ ] Record live-mode clean tenant behavior.
- [ ] Record Demo Mode behavior.
- [ ] Record investor-preview labeling.
- [ ] Record route distinctions.
- [ ] Record badge-count source of truth.

### Exit Criteria

- [ ] Clean live tenant shows no fabricated timeline or workflow records.
- [ ] Demo Mode shows rich seeded content with a clear Demo Environment badge.
- [ ] `/documents` and `/knowledge` are distinct and tested.
- [ ] Sidebar badges match workspace data.
- [ ] Onboarding progress is stable and action-driven.

### Completion Statement Template

```text
Sprint 4 is complete when live tenant data is honest, demo data is explicitly labeled, navigation routes are correct and badge/onboarding state is internally consistent.
```

## Sprint 5 - QA Replay, Performance And Release Gate

### Objective

Turn the Claude Code QA report into a passing beta release gate.

### QA Actionables Covered

- Duplicate dashboard API request cleanup
- Full golden-path replay
- Two-tenant isolation test
- Live beta verification
- Regression coverage for all 20 actionables

### Implementation Checklist

- [ ] Deduplicate repeated Dashboard API requests.
- [ ] Add request consolidation, memoization or caching where appropriate.
- [ ] Create or update Playwright golden-path coverage.
- [ ] Cover sign-in, tenant setup, project create, audit/timeline verification.
- [ ] Add two-tenant isolation coverage.
- [ ] Add demo/live separation regression coverage.
- [ ] Re-run the Claude QA golden path against local build.
- [ ] Deploy or prepare deployment through provider CLI.
- [ ] Re-run the Claude QA golden path against live beta.
- [ ] Record before/after status for each original QA finding.

### Tests Required

- [ ] Unit test: Dashboard request deduplication.
- [ ] Integration test: Dashboard handles auth failure once.
- [ ] E2E test: sign in and create organization.
- [ ] E2E test: create project and verify persistence.
- [ ] E2E test: audit log updates.
- [ ] E2E test: timeline updates.
- [ ] E2E test: demo/live separation.
- [ ] E2E test: two-tenant isolation.

### Lint And Type Checks

- [ ] `pnpm run typecheck`
- [ ] `pnpm --dir apps/mobile run typecheck`
- [ ] `pnpm run lint`

### Build And Regression Checks

- [ ] `pnpm run test`
- [ ] `pnpm run build`
- [ ] `pnpm run supabase:verify`
- [ ] `pnpm run mobile:store:release-gate`
- [ ] `pnpm run mobile:capacitor:store:doctor`

### Documentation Required

- [ ] Update `README.md`.
- [ ] Update `CHANGELOG.md`.
- [ ] Update `docs/SPRINT_LOG.md`.
- [ ] Update `docs/BETA_QA_ACTIONABLES_2026_07_22.md`.
- [ ] Update `docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`.
- [ ] Add beta replay evidence document.
- [ ] Record deployment provider evidence if live beta is redeployed.

### Diligence Evidence

- [ ] Record commit hash.
- [ ] Record provider deployment ID or URL if deployed.
- [ ] Record test command outputs.
- [ ] Record Supabase schema verification output.
- [ ] Record live beta replay result.
- [ ] Record remaining risks and owner.
- [ ] Record whether GitHub or GitLab was used only as source control, not deployment mediator.

### Exit Criteria

- [ ] All 20 QA actionables are closed or explicitly deferred with rationale.
- [ ] Claude QA golden path passes locally.
- [ ] Claude QA golden path passes against live beta, if provider access is available.
- [ ] Duplicate Dashboard requests are reduced or justified.
- [ ] Full verification suite passes.
- [ ] Documentation is updated for all five review audiences.

### Completion Statement Template

```text
Sprint 5 is complete when the original Claude Code beta QA golden path can be replayed successfully, all 20 actionables are closed or explicitly deferred, the full verification suite passes and the remediation evidence is documented for technical, investor, enterprise, due-diligence and regulated-sector review.
```

## Final Program Completion Criteria

The full five-sprint remediation program is complete only when:

- A real unauthenticated browser sees login instead of mock Organization Admin.
- A real user can sign in, create/select a tenant and create a durable project.
- Every core workspace resolves without indefinite loading.
- Demo data appears only in Demo Mode or Investor Preview.
- Live tenants show honest empty or real data states.
- `/documents` and `/knowledge` are distinct.
- Audit and timeline evidence updates after real actions.
- Tenant isolation has been tested.
- The Claude Code QA golden path has been replayed and documented.
- Full verification passes.
- The repo contains raw QA evidence, derived actionables, sprint checklist, changelog and sprint-log updates.
