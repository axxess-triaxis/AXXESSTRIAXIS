# QA3 Readiness Evidence Package — Index

Date created: 2026-07-24 (Sprint 4)
Program: Five-Sprint QA3 Readiness Execution Program
Product manager / prompt designer: Codex
Executor: Claude Code
HITL authority: Sudipta Koushik Sarmah, Founder and Managing Director, Triaxis Ventures Private Limited

This index tracks evidence produced across Sprints 1–4 of the QA3 readiness program, points to the exact document or test file backing each claim, and names what remains for Sprint 5 and QA3 itself. It does not restate evidence in full — every row links to the source document, closeout, or test file that is the actual authority. No secrets, tokens, or credential values are stored in this package or referenced by value anywhere below.

## How To Use This Index

- Every claim in this program follows the status vocabulary in `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`: `Yes` (≥80% confidence + evidence), `No`, `Blocked` (named blocker + owner + evidence + next action), `Deferred`.
- "Evidence" below means: a closeout document section, a named test file, a deployment ID, or a specific commit hash — never an unqualified assertion.
- Where an item is `Blocked`, this index states the blocker and the next action verbatim from its source document rather than summarizing it away.

## Sprint 1 Evidence — Tenant 0 Production Activation

- Closeout: `docs/readiness/SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT.md` (plus its 2026-07-24 Addendum)
- Live walkthrough narrative: `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, "Attempt 4 Log (2026-07-24)"
- Deployment: commit `59d1fe0`, deployment `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo` (READY, production)
- Headline result: first successful live Tenant 0 (Triaxis Ventures Pvt Ltd) provisioning in this program's history; live-verified login, logout, role assignment
- Closed actionables: A-01, A-03, A-04, A-06, A-09, A-12 (A-12 closed ahead of schedule, incidentally exercised)
- Still open at Sprint 1 close: A-02 (create-account success state — confirmed defect, later fixed in the Sprint 1 correction pass), A-05 (password reset, Blocked on HITL), A-07 (profile editing, mixed — persistence confirmed, entry point was broken)
- Correction-sprint fixes: P0-01 (Investor Preview edge-cookie gap), P0-02 (create-account success state), P0-03 (raw "Unauthorized" in provision-tenant flow) — see `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` Sprint 1 update sections

## Sprint 2 Evidence — Live Golden Path Execution

- Closeout: `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24.md`
- Core finding: two independently complete AI-review pipelines (`ai_output_audit` vs `ai_operation_reviews`) had never been bridged — fixed with one minimal insert in `answerTenantQuestion()` (`src/services/rag/tenantRagWorkflow.ts`)
- Test evidence: `src/services/rag/tenantRagWorkflow.reviewInboxBridge.test.ts`, `src/features/meetings/MeetingsSection.test.ts`
- Closed: A-12 (unchanged from Sprint 1)
- Blocked (code-complete, unit-tested, never live-exercised — same HITL-session dependency for all six): A-13 (RAG answer with citations, 75%), A-15 (Review Inbox approval, 75%), A-16 (approved output creates work, 80%), A-17 (dashboard updates, 65%), A-18 (audit log updates, 85% at Sprint 2 close), A-19 (timeline evidence, 80%)
- Named blocker for all six: a real authenticated session exercising the golden path — Claude Code cannot create accounts or complete a live golden-path walkthrough itself
- **No evidence exists as of Sprint 4 that this HITL walkthrough has occurred** — see "Known Blockers" below

## Sprint 3 Evidence — Two-Tenant Isolation and Permission Proof

- Closeout: `docs/readiness/SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md`
- Commit: `29343df`
- Core finding: "Super Admin" (a self-selectable onboarding role, not a platform-operator role) was trusted by several app-layer functions to act on an arbitrary client-supplied `organizationId` — confirmed **not exploitable against the live database** (Postgres RLS independently and correctly scopes every affected table via `is_org_member`/`has_any_role`) but a genuine defense-in-depth violation, fixed at the application layer across `src/security/rbac.ts` and `src/repositories/`
- Two more fixes: invitation acceptance now verifies the accepting user's email matches the invited email (`src/app/api/invitations/accept/route.ts`); role/department/status changes now write a `user.access_updated` audit log (`src/app/api/repositories/[resource]/route.ts`)
- Test evidence: `src/security/rbac.test.ts`, `src/repositories/supabaseEnterpriseRepositories.test.ts`, `src/services/rag/governedRag.test.ts`, `src/app/api/invitations/accept/route.test.ts`, `src/app/api/repositories/[resource]/route.test.ts`
- Closed: A-09 raised to 92% confidence
- Blocked: A-08 (invitation flow, 75%), A-10 (isolation harness against real DB, 70% — see "Known Blockers"), A-11 (manual two-tenant UI isolation, 65%), A-14 (permission-aware retrieval, 80%), A-18 (raised to 88%)
- Tenant model audit: every genuinely tenant-owned table with a repository and RLS policy confirmed correctly scoped; `src/security/tenantGuard.ts` found to be correct but dead code (not called by any route), `docs/SECURITY_ARCHITECTURE.md` corrected to stop overclaiming it as an active layer

## Sprint 4 Evidence — Integrations, Analytics, and Operational Evidence

- Closeout: `docs/readiness/SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT_2026_07_24.md`
- **Dashboard deduplication (A-20)**: confirmed intact, no regression since the original fix (`src/hooks/liveWorkspaceMetricsCache.ts`, Sprint 5 2026-07-22) — all three dashboard hook call sites (`useLiveWorkspaceMetrics`, `useEnterpriseGoldenPath`, `useLiveRagHealth`) share one deduped cache; test evidence: `src/hooks/liveWorkspaceMetricsCache.test.ts`
- **Analytics instrumentation (A-22)**: 66 declared event names in `src/services/analytics/types.ts`; a dedicated dispatch-proof audit (`src/services/analytics/eventTaxonomy.test.ts`) confirms 18 of the sprint's required categories fire from real application code, not just declared types. This sprint added real dispatch for `app_opened`, `sign_up_started`, `document_uploaded`, `rag_ingestion_completed`, `rag_answer_generated`, and a new `profile_updated` event — all previously declared but never fired. Doc: `docs/ANALYTICS_EVENTS.md`
- **Gmail/Microsoft OAuth readiness (A-21)**: connector OAuth machinery (`src/services/integrations/oauthProvider.ts`, `tokenVault.ts`, `/api/connectors/oauth/start`+`/callback`) is genuinely complete and tested — not a stub, contrary to what `docs/PLUGIN_RUNTIME.md` previously implied (corrected this sprint). Both providers are `Blocked`: required env vars (`GOOGLE_CLIENT_ID`/`_SECRET`, `MICROSOFT_CLIENT_ID`/`_SECRET`, `AXXESS_OAUTH_STATE_SECRET`, `AXXESS_TOKEN_VAULT_KEY`, `AXXESS_TOKEN_VAULT_KEY_ID`) confirmed absent from the live Vercel production project (`npx vercel env ls`). Test evidence: `src/app/api/connectors/oauth/start/route.test.ts`, `src/services/integrations/oauthProvider.test.ts`
- **Audit/timeline evidence expansion (A-18/A-19)**: found and fixed a real demo-data-leak — `listWorkflowTimeline()` was silently substituting fabricated timeline events for any genuinely empty real tenant, not just Demo Mode. Fixed to only show the fallback in true Demo Mode; test evidence: `src/services/workflows/liveTenantWorkflow.timelineFallback.test.ts`
- **Social Alerts (WS5)**: confirmed unchanged and correct since the Sprint 5 (2026-07-22) fix — `isDemoModeEnabled()`-gated, honest empty state for live tenants, no regression; test evidence: `src/features/alerts/AlertsSection.test.tsx`
- **Badge/overclaim audit (WS6)**: found and fixed three components (`KnowledgeHubSection.tsx`, `OrganizationAdminSection.tsx`, `PilotConversionSection.tsx`) that showed an "Investor Preview:"-prefixed `DemoDataNotice` banner unconditionally to every tenant, live or demo — brought in line with the 7 other components that already gated this correctly. Test evidence: `src/features/demoDataNoticeGating.test.ts`. Knowledge Hub's "Indexed/Ready" stat tiles remain a client-side simulation, not a real backend RAG-index check (documented, not changed, since Sprint 2) — see Known Blockers.

## Sprint 5 Evidence — QA3 Closure and Non-HITL Delta Maximization

- Prompt: `docs/readiness/CLAUDE_CODE_SPRINT_5_PROMPT_QA3_NON_HITL_DELTA_2026_07_24.md`; pre-sprint gap/stability/Kanban review: `docs/readiness/PRE_SPRINT_5_GAP_STABILITY_KANBAN_REVIEW_2026_07_24.md`
- **AI Review Inbox role/ownership gap (fixed):** `GET /api/ai/reviews` previously returned every review in the tenant to every member; now filtered to creator/reviewer/admin via `canViewAiReview`, and `POST` decisions require reviewer-assignment or admin via `canDecideAiReview`, mirroring the real RLS policies (`ai_operation_reviews_member_select`/`_reviewer_update`) rather than inventing a looser or stricter app-layer rule. Test evidence: `src/services/ai/reviewInbox.test.ts`, `src/app/api/ai/reviews/route.test.ts`
- **Demo/fabricated fallback audit (complete, no new defects):** all 16 modules across this program's history checked; the 5 not yet individually verified (Meetings, Audit Logs, Product Analytics, Settings, Beta Readiness) confirmed clean this sprint
- **Stakeholders/CRM (Option A, wired live):** the `stakeholders` table already had schema, RLS, and a 64-record demo dataset but zero application repository code. Added `stakeholdersRepository` end to end (repository → generic `/api/repositories/[resource]` route → `serviceProvider` live/resilient/empty/demo tiers → `StakeholdersSection.tsx` UI), replacing a dead "Add Contact" button with a real create path and an honest empty state for live tenants with zero contacts. Test evidence: `src/repositories/supabaseEnterpriseRepositories.test.ts`, `src/features/stakeholders/StakeholdersSection.test.tsx`
- **Department/Workspace (Option B, honest defer):** `OrganizationAdminSection.tsx`'s "Department map" pilot control previously claimed `status: "Ready"` with no application code behind it (confirmed by the Sprint 3 tenant-model audit). Relabeled to `"Not built"` with an accurate description, rather than building a department-management UI this sprint. Test evidence: `src/features/admin/OrganizationAdminSection.test.ts`
- **QA3 manual walkthrough script:** `docs/qa-artifacts/QA3_READINESS_2026_07_24/QA3_MANUAL_WALKTHROUGH_SCRIPT.md` — 21 sections (0-20), each with preconditions, steps, expected result, pass/fail, evidence, and severity fields, mapped to specific actionables. This is the exact script the HITL runs to close the "no live authenticated golden-path walkthrough" blocker.
- Remaining Sprint 5 scope: mobile build/release gate attempt (A-23/A-24), production deployment currency re-verification (A-01), and strengthening blocked-item evidence without HITL (A-13, A-15, A-16, A-17, A-18, A-19, A-20, A-21) — see the Sprint 5 closeout doc once written for final status.

## Known Blockers (Cross-Sprint)

| Blocker | Affects | Owner | Next Action |
|---|---|---|---|
| No real second live tenant exists; Claude Code cannot create accounts under its own operating constraints | A-08, A-11, A-14 | HITL | Invite or self-sign-up a second real account; exercise the browser UI as two tenants |
| No live authenticated golden-path walkthrough has been performed since Sprint 2 shipped the review-inbox bridge | A-13, A-15, A-16, A-17, A-18 (partial) | HITL | Upload a document via Documents & Files, ask a question, approve in Review Inbox, confirm task/dashboard/audit/timeline |
| `scripts/verify-two-tenant-isolation.mjs` has never been executed (written since Sprint 5, 2026-07-22) — no Docker daemon and no linked/branch Supabase project in this environment; must never target the live production project | A-10 | HITL | Enable Docker locally, or provision a dedicated Supabase branch/staging project and share its URL/anon key/service-role key |
| Gmail/Microsoft connector OAuth credentials not set in production Vercel project | A-21 | HITL | Register OAuth apps in Google Cloud Console / Azure Portal, set the 7 required env vars via `npx vercel env add` (values only — never share the actual secrets with Claude Code as plain text in chat) |
| D-U-N-S Number application pending (Dun & Bradstreet India, submitted 2026-07-13, reference `DR071320262903910840`) — blocks company-owned Apple/Google developer credentials | A-23, A-24 | External (Dun & Bradstreet India) | Track reference; follow up with `serviceindia@dnb.com` if no response within ~30 days of submission |
| Knowledge Hub's "Indexed/Ready" stat tiles are a client-side simulation (`buildRagIngestionRecord`), not a real check against `rag_document_chunks` | Buyer/investor diligence trust | Product decision (Claude Code / Codex) | Either wire the badge to a real chunk-existence check, or relabel to avoid implying confirmed backend state — not yet decided |
| `GET /api/ai/reviews` has no role check (any org member sees every review in the tenant, not just their own) | Same-tenant privacy, not cross-tenant | Claude Code (future sprint) | Add a role/ownership filter matching the RLS row-level model |
| `PilotConversionSection.tsx` falls back to fabricated demo events for a real tenant with zero real pilot-readiness events, labeled honestly as "Demo" via its own state badge but still fabricated content | Investor/buyer diligence trust | Product decision | Consider an honest empty state instead of fabricated fallback content, matching the AlertsSection/AnalyticsSection pattern |

## Test Logs / References

- Sprint 2 close: 122 files / 399 tests passing, `pnpm run build` succeeded, `pnpm run supabase:verify` passed (27 migrations, 100 RLS-protected tables)
- Sprint 3 close: 123 files / 409 tests passing, build succeeded, `supabase:verify` passed
- Sprint 4: see `docs/readiness/SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT_2026_07_24.md` "Tests Run And Results" for the exact post-Sprint-4 count

## Deployment References

- Sprint 1: commit `59d1fe0`, deployment `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo`
- Sprint 1 correction pass + Sprint 2: see `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24.md` for the deployment record used to close the Sprint 1 carryover gate
- Production alias: `beta.triaxisventures.com` / `triaxisventures.com`
- No new production deploy was required for Sprint 3 or Sprint 4's code-only changes as of this index's creation — confirm current production currency before QA3 itself (Sprint 5 scope, A-01 re-verification)

## Screenshots / Log References

No screenshots are stored in this package. Live browser verification evidence (where performed) is narrated in-line in the relevant sprint closeout document rather than captured as image files, consistent with this program's practice to date. Non-credentialed live `curl` evidence (route reachability, safe error responses) is quoted directly in each sprint's closeout "Live / Manual Verification Notes" section.

## HITL Retest Requirements

In priority order (highest-leverage first, per the blockers table above):

1. One golden-path walkthrough (Sprint 2's outstanding item) — would very likely close A-13, A-15, A-16, A-17, A-18 (fully), A-19 in one pass.
2. One two-tenant walkthrough (a second real account) — would very likely close A-08, A-11, and materially strengthen A-14.
3. Either enable Docker locally or provision a non-production Supabase environment — the only way to close A-10.
4. Complete the Gmail/Microsoft OAuth external setup (provider console registration + Vercel env vars) — required before A-21 can move off `Blocked`.
5. Continue tracking the D-U-N-S application for A-23/A-24 — no action needed until Dun & Bradstreet India responds or ~30 days elapse from 2026-07-13.

## QA3 Trigger Criteria

Per `docs/readiness/CODEX_RECOMMENDATION_QA3_READINESS_PROGRAM.md`: QA3 (Exhaustive Beta Readiness Audit) is mandatory once Sprint 5 closes under the program's closure rule (every Sprint 5 checklist item `Yes` with ≥80% confidence, or explicitly `Blocked` with a named owner/evidence/next action). QA3 must verify, at minimum: Tenant 0 onboarding, sign up/login/logout/reset password, protected workspaces, user profile and role setup, invitation flow, real document upload/import, governed RAG answer with citations, human review and approval, real work creation from approved AI output, dashboard/audit/timeline updates, two-tenant isolation, permission-aware retrieval, analytics event capture, mobile release readiness, and buyer-grade trust evidence. As of this index's creation (end of Sprint 4), Sprint 5 has not started — QA3 has not been triggered.
