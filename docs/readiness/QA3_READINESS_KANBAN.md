# QA3 Readiness Kanban

Date created: 2026-07-23  
Purpose: Track the five-sprint QA3 readiness program across actionables, status, confidence, and evidence.

## Board Rules

- A card can move to `Verified` only with evidence and 80%+ confidence.
- A card can move to `Closed` only after the sprint closeout document updates the actionables, roadmap, checklist, and Kanban files.
- Blocked cards must name the blocker, owner, next action, and date of next review.

## Backlog

No cards remain in Backlog after Sprint 4.

## Known External Credential Dependency

Mobile store release readiness depends on company-owned Apple and Google credentials under Triaxis Ventures Private Limited.

The D-U-N-S request for Triaxis Ventures Private Limited was submitted to Dun & Bradstreet India on 2026-07-13 at 8:40 AM IST under reference number `DR071320262903910840`.

Until company credentials are active, A-23 and A-24 may be marked `Blocked` only with evidence, not `Yes`.

Details:

`docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md`

## Ready

No cards moved yet.

## In Progress

No cards moved yet.

## Review

No cards moved yet.

## Verified

No cards moved yet.

## Blocked

| Card | Sprint | Owner | Blocker | Next Action | Confidence | Evidence |
|---|---:|---|---|---|---:|---|
| A-02 Verify create-account success state | 1 | Claude Code (fix), then HITL (re-test) | Confirmed defect, not a HITL-only dependency: the HITL performed a real sign-up on 2026-07-24 and saw no visible confirmation, even though the account was created server-side | Investigate why `EnterpriseAuthFlowPage.tsx`'s tone-styled sign-up success message isn't visibly reaching the user; fix; HITL re-tests | 40% | `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, "Attempt 4 Log (2026-07-24)" |
| A-02 Verify create-account success state | 1 | HITL (re-test) | The dedicated sign-up success panel (`EnterpriseAuthFlowPage.tsx`) shipped in the Sprint 1 correction pass, but has never been re-tested against a real live sign-up since -- this row was found stale (still `No`) during Sprint 5 pre-work and corrected here | HITL (or a second real signup) completes sign-up on production and confirms the success panel renders | 80% (code) | `EnterpriseAuthFlowPage.tsx` `signUpSucceeded` state + dedicated success panel; `EnterpriseAuthFlowPage.test.tsx` |
| A-05 Verify password reset flow | 1 | HITL | Completing a reset requires a real email + a real password submission; not exercised in the 2026-07-24 walkthrough | HITL requests a reset link, completes it, confirms the new password works | 65% (code) | `/auth/forgot-password` now discoverable and live-curl-confirmed; recovery-initiation endpoint returns a safe generic response |
| A-07 Verify profile creation and editing | 1 | HITL (re-test) | The profile-menu entry point fix (`Sidebar.tsx`, wrapped in a real `onSelectSection("settings")` handler) shipped in an earlier correction pass, but has never been re-tested live since -- this row was found stale (still `No`) during Sprint 5 pre-work and corrected here | HITL edits their profile via Settings (through the now-working sidebar entry point) and confirms it persists | 82% (code) | Persistence confirmed genuine by earlier code audit; entry-point fix confirmed present in current `Sidebar.tsx`; `Sidebar.test.tsx` |
| A-08 Verify user invitation flow | 3 | Claude Code (fix), then HITL (live invite + accept) | Two real accounts (inviter and invitee) are needed to prove end to end -- Claude Code cannot create accounts under its own operating constraints | HITL invites a second real user and confirms they join the tenant with the assigned role | 75% (code) | Tenant-binding and identity-binding gaps fixed this sprint (`src/repositories/supabaseEnterpriseRepositories.ts`, `src/app/api/invitations/accept/route.ts`); `route.test.ts`, `accept/route.test.ts` |
| A-10 Run two-tenant isolation harness against real DB | 3 | HITL (environment), then Claude Code (run) | `scripts/verify-two-tenant-isolation.mjs` requires either a local Docker daemon (`supabase start`) or a linked non-production Supabase project -- neither is available in this environment, and the script must never run against the live production project (which now holds real Tenant 0 data) | HITL enables Docker locally or provisions a dedicated Supabase branch/staging project and shares its URL/anon key/service-role key | 70% (code + static RLS review) | Every affected table's actual RLS INSERT/SELECT policy read directly from `supabase/migrations/`; app-layer cross-org bypass found and fixed this sprint |
| A-11 Manually verify two-tenant UI isolation | 3 | HITL | Requires two real, separately authenticated live sessions -- Claude Code cannot create accounts under its own operating constraints | HITL (or a second real user) signs into two tenants and confirms no visible cross-tenant data | 65% (code) | UI data hooks confirmed to derive `TenantScope` only from the authenticated session, never from client-supplied state |
| A-14 Verify permission-aware retrieval | 3 | HITL | Live proof requires a real two-tenant RAG query -- same session dependency as A-13 | HITL asks a question as a real user against documents with mixed classification/visibility | 80% (code) | `canRetrieveDocument` unit-tested for cross-tenant, private, and (new this sprint) restricted-role exclusion in `governedRag.test.ts`; confirmed the live `tenantRagWorkflow.ts` path uses the same function |
| A-13 Verify RAG answer with citations | 2 | HITL | Requires a real authenticated session asking a real question -- Claude Code cannot establish one | HITL asks AXXESS a question grounded in a document ingested via Documents & Files | 75% (code) | `answerTenantQuestion()` traced end to end; pre-existing unit tests in `tenantRagWorkflow.test.ts` |
| A-15 Verify AI Review Inbox approval | 2 | HITL | Same session dependency as A-13 | HITL opens the Review Inbox and confirms the answer from A-13 appears there | 75% (code) | Bridge insert unit-tested in `tenantRagWorkflow.reviewInboxBridge.test.ts`, 2026-07-24 |
| A-16 Verify approved AI output creates real work | 2 | HITL | Same session dependency as A-13 | HITL clicks "Approve and create" (task) on the item from A-15 | 80% (code) | `createWorkflowActionFromAiReview()` was already complete and unmodified; the bridge just gives it a real input |
| A-17 Verify dashboard updates after workflow | 2 | HITL | Same session dependency as A-13 | HITL checks the dashboard after A-16 for the new task/document activity | 65% (code) | `useLiveWorkspaceMetrics` reads live repository counts; least-directly-traced item this sprint |
| A-18 Verify audit log updates after workflow | 2, 3, 4 | HITL | Same session dependency as A-13 | HITL checks the audit log after A-16 | 90% (code) | Multiple confirmed write points across the whole path; role/department/status changes write `user.access_updated` (Sprint 3); connector OAuth attempts write `connector.<provider>.oauth.started/.connected` (Sprint 4) |
| A-19 Verify timeline evidence updates | 2, 4 | HITL | Same session dependency as A-13 | HITL checks the workflow timeline after A-16 | 82% (code) | `ai_answer_generated` event added Sprint 2; Sprint 4 fixed a real demo-data-leak where a genuinely empty real tenant would see fabricated fallback timeline events instead of an honest empty state (`liveTenantWorkflow.timelineFallback.test.ts`) |
| A-20 Verify dashboard request deduplication | 4 | HITL | The dedupe fix (`liveWorkspaceMetricsCache.ts`) is unit-tested and confirmed unregressed, but has never been confirmed against a real authenticated dashboard load -- the only live replay performed (Sprint 5, 2026-07-22) was necessarily unauthenticated and never reached the dashboard | HITL loads the dashboard while signed in and confirms via browser devtools that each live-metrics request fires once, not 2-3x | 85% (code + regression test) | `src/hooks/liveWorkspaceMetricsCache.test.ts`; all three dashboard hook call sites confirmed to share the cache this sprint |
| A-21 Verify Gmail/Microsoft OAuth readiness | 4 | HITL (external credential provisioning) | `GOOGLE_CLIENT_ID`/`_SECRET`, `MICROSOFT_CLIENT_ID`/`_SECRET`, `AXXESS_OAUTH_STATE_SECRET`, `AXXESS_TOKEN_VAULT_KEY`, `AXXESS_TOKEN_VAULT_KEY_ID` are all absent from the production Vercel project (confirmed via `npx vercel env ls`) | HITL registers OAuth apps in Google Cloud Console / Azure Portal, then sets the 7 env vars via `npx vercel env add` (values only, never shared as plain text) | 75% (code) | Connector OAuth implementation confirmed complete and tested (`oauthProvider.ts`, `tokenVault.ts`, `oauth/start`+`/callback` routes); `docs/PLUGIN_RUNTIME.md` corrected this sprint to stop understating this |
| A-23 Verify Android signed build path | 5 | External (Dun & Bradstreet India) | Company-owned Google Play Console credentials pending D-U-N-S issuance for Triaxis Ventures Private Limited | Track D-U-N-S reference `DR071320262903910840`; follow up with `serviceindia@dnb.com` if no response within ~30 days of the 2026-07-13 submission | 60% (code) | `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md` |
| A-24 Verify iOS build/TestFlight path | 5 | External (Dun & Bradstreet India / Apple) | Company-owned Apple Developer Program credentials pending D-U-N-S issuance | Same next action as A-23; Apple Developer Program organization enrollment specifically requires the D-U-N-S Number | 30% (code) | `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md` -- also carries the pre-existing engineering gaps found in `docs/readiness/READINESS_DAYS_TO_LAUNCH_ANALYSIS_2026_07_23.md` (no real iOS build has ever succeeded in CI, independent of credentials) |

## Closed

| Card | Sprint | Owner | Confidence | Evidence |
|---|---:|---|---|---:|
| A-01 Deploy latest verified build to production | 1, 5 | Claude Code | 95% | Commit `59d1fe0` deployed as `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo` (READY, production); live-curl-confirmed serving the new build |
| A-03 Verify live login flow | 1 | HITL | 95% | HITL signed in successfully on `beta.triaxisventures.com`, 2026-07-24 |
| A-04 Verify logout flow | 1 | HITL | 95% | HITL logged out successfully, returned cleanly to sign-in, 2026-07-24 |
| A-06 Verify Tenant 0 organization provisioning | 1 | HITL | 95% | **First successful live tenant provisioning in this program's history** -- Triaxis Ventures Pvt Ltd provisioned, real workspace loaded, 2026-07-24 |
| A-09 Verify role assignment (onboarding-time scope) | 1, 3 | HITL | 92% | Super Admin role confirmed live throughout the workspace; RBAC-gated admin pages accessible, 2026-07-24. Sprint 3 hardened the post-onboarding role-assignment path (`PATCH /api/repositories/users`): closed a cross-tenant app-layer gap and added a missing audit log for role/department/status changes |
| A-12 Verify document upload or import | 2 | HITL | 90% | Incidentally exercised ahead of schedule: 7 files (PDF/DOCX/MD/PPTX/image/XLSX) uploaded, classified, chunked, and indexed successfully in Knowledge Hub, 2026-07-24 |
| A-22 Verify analytics event minimum | 4, 5 | Claude Code | 85% | 18 of 20 required categories dispatch-proven from real application code, exceeding the 15-event minimum -- `src/services/analytics/eventTaxonomy.test.ts`, 2026-07-24 |
| A-25 Produce QA3-ready evidence package | 4, 5 | Claude Code | 90% | `docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md` created, tracking Sprint 1-4 evidence, blockers, and QA3 trigger criteria, 2026-07-24 |

## Sprint Update Template

### Sprint N Kanban Update

- Date:
- Cards moved to Ready:
- Cards moved to In Progress:
- Cards moved to Review:
- Cards moved to Verified:
- Cards moved to Blocked:
- Cards moved to Closed:
- Cards remaining in Backlog:
- Evidence added:
- HITL decision:

### Sprint 1 Kanban Update: Tenant 0 Production Activation

- Date: 2026-07-23
- Cards moved to Ready: none
- Cards moved to In Progress: none
- Cards moved to Review: none
- Cards moved to Verified: none
- Cards moved to Blocked: A-02, A-03, A-04, A-05, A-06, A-07, A-09 (all named HITL as owner, with a specific next action -- none is blocked by missing implementation)
- Cards moved to Closed: A-01
- Cards remaining in Backlog: A-08, A-10 through A-25 (unchanged, out of Sprint 1 scope)
- Evidence added: commit `59d1fe0`; deployment `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo`; non-credentialed curl evidence in `docs/readiness/SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT.md`
- HITL decision: requested -- perform one real Tenant 0 walkthrough (sign up, confirm email, sign in, complete onboarding, edit profile) to close the 7 `Blocked` cards

### Sprint 1 Kanban Update (Continued): HITL Walkthrough Completed

- Date: 2026-07-24
- Cards moved to Ready: none
- Cards moved to In Progress: none
- Cards moved to Review: none
- Cards moved to Verified: none (moved straight to Closed, since this update itself satisfies the board rule requiring closeout/actionables/roadmap/checklist/Kanban all updated together)
- Cards moved to Blocked (re-scoped): A-02 and A-07 remain Blocked, but the owner changes from HITL to Claude Code -- both are now confirmed defects needing a fix, not items merely awaiting a HITL action
- Cards moved to Closed: A-03, A-04, A-06, A-09 (onboarding-time scope), and A-12 (Sprint 2-scoped, incidentally exercised ahead of schedule)
- Cards remaining in Backlog: A-08, A-10, A-11, A-13 through A-25
- Evidence added: full walkthrough narrative in `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, "Attempt 4 Log (2026-07-24)"
- HITL decision: two new high-priority defects were flagged directly by the HITL during this walkthrough and are not yet triaged into a formal card -- Investor Preview's "Continue to workspace" is broken, and the root domain (`beta.triaxisventures.com`) lands on a stale, dead-end authenticated-looking page. Recommend adding these as new actionables (or an unscheduled hotfix) before Sprint 2 begins, given the HITL's own "immediate"/investor-facing framing.

