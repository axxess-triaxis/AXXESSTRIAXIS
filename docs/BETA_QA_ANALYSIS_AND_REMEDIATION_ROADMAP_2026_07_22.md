# Beta QA Analysis And Remediation Roadmap - 2026-07-22

## Purpose

This document converts the external-style beta QA session into an engineering roadmap and verification checklist.

It is intended for:

- Technical reviewers who need root-cause analysis and implementation scope.
- Investors assessing the maturity of the engineering process.
- Enterprise buyers evaluating whether AXXESS can support a real pilot.
- Investor and technical due diligence reviewers validating evidence and risk.
- Government, public-sector and sovereign stakeholders assessing auditability, tenant isolation and responsible AI controls.

## Context

The QA session tested the AXXESS beta through:

```text
beta.triaxisventures.com
```

The test treated the application as a production-like beta for a real external organization. The expected journey was:

```text
Sign up or log in
Create or select tenant
Upload or import knowledge
Ask AXXESS a grounded question
Review cited answer
Approve an action
Create task, project update or approval
Verify dashboard, audit log and timeline update
```

The journey did not complete.

Raw QA artifact:

```text
docs/qa-artifacts/2026-07-22-claude-code-beta-e2e-qa-report.txt
```

Derived 20-item actionable checklist:

```text
docs/BETA_QA_ACTIONABLES_2026_07_22.md
```

Five-sprint remediation checklist:

```text
docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md
```

## Executive Assessment

The beta had a mature product shell, strong navigation breadth and substantial governance architecture, but it failed at the most important pilot threshold: a real external user could not complete the first meaningful tenant-backed workflow.

The failure pattern was not random. Most symptoms point to one deployment-level mismatch:

```text
Browser UI behaved as though a mock authenticated user existed.
Server-side routes correctly rejected requests because no Supabase session existed.
```

That mismatch created an investor-visible and buyer-visible trust problem:

- The user appeared signed in without credentials.
- Live tenant write actions were visible but failed with `401`.
- Several modules remained in loading states.
- Seeded or fallback records appeared as if they were live tenant evidence.
- The sign-out action did not create a visibly signed-out state.

## Root-Cause Hypothesis

The strongest hypothesis is incorrect deployed auth-shell configuration:

```text
NEXT_PUBLIC_AXXESS_AUTH_SHELL=false or unset in a deployed environment
```

In the current product architecture, mock RBAC mode is useful for local UI development, demo prototyping and offline development. It is not appropriate as the default behavior for a public beta. Public beta should prefer real Supabase-backed authentication and should only enter Demo Mode through an explicit investor-preview route, demo login or demo environment flag.

## Current Local Remediation Status

Sprint 1 (Auth Integrity And Protected Access) is complete locally as of 2026-07-22:

- Real Supabase-backed auth shell is now the safe default in both the client feature flag (`src/config/featureFlags.ts`) and the edge route guard (`src/middleware.ts`). The middleware previously used a stale check that left protected routes unguarded at the edge on a deployment with the env var unset -- this was the last concrete gap and is now fixed.
- Mock RBAC auth now requires an explicit local opt-out (`NEXT_PUBLIC_AXXESS_AUTH_SHELL=false`).
- Demo workflow timeline fallback is gated to Demo Mode.
- Demo workflow records are gated to Demo Mode.
- `/documents` now routes to the Documents workspace instead of Knowledge Hub.
- Sign-out clears server-side cookies and client session state, and does not rehydrate a mock/demo session (verified by regression test).
- `/auth` renders the real login form for a fresh, unauthenticated browser (verified by regression test).
- Protected routes are blocked at the edge for unauthenticated requests, with a client-side "Sign in required" fallback as a second layer.
- Tenant-scoped API routes were audited and confirmed to return `401` before constructing any tenant scope when no session exists.
- Auth and Vercel deployment documentation were updated to record the production invariant and the new safe-default behavior.

Full verification passed: `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint` (zero warnings), `pnpm run test` (96 files / 286 tests), `pnpm run build` (114 routes), `pnpm run supabase:verify`, `pnpm run mobile:store:release-gate`, and `pnpm run mobile:capacitor:store:doctor` all passed. See `docs/SPRINT_LOG.md` for the full command-by-command evidence.

**Not yet done:** live Vercel beta environment variables have not been verified or redeployed, and the QA golden path has not been re-run against `beta.triaxisventures.com`. This was a local repository fix, build and test pass only -- live redeploy and QA replay remain pending (Sprint 5 scope in the five-sprint checklist).

Sprint 2 (Live Tenant Persistence And Golden Path Writes) is complete locally as of 2026-07-22:

