# Sprint Checklists to QA3

Date created: 2026-07-23  
Closure standard: 80% confidence minimum for every `Yes`

## Global Sprint Closure Checklist

Every sprint must satisfy this checklist. Status below is as of Sprint 4 (2026-07-24).

| Item | Status | Confidence | Evidence |
|---|---|---:|---|
| Target actionables reviewed | Yes | 100% | 6 targeted actionables reviewed; see `ACTIONABLES_READINESS_MATRIX.md` Sprint 4 Update |
| Required implementation completed or blocker documented | Yes | 92% | Real analytics instrumentation gaps closed (6 previously-undispatched events wired, 1 new event added); a real demo-data-leak in the workflow timeline fallback found and fixed; a badge-overclaim defect across 3 components found and fixed; every remaining item is a named, owned `Blocked` (HITL live session, or external OAuth credential provisioning), not a missing implementation |
| Typecheck run | Yes | 100% | `pnpm run typecheck` clean |
| Lint run | Yes | 100% | `pnpm run lint` clean, zero warnings |
| Tests run | Yes | 100% | See `SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT_2026_07_24.md` for the exact file/test counts |
| Build run | Yes | 100% | `pnpm run build` succeeded |
| Live or local verification evidence captured | Yes | 80% | Analytics dispatch proven by direct source inspection of shipped code (not assumed); OAuth credential absence confirmed via `npx vercel env ls`, not assumed; live authenticated dashboard/golden-path verification remains explicitly named as HITL-blocked, not silently skipped |
| Actionables document updated | Yes | 100% | `ACTIONABLES_READINESS_MATRIX.md` |
| Roadmap document updated | Yes | 100% | `FIVE_SPRINT_ROADMAP_TO_QA3.md` |
| Checklist document updated | Yes | 100% | This document |
| Kanban document updated | Yes | 100% | `QA3_READINESS_KANBAN.md` |
| Sprint closeout document created | Yes | 100% | `SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT_2026_07_24.md` |
| HITL review requested | Yes | 100% | See closeout's "HITL Decision Required" section |

## Sprint 1 Checklist: Tenant 0 Production Activation

| Item | Required Evidence | Status | Confidence |
|---|---|---|---:|
| Production URL reflects latest code | Deployment log and commit hash | Yes | 95% |
| Signup works | Screenshot/log of account creation | Yes (account created) / No (no visible success state) | 70% |
| Login works | Authenticated session screenshot | Yes | 95% |
| Logout works | Session-cleared proof | Yes | 95% |
| Password reset works | Reset email and completion proof | Blocked (HITL) | 65% (code) |
| Triaxis tenant exists | Tenant record and UI proof | Yes | 95% |
| Admin user profile exists | Profile screenshot or DB evidence | No | 55% |
| Role assignment works | Admin/manager/employee role proof | Yes | 90% |
| Protected routes work | Unauthorized access safely redirected/blocked | Yes | 95% |
| Sprint 1 closeout exists | Closeout document path | Yes | 100% |

### Sprint 1 Checklist Update (2026-07-24, Post-HITL-Walkthrough)