### Sprint 2 Kanban Update: Live Golden Path Execution

- Date: 2026-07-24
- Cards moved to Ready: none
- Cards moved to In Progress: none
- Cards moved to Review: none
- Cards moved to Verified: none (moved straight to Closed/Blocked, per the same reasoning as the Sprint 1 continued update)
- Cards moved to Blocked: A-13, A-15, A-16, A-17, A-18, A-19 (owner HITL, all sharing one blocker -- a real authenticated session to exercise the now-bridged golden path); A-23, A-24 (owner: external, Dun & Bradstreet India -- re-classified from Backlog given the dated, evidenced D-U-N-S dependency now documented, ahead of their Sprint 5 schedule since the blocker is real regardless of which sprint touches them)
- Cards moved to Closed: none new this update (A-12 already closed in the Sprint 1 continuation)
- Cards remaining in Backlog: A-08, A-10, A-11, A-14, A-20, A-21, A-22, A-25
- Evidence added: `docs/readiness/SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24.md`; `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md`; `tenantRagWorkflow.reviewInboxBridge.test.ts`
- HITL decision: requested -- one golden-path walkthrough (upload via Documents & Files, ask a question, approve in the Review Inbox, confirm the task, check dashboard/audit/timeline) would very likely close six of the eight `Blocked` cards in one pass. The A-23/A-24 D-U-N-S dependency requires no HITL action beyond periodically checking for a response from Dun & Bradstreet India against reference `DR071320262903910840`.