- Audited the full repository/API/RLS stack behind `POST /api/repositories/projects` -- the exact QA repro's failing route. Found that project creation already wrote real Supabase-backed rows (not local state), already survived refresh, already returned `401` safely when unauthenticated, and already ignored a client-spoofed `organizationId` for non-Super-Admin roles (both in application code and independently via the `projects` table's RLS policies). None of this needed to change.
- The one real gap: project creation never wrote audit or workflow-timeline evidence. Added `recordProjectCreateEvidence` to `src/app/api/repositories/[resource]/route.ts`, reusing the exact same `auditLogsRepository.record` / `recordWorkflowTimelineEvent` pattern already used elsewhere (AI-review-approved actions) -- no new architecture introduced.
- Added repository-level tests proving cross-tenant write isolation (a spoofed `organizationId` is ignored for a normal tenant scope, honored only for Super Admin) and API-route-level tests proving the audit/timeline evidence wiring, unauthenticated failure, and response-shape consistency.

Full verification passed: `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint` (zero warnings), `pnpm run test` (98 files / 299 tests), `pnpm run build`, and `pnpm run supabase:verify` all passed (same 27 migrations / 100 RLS-protected tables as before -- no schema change this sprint). See `docs/SPRINT_LOG.md` for full command-by-command evidence.

**Not yet done:** no live Supabase project was used to create a real project this pass -- verification is local/test-fixture only (mocked-fetch unit tests plus a code-path audit). Live re-test of the exact QA repro against a real Supabase-backed tenant, and two-tenant isolation testing with two actually-provisioned tenants, remain pending (Sprint 5 scope).

Sprint 3 (Workspace Loading And Error-State Hardening) is complete locally as of 2026-07-22:

- Audited all 9 named workspaces (AI Workspace, AI Review Inbox, Approvals, Stakeholders/CRM, Analytics, Integrations, Settings, Organization Admin, Audit Logs) plus Dashboard's 4 dependent data hooks against the *current* local codebase. Central finding: 7 of 9 do not have a mount-time async gate capable of hanging at all -- three (Approvals, Stakeholders, Analytics) are synchronous, Demo-Mode-gated stubs with no fetch; four (AI Workspace, Integrations, Settings, AI Review Inbox) populate state asynchronously without ever blocking initial render.
- Fixed a genuine, narrow defect in the remaining two (Organization Admin, Audit Logs): an early `if (!scope) return;` skipped resetting their `loading` flag to `false`, so it could stay stuck at `true` if it ran before session/scope resolved. Also replaced a blank `return null` for an absent user with an explicit "Sign in required" state in both.
- Found and fixed the actual root cause of the QA report's exact "Loading Executive Dashboard" mislabel on Approvals: `src/app/routing/routes.ts` had no `appRoutes` entry at all for `"approvals"`, so route lookups silently fell back to the Dashboard route's metadata (including its label). This was a routing bug, not a component bug, and had gone completely untested before this sprint.
- Found and fixed 9 raw-backend-error-text leaks across `AIReviewInboxPage.tsx` (2, the confirmed F-016 instance), `AIWorkspaceSection.tsx` (2), and `IntegrationsSection.tsx` (6, including the connector-credentials panel) -- all followed the same `throw new Error(result.error ?? fallback)` then `setMessage(error.message)` anti-pattern, which could surface a raw string like `"Unauthorized."` to the user. All now log the raw detail to the console and show fixed, role-aware copy instead.

Full verification passed: `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint` (zero warnings), `pnpm run test` (108 files / 324 tests), `pnpm run build`, `pnpm run supabase:verify`, `pnpm run mobile:store:release-gate`, and `pnpm run mobile:capacitor:store:doctor` all passed (same 27 migrations / 100 RLS-protected tables -- no schema change this sprint). See `docs/SPRINT_LOG.md` for full command-by-command evidence.

**Not yet done:** no live provider credentials (Gmail, Microsoft, Notion, enterprise connectors) are configured in this local environment, so provider-gated states were confirmed by code audit, not live connector testing. No live beta replay was performed. Both remain Sprint 5 scope.

## Severity Model

### P0 - Blocks Real Pilot Use

- Real login cannot be reached reliably.
- Sign-out does not produce an unauthenticated state.
- Tenant-backed reads and writes fail with `401`.
- A new tenant cannot complete the golden path.

### P1 - Blocks Investor Confidence

- Dashboard and workspace modules show indefinite loading states.
- Raw technical error copy is visible to users.
- Demo or fallback data can appear as live tenant evidence.
- AI Workspace does not reliably resolve to an actionable state.

### P2 - Blocks Enterprise Readiness

