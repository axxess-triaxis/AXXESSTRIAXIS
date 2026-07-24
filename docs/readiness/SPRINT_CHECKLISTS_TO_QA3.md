# Sprint Checklists to QA3

Date created: 2026-07-23  
Closure standard: 80% confidence minimum for every `Yes`

## Global Sprint Closure Checklist

Every sprint must satisfy this checklist. Status below is as of Sprint 1 (2026-07-23) -- update again at the start of Sprint 2.

| Item | Status | Confidence | Evidence |
|---|---|---:|---|
| Target actionables reviewed | Yes | 100% | 8 targeted actionables reviewed; see `ACTIONABLES_READINESS_MATRIX.md` Sprint 1 Update |
| Required implementation completed or blocker documented | Yes | 90% | Forgot-password link, notices enforcement shipped; every remaining item is a named, owned `Blocked` (HITL credentialed action), not a missing implementation |
| Typecheck run | Yes | 100% | `pnpm run typecheck` clean |
| Lint run | Yes | 100% | `pnpm run lint` clean, zero warnings |
| Tests run | Yes | 100% | 120 files / 387 tests passing (up from 383) |
| Build run | Yes | 100% | `pnpm run build` succeeded, 116 routes generated |
| Live or local verification evidence captured | Yes | 85% | Non-credentialed curl evidence against `beta.triaxisventures.com`; credentialed steps explicitly named as HITL-only, not silently skipped |
| Actionables document updated | Yes | 100% | `ACTIONABLES_READINESS_MATRIX.md` |
| Roadmap document updated | Yes | 100% | `FIVE_SPRINT_ROADMAP_TO_QA3.md` |
| Checklist document updated | Yes | 100% | This document |
| Kanban document updated | Yes | 100% | `QA3_READINESS_KANBAN.md` |
| Sprint closeout document created | Yes | 100% | `SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT.md` |
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
| Document upload works | Uploaded file visible in tenant | No | 0% |
| Document indexing works | Search/RAG availability proof | No | 0% |
| RAG answer works | Question, answer, citations | No | 0% |
| Sources are displayed | Source card/screenshot | No | 0% |
| Review Inbox receives answer | Review item visible | No | 0% |
| Reviewer can approve/reject/edit | Review decision proof | No | 0% |
| Approved answer creates work | Created task/project/approval/stakeholder note | No | 0% |
| Dashboard updates | Before/after screenshot | No | 0% |
| Audit log updates | Audit event proof | No | 0% |
| Timeline updates | Timeline proof | No | 0% |
| Sprint 2 closeout exists | Closeout document path | No | 0% |

## Sprint 3 Checklist: Two-Tenant Isolation and Permission Proof

| Item | Required Evidence | Status | Confidence |
|---|---|---|---:|
| Tenant A created | Tenant record/UI proof | No | 0% |
| Tenant B created | Tenant record/UI proof | No | 0% |
| Tenant A cannot see Tenant B projects | UI and query proof | No | 0% |
| Tenant A cannot retrieve Tenant B documents | RAG permission test | No | 0% |
| User invite works | Invite email/link proof | No | 0% |
| Role-specific access works | Admin/manager/employee/guest proof | No | 0% |
| Unauthorized access shows safe copy | No raw Unauthorized errors | No | 0% |
| Isolation harness passes | Script/test output | No | 0% |
| Audit logs include tenant/user/action | Audit evidence | No | 0% |
| Sprint 3 closeout exists | Closeout document path | No | 0% |

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