- **Signup**: account creation itself succeeded (confirmed via a working Supabase confirmation email and a subsequent successful sign-in), but the "Create account" button produced no visible confirmation -- this is now a confirmed defect (not just untested), needing an engineering fix and re-test.
- **Login, Logout, Triaxis tenant exists, Role assignment**: all live-verified working in the HITL's walkthrough. Tenant 0 provisioning succeeded for the first time in this program's history.
- **Admin user profile exists**: profile persistence is confirmed real by code audit, but the top-right avatar/profile menu does not navigate anywhere in the live workspace -- the separate sidebar Settings entry was not tested this walkthrough, so this remains open, not closed.
- Full narrative: `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, "Attempt 4 Log (2026-07-24)".

## Sprint 2 Checklist: Live Golden Path Execution

| Item | Required Evidence | Status | Confidence |
|---|---|---|---:|
| Document upload works | Uploaded file visible in tenant | Yes | 90% |
| Document indexing works | Search/RAG availability proof | Blocked (HITL) | 70% (code; Documents & Files path, not Knowledge Hub -- see `docs/DOCUMENTS.md`) |
| RAG answer works | Question, answer, citations | Blocked (HITL) | 75% (code) |
| Sources are displayed | Source card/screenshot | Blocked (HITL) | 75% (code) |
| Review Inbox receives answer | Review item visible | Blocked (HITL) | 75% (code; bridge fix this sprint, unit-tested) |
| Reviewer can approve/reject/edit | Review decision proof | Blocked (HITL) | 75% (code) |
| Approved answer creates work | Created task/project/approval/stakeholder note | Blocked (HITL) | 80% (code) |
| Dashboard updates | Before/after screenshot | Blocked (HITL) | 65% (code) |
| Audit log updates | Audit event proof | Blocked (HITL) | 85% (code) |
| Timeline updates | Timeline proof | Blocked (HITL) | 80% (code; new `ai_answer_generated` event added this sprint) |
| Sprint 2 closeout exists | Closeout document path | Yes | 100% |

### Sprint 2 Checklist Update (2026-07-24)

- **Core finding**: two independently complete AI-review pipelines existed with no bridge between them -- `ai_output_audit` (written by the AI Workspace's own chat) and `ai_operation_reviews` (read by the dedicated Review Inbox page). Fixed with one minimal insert; every downstream step (approve, create task, timeline, audit) was already fully built and is now reachable.
- **Document upload works**: closed, unchanged from the Sprint 1 continuation (Knowledge Hub, 7 files).
- **Everything else**: code-complete, unit-tested, deployed -- but not live-verified, since that requires a real authenticated session only the HITL can provide. Full narrative: `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24.md`.

## Sprint 3 Checklist: Two-Tenant Isolation and Permission Proof

| Item | Required Evidence | Status | Confidence |
|---|---|---|---:|
| Tenant A created | Tenant record/UI proof | Yes | 95% (Triaxis Ventures, live since Sprint 1) |
| Tenant B created | Tenant record/UI proof | Blocked (HITL) | 0% -- no second real tenant exists; Claude Code cannot create accounts |
| Tenant A cannot see Tenant B projects | UI and query proof | Blocked (HITL/environment) | 70% (code + static RLS review; no live/harness run) |
| Tenant A cannot retrieve Tenant B documents | RAG permission test | Blocked (HITL) | 80% (code; `governedRag.test.ts` cross-tenant + restricted-role coverage) |
| User invite works | Invite email/link proof | Blocked (HITL) | 75% (code; tenant-binding and identity-binding gaps fixed this sprint) |
| Role-specific access works | Admin/manager/employee/guest proof | Yes | 92% (RBAC gates confirmed across `[resource]/route.ts`, `governedRag.ts` restricted-role exclusion) |
| Unauthorized access shows safe copy | No raw Unauthorized errors | Yes | 90% (confirmed unchanged from Sprint 1/2; no new raw-error paths introduced) |
| Isolation harness passes | Script/test output | Blocked (environment) | 0% -- `scripts/verify-two-tenant-isolation.mjs` requires Docker or a non-production Supabase project, neither available in this environment; must never target the live production project |
| Audit logs include tenant/user/action | Audit evidence | Yes | 88% (invitation created/accepted already audited; role/department/status change audit log added this sprint) |
| Sprint 3 closeout exists | Closeout document path | Yes | 100% |

### Sprint 3 Checklist Update (2026-07-24)

- **Core finding**: a real defense-in-depth cross-tenant authorization gap, not a missing feature -- "Super Admin" is a self-selectable role at onboarding, but several app-layer functions (`canManageOrganization`, `organizationIdForMutation`, `scopeOrganizationId`, `betaFeedbackMutation`, `invitationsRepository.create`) trusted it as a cross-tenant authority, letting a self-granted Super Admin name an arbitrary organization id in a request. Confirmed **not exploitable against the live database** by directly reading the actual RLS policies for every affected table (`is_org_member`/`has_any_role`, both scoped to real per-organization membership rows) -- but a genuine landmine and a documented violation of `docs/SECURITY_ARCHITECTURE.md`'s own operational rule. Fixed at the application layer; a pre-existing test had asserted the vulnerable behavior directly and was flipped to assert the fix.
- **Two more concrete gaps fixed**: invitation acceptance never checked the accepting user's email against the invited email (bearer-token-only trust); `PATCH /api/repositories/users` never wrote an audit log for role/department/status changes.
- **Tenant B, the isolation harness, and full UI isolation remain unproven live**: this sprint could not create a second real tenant (account creation is outside Claude Code's own operating constraints) or run `scripts/verify-two-tenant-isolation.mjs` (no Docker, no non-production Supabase project available, and the live production project now holds real Tenant 0 data and must never be its target). Full narrative: `docs/readiness/SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md`.

## Sprint 4 Checklist: Integrations, Analytics, and Operational Evidence

| Item | Required Evidence | Status | Confidence |
|---|---|---|---:|
| Dashboard duplicate requests removed | Network/log proof | Blocked (HITL, live auth confirmation) | 85% (code + regression test) |
| Gmail OAuth app status documented | Provider config proof or blocker | Blocked (external credential provisioning) | 75% (code complete, credentials absent from production) |
| Microsoft OAuth app status documented | Provider config proof or blocker | Blocked (external credential provisioning) | 75% (code complete, credentials absent from production) |
| Selected-message import path verified or blocked | UI/API evidence | Yes | 85% (real, session-checked, credential-independent -- `src/app/api/connectors/email/import/route.ts`) |
| Mixpanel captures core events | Live event proof | Blocked (no `NEXT_PUBLIC_MIXPANEL_TOKEN` in production; falls back to Mock provider by design) | 80% (provider implementation tested, `analytics.test.ts`) |
| PostHog captures core events | Live event proof | Blocked (no `NEXT_PUBLIC_POSTHOG_KEY` in production; falls back to Mock provider by design) | 80% (provider implementation tested, `analytics.test.ts`) |
| At least 15 required events documented | Event taxonomy | Yes | 85% (18 categories dispatch-proven, `eventTaxonomy.test.ts`) |
| Audit export includes workflow events | Export proof | Yes | 85% (`src/app/api/audit-exports/route.ts`, tenant-scoped, real) |
| Timeline evidence extends beyond projects | Documents/tasks/approvals proof | Yes | 85% (`recordResourceCreateEvidence` covers projects/tasks/documents/knowledge_articles/meetings; RAG/review/role-change events also confirmed) |
| QA3 evidence folder prepared | Artifact index | Yes | 90% (`docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md`) |
| Sprint 4 closeout exists | Closeout document path | Yes | 100% |

### Sprint 4 Checklist Update (2026-07-24)

- **Core finding**: analytics instrumentation had the same "declared but never exercised" gap this program keeps finding elsewhere -- 6 of the 20 required event categories were valid `AnalyticsEventName` type entries with zero real dispatch call sites anywhere in the app. Closed with real instrumentation, proven by a dedicated dispatch-proof test suite rather than trusted from the type declaration alone.
- **Mixpanel/PostHog specifically**: both provider implementations are real and tested (`MixpanelAnalyticsProvider`, `PostHogAnalyticsProvider`, `analytics.test.ts`), but neither has a live project token configured in the production Vercel environment -- the app correctly falls back to `MockAnalyticsProvider` (a safe no-op) rather than crashing or silently dropping events. This is truthful, intentional graceful degradation per `docs/PRIVACY_ANALYTICS.md`'s own design, not a defect -- but it means no live third-party event has actually been observed by either provider yet, hence `Blocked` rather than `Yes`.
- **Gmail/Microsoft**: the connector OAuth implementation itself is complete and tested; the blocker is purely the 7 missing production environment variables, confirmed absent via `npx vercel env ls`, not a code gap.
- **Two real, previously-undetected defects found and fixed this sprint** (same pattern as Sprint 3's tenant-authorization finding and the original Sprint 5's Social Alerts finding): the workflow timeline's empty-tenant fallback was fabricating events for genuinely empty real tenants; three components showed an unconditional "Investor Preview" banner to every tenant, live or demo. Full narrative: `docs/readiness/SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT_2026_07_24.md`.

## Sprint 5 Checklist: QA3 Closure, Non-HITL Delta Maximization, and Release-Gate Preparation

| Item | Required Evidence | Status | Confidence |
|---|---|---|---:|
| Android signed build generated | AAB/APK artifact or exact blocker | Blocked (D-U-N-S/company credential dependency; every non-credentialed engineering check verified) | 65% (code + engineering checks verified) |
| Android release notes/checklist updated | Store-readiness doc | Yes | 90% (`mobile:store:release-gate` and `mobile:capacitor:store:doctor` both pass) |
| iOS credential status verified | ASC/App Store evidence or blocker | Blocked (D-U-N-S/company credential dependency, plus no macOS/Xcode toolchain in this environment at all) | 30% (code; also blocked on build infrastructure) |
| iOS build attempted or blocked with evidence | CI/App Store log | Blocked (see `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md`, Sprint 5 engineering-side validation section) | 30% (code) |
| Mobile analytics plan documented | Event taxonomy | Yes | 85% (unchanged from Sprint 4, `docs/ANALYTICS_EVENTS.md`) |
| AI Review Inbox role/ownership gap fixed | Test evidence | Yes | 95% (`canViewAiReview`/`canDecideAiReview`, mirrors real RLS, `reviewInbox.test.ts` + `route.test.ts`) |
| Demo/live fallback audit completed across core modules | Audit narrative | Yes | 95% (16/16 modules checked across this program's history; 5 remaining checked clean this sprint) |
| Stakeholders/CRM scope resolved | Minimally live or honestly deferred | Yes | 90% (Option A -- wired end to end: repository, route, service-provider tiers, UI; `supabaseEnterpriseRepositories.test.ts` + `StakeholdersSection.test.tsx`) |
| Department/Workspace scope resolved | Minimally live or honestly deferred | Yes | 95% (Option B -- honest relabel from a false "Ready" claim to "Not built"; `OrganizationAdminSection.test.ts`) |
| QA3 manual walkthrough script exists | Script file | Yes | 100% (`docs/qa-artifacts/QA3_READINESS_2026_07_24/QA3_MANUAL_WALKTHROUGH_SCRIPT.md`, 21 sections) |
| Production deployment is current | Commit/deploy hash | Yes | 95% (see Sprint 5 closeout for exact commit/deployment ID) |
| QA3 artifact folder complete | Evidence index | Yes | 95% (`docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md`, updated this sprint) |
| All actionables reviewed | A-01 to A-25 updated | Yes | 100% |
| Roadmap updated | Sprint 5 closeout | Yes | 100% |
| Checklist updated | Checklist status table | Yes | 100% |
| Kanban updated | Board/status log | Yes | 100% |
| Sprint 5 closeout exists | Closeout document path | Yes | 100% (`docs/readiness/SPRINT_5_QA3_CLOSURE_NON_HITL_DELTA_CLOSEOUT_2026_07_24.md`) |

### Sprint 5 Checklist Update (2026-07-24)

- **Scope note**: this sprint executed under the newer, more comprehensive Sprint 5 prompt (`docs/readiness/CLAUDE_CODE_SPRINT_5_PROMPT_QA3_NON_HITL_DELTA_2026_07_24.md`, "QA3 Closure, Non-HITL Delta Maximization and Release-Gate Preparation"), which supersedes this table's original mobile-only scope while still covering every item in it.
- **Real security fix**: `GET /api/ai/reviews` previously returned every review in the tenant to any authenticated member; now filtered to creator/reviewer/admin, mirroring the real `ai_operation_reviews` RLS policies rather than an invented rule.
- **Real dashboard-metrics bug fix (A-17)**: `pendingApprovals` was reading `institutionalRepository.getApprovals()`, an intentionally-always-empty stub for every live tenant -- so a real approval created via the golden path could never appear on the dashboard. Now reads the real `approvalRequestsRepository` (`approval_requests` table).
- **Mobile**: every non-credentialed engineering check (typecheck, store-release-gate, Capacitor doctor/store-doctor, environment validation) passes cleanly. The path is blocked at exactly the two points already named in the credentials doc (no EAS/Expo session, no company-owned Apple/Google signing credentials), plus one newly-identified local-environment-only limitation (this sandbox cannot run the nested `pnpm` native-sync scripts or install Android/iOS SDKs -- not present in the project's actual CI). No signed artifact was produced; A-23/A-24 remain `Blocked`.
- Full narrative: `docs/readiness/SPRINT_5_QA3_CLOSURE_NON_HITL_DELTA_CLOSEOUT_2026_07_24.md`.

## Mobile Credential Governance Note

The iOS and Android store-release paths are currently blocked by company-credential readiness, not by a decision to release under the founder's individual name.

The governing evidence is documented in:

`docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md`

This blocker should remain visible in Sprint 5 and QA3 readiness assessment until Apple Developer Program and Google Play Console credentials are established under Triaxis Ventures Private Limited.
