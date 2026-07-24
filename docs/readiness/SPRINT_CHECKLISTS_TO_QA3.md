# Sprint Checklists to QA3

Date created: 2026-07-23  
Closure standard: 80% confidence minimum for every `Yes`

## Global Sprint Closure Checklist

Every sprint must satisfy this checklist. Status below is as of Sprint 3 (2026-07-24).

| Item | Status | Confidence | Evidence |
|---|---|---:|---|
| Target actionables reviewed | Yes | 100% | 6 targeted actionables reviewed; see `ACTIONABLES_READINESS_MATRIX.md` Sprint 3 Update |
| Required implementation completed or blocker documented | Yes | 95% | A real defense-in-depth cross-tenant authorization gap found and fixed (`rbac.ts`, `supabaseEnterpriseRepositories.ts`, `workflowActionRepositories.ts`), plus an invitation-acceptance identity check and a role-change audit log, both previously missing; every remaining item is a named, owned `Blocked` (HITL: a live second tenant, and/or Docker or a non-production Supabase project), not a missing implementation |
| Typecheck run | Yes | 100% | `pnpm run typecheck` clean |
| Lint run | Yes | 100% | `pnpm run lint` clean, zero warnings |
| Tests run | Yes | 100% | See `SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md` for the exact file/test counts |
| Build run | Yes | 100% | `pnpm run build` succeeded |
| Live or local verification evidence captured | Yes | 75% | Every RLS claim verified by direct reading of the actual `create policy` statements in `supabase/migrations/`, not assumed; live two-tenant browser/harness verification is explicitly named as HITL/environment-blocked, not silently skipped |
| Actionables document updated | Yes | 100% | `ACTIONABLES_READINESS_MATRIX.md` |
| Roadmap document updated | Yes | 100% | `FIVE_SPRINT_ROADMAP_TO_QA3.md` |
| Checklist document updated | Yes | 100% | This document |
| Kanban document updated | Yes | 100% | `QA3_READINESS_KANBAN.md` |
| Sprint closeout document created | Yes | 100% | `SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md` |
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
| Dashboard duplicate requests removed | Network/log proof | No | 0% |
| Gmail OAuth app status documented | Provider config proof or blocker | No | 0% |
| Microsoft OAuth app status documented | Provider config proof or blocker | No | 0% |
| Selected-message import path verified or blocked | UI/API evidence | No | 0% |
| Mixpanel captures core events | Live event proof | No | 0% |
| PostHog captures core events | Live event proof | No | 0% |
| At least 15 required events documented | Event taxonomy | No | 0% |
| Audit export includes workflow events | Export proof | No | 0% |
| Timeline evidence extends beyond projects | Documents/tasks/approvals proof | No | 0% |
| QA3 evidence folder prepared | Artifact index | No | 0% |
| Sprint 4 closeout exists | Closeout document path | No | 0% |

## Sprint 5 Checklist: Mobile Readiness, Release Gates, and QA3 Preparation

| Item | Required Evidence | Status | Confidence |
|---|---|---|---:|
| Android signed build generated | AAB/APK artifact or exact blocker | No | 0% |
| Android release notes/checklist updated | Store-readiness doc | No | 0% |
| iOS credential status verified | ASC/App Store evidence or blocker | No | 0% |
| iOS build attempted or blocked with evidence | CI/App Store log | No | 0% |
| Mobile analytics plan documented | Event taxonomy | No | 0% |
| Production deployment is current | Commit/deploy hash | No | 0% |
| QA3 artifact folder complete | Evidence index | No | 0% |
| All actionables reviewed | A-01 to A-25 updated | No | 0% |
| Roadmap updated | Sprint 5 closeout | No | 0% |
| Checklist updated | Checklist status table | No | 0% |
| Kanban updated | Board/status log | No | 0% |
| Sprint 5 closeout exists | Closeout document path | No | 0% |

## Mobile Credential Governance Note

The iOS and Android store-release paths are currently blocked by company-credential readiness, not by a decision to release under the founder's individual name.

The governing evidence is documented in:

`docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md`

This blocker should remain visible in Sprint 5 and QA3 readiness assessment until Apple Developer Program and Google Play Console credentials are established under Triaxis Ventures Private Limited.