- Loading-state handling is inconsistent across workspaces.
- Unauthorized states are not normalized.
- Tenant isolation still needs live two-tenant verification after auth is corrected.
- OAuth and connector paths need re-testing with real sessions.

## Roadmap

### Phase 1 - Beta Access Integrity

Goal: No investor, buyer or pilot user should see a fake authenticated live session.

Checklist:

- Confirm deployed Vercel beta has `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true`.
- Confirm deployed beta has `NEXT_PUBLIC_AXXESS_DEMO_MODE=false` unless intentionally running investor preview.
- Confirm unauthenticated `/auth` shows login form.
- Confirm unauthenticated `/dashboard` routes to sign-in or a protected-route state.
- Confirm Sign Out clears the user-visible session.
- Confirm investor preview enters an explicitly labeled Demo Environment.

### Phase 2 - Live Tenant Golden Path

Goal: A new pilot organization can complete one tenant-backed workflow without developer help.

Checklist:

- Create a real Supabase Auth user.
- Create an organization.
- Assign role and department.
- Upload or import one document.
- Ask a grounded question.
- Show citations.
- Submit the answer for human review.
- Approve an action.
- Create one task, approval request or project update.
- Verify dashboard metrics update.
- Verify activity timeline update.
- Verify audit event creation.

### Phase 3 - Workspace Loading-State Hardening

Goal: Every workspace resolves to live data, a governed demo state, an honest empty state or a provider-gated state.

Checklist:

- Executive Dashboard
- AI Workspace
- AI Review Inbox
- Documents
- Knowledge Hub
- Projects and Programs
- Approvals and Governance
- Stakeholders and CRM
- Audit Logs
- Organization Admin
- Integrations
- Analytics

For each workspace:

- No indefinite spinner.
- No raw `Unauthorized` text.
- No seeded fallback in live tenant mode.
- Permission-aware disabled states.
- Clear next action for the user.

### Phase 4 - Tenant Isolation And Governance Verification

Goal: AXXESS proves that data, AI retrieval and workflow actions stay inside tenant and role boundaries.

Checklist:

- Create two tenants.
- Create users with different roles.
- Upload tenant-specific documents.
- Verify cross-tenant document retrieval is impossible.
- Verify role-restricted documents are not retrieved by unauthorized roles.
- Verify AI answers cite only authorized sources.
- Verify rejected AI output does not create tasks or approvals.
- Verify approved AI output writes audit evidence.
- Verify audit logs are tenant-scoped.

### Phase 5 - Investor And Enterprise Evidence Pack

Goal: Package the beta remediation as a due-diligence artifact.

Checklist:

- Update README beta status.
- Update CHANGELOG.
- Update `docs/SPRINT_LOG.md`.
- Attach verification commands and outcomes.
- Capture beta screenshots after redeploy.
- Record environment-variable requirements.
- Record provider-gated limitations.
- Record remaining risks and Sprint follow-up.

## Verification Checklist Before Calling Beta Usable

Local verification:

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

Remote verification:

- Vercel beta redeploy completes.
- Cold browser test shows no mock authenticated user.
- Investor preview shows a visible but subtle Demo Environment badge.
- Live tenant workflow creates durable Supabase-backed records.
- Audit log records the workflow.
- QA replay confirms the original P0 findings are closed.

## Definition Of Done

This QA remediation is complete only when:

- The local remediation branch is fully verified.
- The changes are committed and pushed.
- The beta deployment is updated.
- The QA golden path is re-run against the live URL.
- The live beta no longer shows the mock-auth/server-401 mismatch.
- Clean tenants do not show demo records.
- Demo Mode remains available and explicitly labeled for investor preview.
- Documentation records evidence, limitations and remaining risks.

## Current Status

```text
QA analysis documented.
Canonical workspace migration completed.
Sprint 1 (Phase 1 - Beta Access Integrity) complete locally: implemented,
tested, documented and fully verified on 2026-07-22.
Sprint 2 (Phase 2 - Live Tenant Golden Path, persistence/audit/timeline
subset) complete locally: implemented, tested, documented and fully
verified on 2026-07-22.
Sprint 3 (Phase 3 - Workspace Loading-State Hardening) complete locally:
implemented, tested, documented and fully verified on 2026-07-22.
Sprints 4-5 (Phases 4-5) remain pending.
Live Vercel beta redeploy and live beta re-test remain pending for all
sprints.
Cumulative Sprint 1+2 findings ledger, isolated Sprint 2 delta, and
composite Sprint 1+2 delta (all estimated, not live-verified):
docs/SPRINT_2_CLOSEOUT_2026_07_22.md.
Full findings ledger and estimated (not live-verified) score deltas:
docs/SPRINT_1_CLOSEOUT_2026_07_22.md.
```