### Sprint 3 Kanban Update: Two-Tenant Isolation and Permission Proof

- Date: 2026-07-24
- Cards moved to Ready: none
- Cards moved to In Progress: none
- Cards moved to Review: none
- Cards moved to Verified: none
- Cards moved to Blocked: A-08, A-10, A-11, A-14 (moved from Backlog; all four now name the same class of blocker -- a real second live tenant and/or a non-production Supabase project, which Claude Code cannot create or credential itself)
- Cards moved to Closed: none new this update (A-09's existing Closed card updated in place with Sprint 3 evidence and confidence)
- Cards remaining in Backlog: A-20, A-21, A-22, A-25
- Evidence added: `docs/readiness/SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24.md`; `src/security/rbac.test.ts`; `src/repositories/supabaseEnterpriseRepositories.test.ts`; `src/services/rag/governedRag.test.ts`; `src/app/api/invitations/accept/route.test.ts`; `src/app/api/repositories/[resource]/route.test.ts`
- HITL decision: requested -- two independent things would unblock most of this sprint's `Blocked` cards. (1) A live two-tenant walkthrough (a second real account, invited or self-signed-up, used to exercise A-08/A-11/A-14 in the browser). (2) Either enabling a local Docker daemon on this machine, or provisioning a dedicated Supabase branch/staging project and sharing its credentials, so `scripts/verify-two-tenant-isolation.mjs` (written since Sprint 5, never run) can finally execute for A-10 -- it must never be pointed at the live production project.

### Sprint 4 Kanban Update: Integrations, Analytics, and Operational Evidence

- Date: 2026-07-24
- Cards moved to Ready: none
- Cards moved to In Progress: none
- Cards moved to Review: none
- Cards moved to Verified: none
- Cards moved to Blocked: A-20, A-21 (moved from Backlog)
- Cards moved to Closed: A-22, A-25 (moved from Backlog directly to Closed -- both closed on code/test evidence alone, no live-session dependency for either)
- Cards remaining in Backlog: none
- Evidence added: `docs/readiness/SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT_2026_07_24.md`; `docs/qa-artifacts/QA3_READINESS_2026_07_24/INDEX.md`; `src/services/analytics/eventTaxonomy.test.ts`; `src/app/api/connectors/oauth/start/route.test.ts`; `src/services/workflows/liveTenantWorkflow.timelineFallback.test.ts`; `src/features/demoDataNoticeGating.test.ts`
- HITL decision: requested -- (1) load the dashboard while signed in and confirm via browser devtools that each live-metrics request fires once (closes A-20); (2) register Google/Microsoft OAuth apps and set the 7 required Vercel env vars (closes A-21, values only, never shared as plain text with Claude Code). Both are independent of the Sprint 2/3 golden-path and two-tenant walkthroughs already requested and still outstanding.
