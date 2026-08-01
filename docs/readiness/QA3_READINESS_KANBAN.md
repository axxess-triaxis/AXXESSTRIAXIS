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
| A-05 Verify password reset flow | 1 | HITL | Completing a reset requires a real email + a real password submission; not exercised in the 2026-07-24 walkthrough | HITL requests a reset link, completes it, confirms the new password works | 65% (code) | `/auth/forgot-password` now discoverable and live-curl-confirmed; recovery-initiation endpoint returns a safe generic response |
| A-08 Verify user invitation flow | 3 | Claude Code (fix) | 2026-07-25 -- HITL sent a real invitation (co-founder's personal email, role Employee) via `/settings`. UI showed success, but no email was ever received -- confirmed defect in email delivery, not an untested path | Investigate `sendInvitationEmail`/Resend provider configuration on production; fix; HITL re-tests | 90% (confirmed defect, not code-confidence) | Tenant-binding/identity-binding gaps already fixed (`src/repositories/supabaseEnterpriseRepositories.ts`, `src/app/api/invitations/accept/route.ts`); email delivery itself is the newly-confirmed gap |
| A-10 Run two-tenant isolation harness against real DB | 3 | HITL (environment), then Claude Code (run) | `scripts/verify-two-tenant-isolation.mjs` requires either a local Docker daemon (`supabase start`) or a linked non-production Supabase project -- neither is available in this environment, and the script must never run against the live production project (which now holds real Tenant 0 data) | HITL enables Docker locally or provisions a dedicated Supabase branch/staging project and shares its URL/anon key/service-role key | 70% (code + static RLS review) | Every affected table's actual RLS INSERT/SELECT policy read directly from `supabase/migrations/`; app-layer cross-org bypass found and fixed this sprint |
| A-11 Manually verify two-tenant UI isolation | 3 | HITL | Requires two real, separately authenticated live sessions -- Claude Code cannot create accounts under its own operating constraints | HITL (or a second real user) signs into two tenants and confirms no visible cross-tenant data | 65% (code) | UI data hooks confirmed to derive `TenantScope` only from the authenticated session, never from client-supplied state |
| A-14 Verify permission-aware retrieval | 3 | HITL | Live proof requires a real two-tenant RAG query -- same session dependency as A-13 | HITL asks a question as a real user against documents with mixed classification/visibility | 80% (code) | `canRetrieveDocument` unit-tested for cross-tenant, private, and (new this sprint) restricted-role exclusion in `governedRag.test.ts`; confirmed the live `tenantRagWorkflow.ts` path uses the same function |
| A-13 Verify RAG answer with citations | 2 | HITL | Requires a real authenticated session asking a real question -- Claude Code cannot establish one | HITL asks AXXESS a question grounded in a document ingested via Documents & Files | 75% (code) | `answerTenantQuestion()` traced end to end; pre-existing unit tests in `tenantRagWorkflow.test.ts` |
| A-15 Verify AI Review Inbox approval | 2 | HITL | Same session dependency as A-13 | HITL opens the Review Inbox and confirms the answer from A-13 appears there | 82% (code, Sprint 5 role/ownership gap closed) | Bridge insert unit-tested in `tenantRagWorkflow.reviewInboxBridge.test.ts`, 2026-07-24; role/ownership filtering (`canViewAiReview`/`canDecideAiReview`, mirroring real RLS) added and tested Sprint 5, 2026-07-24 |
| A-16 Verify approved AI output creates real work | 2 | HITL | Same session dependency as A-13 | HITL clicks "Approve and create" (task) on the item from A-15 | 80% (code) | `createWorkflowActionFromAiReview()` was already complete and unmodified; the bridge just gives it a real input |
| A-17 Verify dashboard updates after workflow | 2 | HITL | Same session dependency as A-13 | HITL checks the dashboard after A-16 for the new task/document activity | 78% (code, fixed a real bug this sprint) | Sprint 5 found and fixed a genuine defect: `getLiveWorkspaceMetrics`'s `pendingApprovals` count read `services.institutionalRepository.getApprovals()`, which is always the empty stub for every live tenant (see `serviceProvider.ts`) -- so a real approval created via `createWorkflowActionFromAiReview` could never be reflected on the dashboard, no matter what. Now reads the real `approvalRequestsRepository` (`approval_requests` table). Test evidence: `src/services/live-platform/livePlatform.test.ts` |
| A-18 Verify audit log updates after workflow | 2, 3, 4 | HITL | Same session dependency as A-13 | HITL checks the audit log after A-16 | 90% (code) | Multiple confirmed write points across the whole path; role/department/status changes write `user.access_updated` (Sprint 3); connector OAuth attempts write `connector.<provider>.oauth.started/.connected` (Sprint 4) |
| A-19 Verify timeline evidence updates | 2, 4 | HITL | Same session dependency as A-13 | HITL checks the workflow timeline after A-16 | 82% (code) | `ai_answer_generated` event added Sprint 2; Sprint 4 fixed a real demo-data-leak where a genuinely empty real tenant would see fabricated fallback timeline events instead of an honest empty state (`liveTenantWorkflow.timelineFallback.test.ts`) |
| A-20 Verify dashboard request deduplication | 4 | HITL | The dedupe fix (`liveWorkspaceMetricsCache.ts`) is unit-tested and confirmed unregressed, but has never been confirmed against a real authenticated dashboard load -- the only live replay performed (Sprint 5, 2026-07-22) was necessarily unauthenticated and never reached the dashboard | HITL loads the dashboard while signed in and confirms via browser devtools that each live-metrics request fires once, not 2-3x | 85% (code + regression test) | `src/hooks/liveWorkspaceMetricsCache.test.ts`; all three dashboard hook call sites confirmed to share the cache this sprint |
| A-21 Verify Gmail/Microsoft OAuth readiness | 4 | HITL (external credential provisioning) | `GOOGLE_CLIENT_ID`/`_SECRET`, `MICROSOFT_CLIENT_ID`/`_SECRET`, `AXXESS_OAUTH_STATE_SECRET`, `AXXESS_TOKEN_VAULT_KEY`, `AXXESS_TOKEN_VAULT_KEY_ID` are all absent from the production Vercel project (confirmed via `npx vercel env ls`). **Live-confirmed 2026-07-25:** the gating message itself also has 2 UI defects -- "Connect Slack" shows a raw unformatted JSON object as page content, and Calendly/Notion/Hubspot/Airtable all show the identical Slack-specific message regardless of which was clicked | HITL registers OAuth apps in Google Cloud Console / Azure Portal, then sets the 7 env vars via `npx vercel env add`; separately, fix the raw-JSON display and per-connector provider-ID bug | 75% (code) | Connector OAuth implementation confirmed complete and tested (`oauthProvider.ts`, `tokenVault.ts`, `oauth/start`+`/callback` routes); `docs/PLUGIN_RUNTIME.md` corrected this sprint to stop understating this |
| A-26 Verify sign-in OAuth (Google/Microsoft) on the live auth page | -- | HITL / provider config | Distinct from A-21 -- this is the sign-in-with-Google/Microsoft path on `/auth`, gated behind external provider registration plus `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED`/`NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED` | Google: live at OAuth-start endpoint. Microsoft: register provider and enable flag. | Google live / Microsoft blocked | 2026-07-29 -- updated status: Google sign-in is live at the production OAuth-start layer. `GET https://landing.triaxisventures.com/api/auth/oauth/start?provider=google` returns a real Supabase authorize URL. Microsoft still returns the expected not-enabled response and remains blocked on provider registration/configuration. Full browser click-through can still be used as extra HITL confirmation, but the previous blanket "still does not work" status is no longer accurate for Google. |
| A-27 Fix: "Welcome Aboard" must force fresh authentication | -- | Claude Code | HITL, already signed in from earlier testing, clicked "Welcome Aboard" and landed straight on "Continue to workspace" with no fresh sign-in prompt | Investigate and fix the session-reuse path on the beta entry point; do not let an existing session silently bypass authentication | -- | HITL-reported 2026-07-25, founder's own words: **"very risky security wise for Enterprise platform."** Log only, not yet actioned |
| A-28 Fix: Organization tab shows demo data on a real tenant | -- | Claude Code | Tenant 0's own `/settings` Organization tab displayed "North East Health Mission" (186 Projects, 2,200 Documents) -- the investor demo's dataset, not Tenant 0's real data | Investigate the Organization tab's data source for live tenants; fix the leak | -- | HITL-reported 2026-07-25, founder: **"needs immediate rectification."** Contradicts `HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md`'s partitioning claims. Log only, not yet actioned |
| A-29 Fix: Security tab dead "Configure" buttons + empty permissions table | -- | Claude Code | All 6 "Configure" buttons (MFA, SSO, Audit Logging, Encryption, IP Allowlisting, Session Timeout) are dead ends; Role-Based Permissions table renders empty | Wire each Configure button to a real settings screen or honestly label as not-yet-available; populate or remove the empty table | -- | HITL-reported 2026-07-25. Log only, not yet actioned |
| A-30 Fix: Permissions tab over-discloses the full role schema | -- | Claude Code (product decision needed first) | Every viewer sees all six roles' full permission matrix, not just their own | Founder to confirm intended scope (role-gate the view vs. redesign); then implement | -- | HITL-reported 2026-07-25, founder: **"We do not want permission schema for other user categories visible to any user."** Log only, not yet actioned |
| A-31 Fix: AI Configuration tab is placeholder on live beta Settings | -- | Claude Code | Usage stats, provider list, and language coverage are static/hardcoded on the live beta's own Settings, not just the demo | Investigate whether this is a gap the Sprint 5 P3 fallback audit missed or a regression; fix | -- | HITL-reported 2026-07-25, founder: "Fully placeholder." Log only, not yet actioned |
| A-32 Remove/gate the "Demo" tab inside live beta Settings | -- | Claude Code | `/settings` on `landing.triaxisventures.com` has a "Demo" tab rendering the full Investor Preview snapshot with a "Reset Preview Data" button | Founder to confirm intended scope (remove entirely vs. gate); then implement | -- | HITL-reported 2026-07-25, founder: "We do not need 'demo' screen with placeholder data in live beta." **Explicitly log only, not to be acted on yet** |
| A-33 Fix: Roles redirect lands on Security tab, not a roles-relevant tab | -- | Claude Code | The A-27 redirect (`/admin/roles` -> `/settings`) inherits `SettingsSection.tsx`'s default tab (`"security"`) rather than landing somewhere roles-relevant; reproduces A-29's empty Role-Based Permissions table along the way | Have the redirect pass a tab hint (e.g. `/settings?tab=permissions`) once `SettingsSection.tsx` supports deep-linking a tab | -- | HITL-reported 2026-07-25. Minor UX refinement, log only |
| A-34 Fix: "View Executive Risk" gated behind a redundant Knowledge Hub demo step | -- | Claude Code | Knowledge Hub shows a "Guided demo 2/6" overlay requiring an extra "Open Knowledge Hub" click before reaching real content | Remove or auto-dismiss the mediating step for users arriving via a direct action link like "View Executive Risk" | -- | HITL-reported 2026-07-25, founder: "a redundant mediating... button which has to be removed to reduce a user redundant step." Log only |
| A-35 Fix: "Submit Feedback" has no destination inbox | -- | Claude Code | Feedback submits successfully but there is nowhere to review it afterward | Build or wire a real feedback inbox/table | -- | HITL-reported 2026-07-25. Log only |
| A-36 Fix: Golden Path "Invite Pilot Team" routes to Security instead of invite/users | -- | Claude Code | Founder: "fully incorrect path" | Fix the Golden Path step -> destination mapping for this item | -- | HITL-reported 2026-07-25. Log only |
| A-37 Fix: Golden Path "Assign Roles" routes to Security instead of roles/permissions | -- | Claude Code | Founder: "fully incorrect path"; same symptom as A-36/A-33 | Fix the Golden Path step -> destination mapping for this item, likely alongside A-36 | -- | HITL-reported 2026-07-25. Log only |
| A-38 Fix: Back arrow from Security exits straight to "Continue to Workspace" | -- | Claude Code | Founder: "unnecessary, spoils UX and one step too much unnecessarily" | Return Back navigation to the Golden Path checklist instead of an unrelated screen | -- | HITL-reported 2026-07-25. Log only |
| A-39 Fix: Golden Path "Send feedback/request support" lands on Executive Dashboard | -- | Claude Code | Confirmed incorrect destination by founder | Fix the Golden Path step -> destination mapping for this item | -- | HITL-reported 2026-07-25. Log only |
| A-40 Fix (high priority): "Back" repeatedly leads to Sign Up/Sign In, self-redirects to "Continue to Workspace" | -- | Claude Code | Recurring across multiple screens during the full walkthrough | Founder: **"Very bad UX with repeated unmitigated occurrence."** Immediate addressal flagged as needed -- but explicit instruction was "Document, dont act yet" | -- | HITL-reported 2026-07-25. Likely related to A-27's session-reuse gap. **Logged only, not fixed** |
| A-41 Golden Path step-to-workspace mapping: full walkthrough result | -- | HITL (tested), Claude Code (owns the 4 fixes) | Mixed result: 6 of 10 items correct, 4 confirmed wrong (A-35/A-36/A-37/A-39) | See A-35/A-36/A-37/A-39 for the specific fixes needed | -- | HITL-reported 2026-07-25 -- full walkthrough completed and logged. Correct: Create First Project, Upload Document, Ask first AI/RAG question, Create first task, Request first approval, View Audit Trail |
| A-42 Fix: Executive Dashboard has 3 redundant "Send Feedback" entry points | -- | Claude Code (product decision: which 2 to remove) | 3 separate feedback link/form/tab surfaces on one page | Consolidate to 1 real form routed to a real mailbox; remove the other 2 | -- | HITL-reported 2026-07-25. Distinct from A-35 (missing destination inbox). Log only, not yet actioned |
| A-43 Fix: "Export Briefing" is a clickable placeholder | -- | Claude Code | Button does nothing real | Wire to a real export artifact or remove | -- | HITL-reported 2026-07-25. Log only |
| A-44 Fix: "Start Guided Demo" -- redundancy vs. Investor Preview unclear, currently placeholder | -- | Claude Code (product decision first) | Clickable, does nothing; unclear if distinct from the now-signed-off Investor Preview demo | Founder to decide: build real in-beta guided demo, or remove as redundant | -- | HITL-reported 2026-07-25. Log only |
| A-45 Fix: "Command search" bar is non-functional | -- | Claude Code | Placeholder only, does not search modules/documents/approvals/workflows as labeled | Wire to real search or remove until built | -- | HITL-reported 2026-07-25. Founder: whole header row "almost entirely irrelevant/placeholder." Log only |
| A-46 Fix: "Tenant Health Command Center" section mostly placeholder (Strategic Objectives, AI Recommendations, Risk Heatmap) | -- | Claude Code | Strategic Objectives and AI Recommendations show "none configured/none yet"; Risk Heatmap has no visible live data source | Wire each sub-panel to real tenant data, or honestly empty-state each until built | -- | HITL-reported 2026-07-25. Founder: **"excellently designed but almost entirely placeholder right now. Needs to go live to boost UX on Enterprise Beta 1.0."** **Resolved same-day in Executive Dashboard Sprint ED-3** -- see `docs/readiness/EXECUTIVE_DASHBOARD_ED3_CLOSEOUT_2026_07_25.md` |
| A-47 Fix: Dashboard "Refresh" button has no onClick | -- | Claude Code | Silently dead, code-audit finding | Wire to real refetch | -- | Code audit 2026-07-25. **Resolved in Executive Dashboard Sprint ED-1** |
| A-48 Fix: second dead "Send Feedback" mailto on AI Workspace header | -- | Claude Code | Same broken pattern as A-42's Dashboard mailto | Same fix as A-42 | -- | Code audit 2026-07-25. **Resolved in Executive Dashboard Sprint ED-1** |
| A-49 Fix: "Request pilot conversation" is a dead mailto | -- | Claude Code (product decision) | No real inbound-lead capture exists | Wire to real capture, or keep as intentional external CTA | -- | Code audit 2026-07-25. **Resolved in Executive Dashboard Sprint ED-1** (kept as labeled external CTA) |
| A-50 Fix: THCC "Active users" tile is mislabeled | -- | Claude Code | Shows a Ready/Blocked proxy, not a user count | Relabel or replace with real count | -- | Code audit 2026-07-25. **Resolved in Executive Dashboard Sprint ED-1** (relabeled "Team provisioning") |
| A-51 Fix: THCC "Audit coverage" tile is a proxy | -- | Claude Code | Heuristic, not a real audit-log query | Relabel or wire real count | -- | Code audit 2026-07-25. **Resolved in Executive Dashboard Sprint ED-1 (relabel) and ED-2 (real count where available)** |
| A-52 Fix: Project Health Monitor "View All"/row buttons have no onClick | -- | Claude Code | Visually clickable, functionally dead | Wire real navigation | -- | Code audit 2026-07-25. **Resolved in Executive Dashboard Sprint ED-1** |
| A-53 Fix: fabricated budget/spent fields in `getDashboardProjects()` | -- | Claude Code | Per-index fabricated strings, not real data | Remove or replace with real values | -- | Code audit 2026-07-25. **Resolved in Executive Dashboard Sprint ED-2** |
| A-54 Golden Path vs. Pilot Onboarding checklist overlap | -- | Claude Code (product decision) | Two overlapping "getting started" checklists near the same page | Merge, differentiate, or server-persist | -- | Code audit 2026-07-25. **Resolved in Executive Dashboard Sprint ED-3** (differentiated, labeled local-only) |
| A-55 RAG answers return templated/dummy-pattern text, not a real synthesized answer | RAG Remediation Sprint 2 | Claude Code | Query against a real uploaded document returned "Tenant 0 dummy data" + echoed query keywords | Code-level investigation to distinguish stub-response-generator vs. citing-a-stale-placeholder-source (see A-61/A-62) | HITL live retest: archive stale doc, index real doc, re-query, compare | HITL-reported 2026-07-25 (AI Workspace walkthrough). **Code-level finding 2026-07-26**: answer generator confirmed to genuinely extract/summarize real retrieved chunk text (proven with real embeddings in `tenantRagWorkflow.answerGrounding.test.ts`), not a stub -- supports the "citing a stale source" hypothesis over "fake generator." Query-keyword-echo clause removed. No real external LLM exists anywhere in this codebase (documented, not previously stated this plainly). Kept open pending HITL live confirmation |
| A-56 RAG confidence score is an opaque "black box" | RAG Remediation Sprint 2 | Claude Code | No visible explanation of the confidence computation | Surface or document the scoring logic | HITL live confirmation of the new "Why this score" UI on production | HITL-reported 2026-07-25. Founder: "that '72% confidence' logic should not be 'black box'." **Resolved 2026-07-26**: `confidenceExplanation.ts` (new) computes and surfaces source-match strength, chunk count, authorization status, citation coverage, answer mode, and capped-reason; displayed in AI Workspace, persisted in `ai_operation_reviews.metadata` |
| A-57 AI Review Inbox "Create Stakeholder Note" + "Escalate" did not produce a visible CRM record | RAG Remediation Sprint 3 | Claude Code | Confirmed real for "Create Task" path, not confirmed for stakeholder-note/escalate path | Investigate the escalate/stakeholder-note action handler | HITL live confirmation on production | HITL-reported 2026-07-25. **Resolved 2026-07-26**: the note was already a real, tenant-scoped row with full linkage -- `StakeholdersSection.tsx` never fetched or displayed the notes table. New `GET /api/stakeholders/notes` route + live "AI-escalated notes" section |
| A-58 Stakeholders & CRM "Create Contact" auto-populates fixed Influence (50)/Engagement (medium) | RAG Remediation Sprint 3 | Claude Code | Values never entered by the user | Leave unset/user-specified, or compute from real signal | HITL live confirmation on production | HITL-reported 2026-07-25. **Resolved 2026-07-26**: `stakeholderMutation()` defaults changed to `0`/`"unrated"`; Add Contact form now has real, optional Influence/Engagement inputs |
| A-59 "Review Approval Queue" routes to Analytics & Dashboard instead of Pending Approvals | RAG Remediation Sprint 2 | Claude Code | Confirmed wrong destination | Fix the route | -- | HITL-reported 2026-07-25. **Resolved 2026-07-26**: same root cause as A-64 -- guided-demo Next-button label/destination mismatch, fixed in `useGuidedDemo.ts`/`GuidedDemoBanner.tsx` |
| A-60 "Export Report" (Approvals & Governance) is a clickable placeholder | RAG Remediation Sprint 3 | Claude Code | Distinct from the Analytics & Reports "Export Report," which the founder explicitly deferred | Wire to real export or remove | HITL live confirmation on production | HITL-reported 2026-07-25. **Resolved 2026-07-26**: code search found no such button existed at all in the current source -- the live page was an unconditional empty state. New `GET /api/approvals` real queue + real JSON export + `POST /api/approvals/export` audit event |
| A-61 Document indexing UX: Knowledge Hub uploads don't auto-appear as indexing candidates | RAG Remediation Sprint 1 | Claude Code | Only indexing input is "paste governable text," impractical for large documents | Add a HITL-triggered "select from Knowledge Hub documents" option | HITL live retest of the new selector on production | HITL-reported 2026-07-25. Founder: "Not every document on 'Knowledge Hub' should be auto-indexed (should be HITL)." Likely contributes to A-55. **Code shipped 2026-07-26**: `DocumentsSection.tsx` selector + `ingestTenantDocument(documentId)` reindex path -- see `RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26.md`. PDF text still must be pasted manually (no extraction pipeline exists); kept `Blocked` pending HITL live retest |
| A-62 Stale "Pitch deck" placeholder document remains in the governed RAG index | RAG Remediation Sprint 1 | Claude Code | Only source both RAG queries cited; content literally says "Tenant 0 dummy data" | Remove stale entry; index real documents (A-61) | HITL must archive the stale document in Knowledge Hub, then confirm it no longer appears in RAG citations | HITL-reported 2026-07-25. Founder: "This governed RAG doc is redundant, supposed to go." Directly related to A-55. **Code shipped 2026-07-26**: `canRetrieveDocument()` in `governedRag.ts` now excludes archived documents from RAG retrieval (previously only excluded deleted) -- the existing Archive button in Knowledge Hub now genuinely works as a cleanup path. Root cause (code-level inference, no live DB access in this environment): a real persisted document created via the Documents & Files paste-text form during earlier testing, not hardcoded/seeded. See closeout doc |
| A-63 Unclear whether "Create Task/Approval from Answer" carries RAG answer content into the created record | RAG Remediation Sprint 2 | Claude Code | Behavior not confirmed either way | Code-level read of both action handlers | -- | HITL-reported 2026-07-25. **Resolved 2026-07-26**: excerpt/citations already flowed through; question and full answer did not. Both now stored in `ai_operation_reviews.metadata` and carried into every created record's description (plus structured `metadata` for approval/stakeholder-note/project-update) |
| A-64 "Ask AI Workspace" routes to Tasks & Workflow instead of AI Workspace | RAG Remediation Sprint 2 | Claude Code | Confirmed wrong destination | Fix the route | -- | HITL-reported 2026-07-25. Founder: "Totally incorrect... incorrect workflow." **Resolved 2026-07-26**: guided-demo Next-button label/destination mismatch, same root cause as A-59 |
| A-65 "Send Feedback" should notify triaxisgrp@gmail.com | RAG Remediation Sprint 3 | Claude Code (needs live delivery verification) | Real `beta_feedback` table write confirmed (ED-1); email notification unconfirmed | Check current config against this requirement | HITL to confirm `RESEND_API_KEY` is set in the live Vercel environment and that a test feedback submission actually reaches triaxisgrp@gmail.com | HITL-reported 2026-07-25. **Code shipped 2026-07-26**: `feedbackEmail.ts` sends via the same Resend provider `invitationEmail.ts` uses; honest `not-configured`/`sent`/`failed` status recorded in audit metadata. Delivery itself explicitly NOT verified -- same open question as A-08 (shared provider, unconfirmed production delivery) |
| A-23 Verify Android signed build path | 5 | External (Dun & Bradstreet India) | Company-owned Google Play Console credentials pending D-U-N-S issuance for Triaxis Ventures Private Limited | Track D-U-N-S reference `DR071320262903910840`; follow up with `serviceindia@dnb.com` if no response within ~30 days of the 2026-07-13 submission | 65% (code + Sprint 5 non-credentialed engineering checks verified: typecheck, store-release-gate, capacitor doctor/store-doctor all pass) | `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md` |
| A-24 Verify iOS build/TestFlight path | 5 | External (Dun & Bradstreet India / Apple) | Company-owned Apple Developer Program credentials pending D-U-N-S issuance | Same next action as A-23; Apple Developer Program organization enrollment specifically requires the D-U-N-S Number | 30% (code; Sprint 5 confirmed this environment also has no macOS/Xcode toolchain, so iOS builds can only ever happen via EAS cloud build or a physical Mac, independent of credential status) | `docs/readiness/MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md` -- also carries the pre-existing engineering gaps found in `docs/readiness/READINESS_DAYS_TO_LAUNCH_ANALYSIS_2026_07_23.md` (no real iOS build has ever succeeded in CI, independent of credentials) |

## Closed

| Card | Sprint | Owner | Confidence | Evidence |
|---|---:|---|---|---:|
| A-01 Deploy latest verified build to production | 1, 5 | Claude Code | 95% | Commit `59d1fe0` deployed as `dpl_Dd4z3d7kACCVioeSKFgYZeHx89Uo` (READY, production); live-curl-confirmed serving the new build |
| A-02 Verify create-account success state | 1 | HITL | 95% | 2026-07-25 -- HITL performed a real sign-up (`sudiptakoushiks@gmail.com`) on the live Product deployment via `https://triaxis-www-frontend-import.vercel.app/auth`; screenshot confirms the "Account created" success panel rendered. HITL further confirmed the real Supabase confirmation email arrived, its link was clickable, and authentication passed. HITL reports this applies to both Tenant 0 (Triaxis Ventures Private Limited) and a second new tenant, "Tenant 0.5" (NEPDSIC) -- screenshot evidences the former, the latter is HITL-reported same-day without a separate screenshot |
| A-03 Verify live login flow | 1 | HITL | 95% | HITL signed in successfully on `beta.triaxisventures.com`, 2026-07-24 |
| A-07 Verify profile creation and editing | 1 | HITL | 95% | 2026-07-25 -- HITL filled real profile fields on `/settings` (Profile tab), clicked "Save Profile", confirmed with a real "Profile Updated" message and a real Supabase Auth session panel |
| A-04 Verify logout flow | 1 | HITL | 95% | HITL logged out successfully, returned cleanly to sign-in, 2026-07-24 |
| A-06 Verify Tenant 0 organization provisioning | 1 | HITL | 95% | **First successful live tenant provisioning in this program's history** -- Triaxis Ventures Pvt Ltd provisioned, real workspace loaded, 2026-07-24. **Two-tenant provisioning cleared 2026-07-25:** second real tenant, NEPDSIC (Tenant 0.5), HITL-confirmed provisioned. Provisioning cleared for both tenants; cross-tenant isolation remains separately tracked under A-10/A-11 |
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

### P0 Correction Kanban Update: Public Entry Split (2026-07-24, HITL "Attempt 4")

- Date: 2026-07-24
- Card closed (unlabeled Known Blocker, first flagged in the Sprint 1 pre-work walkthrough as "Investor Preview's Continue to workspace is broken" / "root domain lands on a stale, dead-end authenticated-looking page" -- see the HITL decision note above, never previously root-caused): root-caused and fixed. `/auth`'s "already authenticated" branch treated a demo/investor mock session identically to a real one, so any browser that had ever opened Investor Preview would show "Signed in as Ananya Rao" on every future `/auth` visit regardless of which link led there; a secondary cookie/localStorage TTL desync made "Continue to workspace" appear completely dead once the (non-expiring) localStorage flag outlived the (12-hour) edge cookie.
- Fix: public entry split into `/investor` (isolated investor-demo entry) and `/landing` (beta workspace entry, unconditionally clears stale demo state and only recognizes a genuine Supabase session as "already signed in"), plus a cookie self-heal on every app load while demo mode is active.
- No numbered actionable changed status -- this defect was never assigned an A-XX ID.
- Evidence added: `docs/readiness/P0_PUBLIC_ENTRY_INVESTOR_BETA_SPLIT_2026_07_24.md`; `docs/readiness/TENANT_0_ONBOARDING_ATTEMPTS_2026_07_24.md`; `src/app/landing/page.test.tsx`; `src/app/investor/page.test.tsx`; `src/app/page.test.tsx`; `src/demo/demoMode.test.ts`; `src/auth/AuthProvider.test.tsx`
- HITL decision: requested -- retest both new URLs (`https://www.triaxisventures.com/investor`, `https://www.triaxisventures.com/landing`) directly per the retest instructions in the new closeout document, in a fresh/incognito browser profile to avoid any further stale local state from earlier walkthroughs.

### Sprint TP-1 + TP-2 Kanban Update: Tenant Partitioning & Non-Leakage Hardening Program

- Date: 2026-07-28
- Trigger: HITL live report -- Triaxis Ventures' real Settings > Organization tab showed the
  investor-demo institution "North East Health Mission." Formalized by Codex as a dedicated
  three-sprint program (TP-1/TP-2/TP-3), distinct from the original QA3 five-sprint program.
- Cards moved to Verified (code + test, pending HITL live confirmation -- not plain Closed): A-28
  (the original Settings leak, TP-1), A-69 (new -- the same failure class found in 3 more admin
  surfaces during TP-2's audit: Mobile Release console, Pilot Command Center, Customer Success
  Live Ops, and an unconditional demo RAG query in AI Workspace)
- Cards updated in place, still `Blocked`, unchanged status but new evidence: A-10 (repository
  audit confirms explicit `organization_id` filtering exists at the application layer, not RLS
  alone -- except for the Super Admin role, which this harness would specifically prove or
  disprove), A-11 (now blocked purely on a HITL walkthrough, not infrastructure, since NEPDSIC
  already exists as a second real tenant)
- Cards remaining Backlog: A-29 (Security tab dead Configure buttons + static permissions table),
  A-30 (static Permissions matrix) -- named as TP-2 follow-ups, not actioned this pass, both too
  large for "safe, obvious" scope and neither is a demo/tenant identity leak
- Evidence added: `docs/readiness/TENANT_PARTITIONING_TP1_CLOSEOUT_2026_07_28.md`;
  `docs/readiness/TENANT_PARTITIONING_TP2_CLOSEOUT_2026_07_28.md`;
  `docs/readiness/TENANT_PARTITIONING_DEMO_REFERENCE_INVENTORY_2026_07_28.md`;
  `docs/readiness/TENANT_PARTITIONING_REPOSITORY_BOUNDARY_AUDIT_2026_07_28.md`;
  `docs/readiness/TENANT_PARTITIONING_API_BOUNDARY_AUDIT_2026_07_28.md`;
  `src/features/settings/OrganizationPanel.test.tsx`;
  `src/services/pilot/pilotAcceptanceRuntime.test.ts`;
  `src/features/ai-workspace/AIWorkspaceSection.test.ts` (extended);
  `src/repositories/supabaseEnterpriseRepositories.test.ts` (extended);
  `src/app/api/rag/query/route.test.ts`
- HITL decision: requested -- exact live checks listed in both closeout documents (sign in as
  Triaxis Ventures and NEPDSIC, open Settings > Organization, Mobile Release, Pilot Command
  Center, and Customer Success Live Ops, confirm each shows the real tenant's own name; separately
  confirm Investor Preview is unaffected). TP-3 (the isolation harness + live two-tenant UI proof)
  is the next sprint in this program, not started.

### Sprint TP-3 Kanban Update: Real Two-Tenant Proof and Non-Leakage Release Gate

- Date: 2026-07-28
- Deployment confirmed: all TP-1/TP-2 code is live on `landing.triaxisventures.com`, deployment
  `dpl_GPQHYbu6A8PGMi8xWc9SEtkLC52Y`, built from commit `343620f` -- see
  `PRODUCTION_DEPLOYMENT_CURRENCY_NOTE_2026_07_28.md`.
- Cards updated in place, still `Blocked`, new evidence: A-10 (Docker daemon/staging-project
  environment re-checked directly, confirmed still unavailable; `pnpm run supabase:verify` now
  passes clean -- 100/100 tables RLS-protected, one pre-existing permissive-predicate warning --
  strengthening code-level confidence without substituting for the harness's live proof), A-11
  (full 18-screen-per-tenant walkthrough checklist now exists, not yet executed)
- Cards updated in place, still `Yes (code + test, pending HITL)`, new evidence: A-28, A-69 (both
  now confirmed *deployed* to production, not just committed -- deployment currency and live
  correctness are tracked as separate claims, only the first is closed)
- New infrastructure this sprint (not itself an actionable): `pnpm run test:tenant-boundaries`
  release gate, running the 6 test files covering every tenant-boundary fix from TP-1/TP-2/TP-3
  (38 tests) on demand or in CI.
- No new tenant-leakage defect found this sprint -- scope was proof/gate infrastructure, not a
  fresh code sweep (TP-2 already covered that).
- Evidence added: `docs/readiness/TENANT_PARTITIONING_TP3_CLOSEOUT_2026_07_28.md`;
  `docs/readiness/TENANT_PARTITIONING_ISOLATION_HARNESS_RUNBOOK_2026_07_28.md`;
  `docs/readiness/TENANT_PARTITIONING_LIVE_TWO_TENANT_WALKTHROUGH_2026_07_28.md`;
  `package.json` (`test:tenant-boundaries` script)
- HITL decision: requested -- (1) execute the live two-tenant walkthrough checklist and record
  results; (2) either enable a local Docker daemon or provision a non-production Supabase
  branch/staging project so the isolation harness can finally run for A-10.

### Sprint SA-1 Kanban Update: Profile, Organization and Obvious Settings Dead Ends

- Date: 2026-07-28
- Fixed: top-bar avatar (`TopBar.tsx`) was a purely decorative element with no click target at
  all -- now a real `Link` to `/settings?tab=profile`, matching the standard enterprise-SaaS
  "click your avatar to open your profile" affordance. 3 new tests (`TopBar.test.tsx`).
- Fixed (partially, per this sprint's own scope): Security tab's 6 "Configure" buttons
  (`SettingsSection.tsx`) had no `onClick` handler at all. No real per-item configuration screen
  exists anywhere in the app to route them to, so -- per this sprint's explicit instruction -- all
  6 are now genuinely `disabled` with an honest, short reason instead of an active-looking no-op.
  2 new tests (`SettingsSection.security.test.tsx`). Card updated: A-29, `No` -> `Partially fixed
  (code + test, pending HITL)`, since the row's original literal criterion ("leads to a real
  settings screen") is still unmet by design -- only the dead-click UX defect is resolved.
- Confirmed, not changed: Organization tab (A-28) -- re-ran its existing 4-test regression suite
  before touching adjacent Settings code, no regression. Profile tab -- confirmed it is already a
  real, live-session-backed panel (`ProfilePanel`, `useAuth().session`), not demo-fallback; now
  also the new avatar link's destination. Users tab / invite email delivery (A-08) -- confirmed
  `inviteUser()` already surfaces honest `emailDelivery` status from the 2026-07-27 fix; not
  touched this sprint, no new evidence, card left unchanged.
- Also confirmed, not fixed: the Role-Based Permissions table's original "empty cells" finding
  (part of A-29) does not reproduce in current code -- it renders static, hardcoded per-role
  Check/X data, not empty cells. Its staticness (identical for every tenant) remains open,
  adjacent to A-30.
- Evidence added: `docs/readiness/SETTINGS_ADMIN_SA1_CLOSEOUT_2026_07_28.md`;
  `src/app/layout/TopBar.test.tsx`; `src/features/settings/SettingsSection.security.test.tsx`
- HITL decision: requested -- live-confirm the avatar now opens Profile, and that the 6 Security
  tab controls now read as clearly disabled-with-reason rather than dead links, on
  `landing.triaxisventures.com`.

### Sprint SA-2 Kanban Update: AI Configuration and Permissions Hardening

- Date: 2026-07-28
- Fixed: Permissions tab (`PermissionsPanel`) disclosed the full 6-role capability schema to every
  viewer. Now role-gated: Super Admin/Organization Admin see the full reference matrix, clearly
  labeled; every other role sees only their own row plus an honest denial note. Directly
  implements the founder's own stated preference ("Need not be visible except one's own role").
  4 new tests (`SettingsSection.permissions.test.tsx`). Card updated: A-30, `No` -> `Yes (code +
  test, pending HITL)`.
- Fixed: AI Configuration tab's 5 "AI Engine Configuration" toggles had no `onClick` at all --
  same dead-toggle class as SA-1's Security tab fix. No persisted per-tenant policy exists to write
  to, so disabled with honest per-item reasons rather than fabricating admin editability.
- Fixed: AI Usage Statistics card now fetches this organization's own real usage from the
  pre-existing `GET /api/ai/model-policy` route (already queries `ai_usage_ledger` scoped to the
  session's `organizationId`) -- real counts when usage exists, an honest empty state when it
  genuinely has none, illustrative label (unchanged) only as a fetch-failure fallback.
- Fixed: AI Routing & Providers' "demo" mode badge -- confirmed real and behaviorally load-bearing
  (also gates local-provider fallback), not fake -- now carries an honest caption tied to the real
  `configuredCount` signal so it reads correctly instead of looking like fake/demo data.
- Confirmed, not changed: Language & NLP Coverage panel already renders a real, honest
  per-language model-readiness registry, not a placeholder claim.
- 8 new tests total this sprint (`SettingsSection.permissions.test.tsx`,
  `SettingsSection.aiConfig.test.tsx`). Cards updated: A-31, `No` -> `Yes (code + test, pending
  HITL)`.
- Evidence added: `docs/readiness/SETTINGS_ADMIN_SA2_CLOSEOUT_2026_07_28.md`;
  `src/features/settings/SettingsSection.permissions.test.tsx`;
  `src/features/settings/SettingsSection.aiConfig.test.tsx`
- HITL decision: requested -- live-confirm on `landing.triaxisventures.com` that a non-admin role
  sees only their own Permissions row, and that the AI Configuration tab no longer presents static
  numbers as live tenant activity.

### Sprint SI-1 Kanban Update: Tenant Meeting & Scheduling Connectors

- Date: 2026-07-29
- Origin: founder pasted a generic Calendly embed snippet and, on follow-up, clarified the real
  need -- every pilot tenant should be able to link their own Google Calendar/Meet, Zoom, and
  Microsoft Teams, not a single Triaxis-owned Calendly link.
- Audit: Gmail/Outlook/Slack/Calendly/Airtable/HubSpot/Notion already had real per-tenant OAuth
  connectors. Google Calendar and Microsoft Teams existed only as catalogue placeholders
  (`pilotEnabled: false`, no real OAuth contract); Zoom did not exist anywhere.
- Added: 3 new real OAuth connector contracts (`google_calendar`, `teams`, `zoom`) on the existing
  provider-agnostic OAuth engine (`connectorContract.ts`, `oauthProvider.ts`) -- no new
  architecture, no database migration (provider_id is free text, not an enum). Flipped
  `google_calendar`/`teams` to pilot-enabled and added `zoom` as a new catalogue entry
  (`pluginRegistry.ts`), so all 3 now appear in the Settings quick-connect grid.
- 10 new tests across `connectorContract.test.ts`, `oauthProvider.test.ts`, `pluginRegistry.test.ts`.
  Card added: A-70, new, `Blocked` -- code/tests complete, but no tenant can connect until the
  founder registers real OAuth apps in Google Cloud Console, Zoom App Marketplace, and Microsoft
  Entra, and sets the client id/secret env vars in production.
- Flagged, not independently verified: Zoom's exact OAuth scope strings need confirming against
  Zoom's current App Marketplace docs before going live -- noted directly in code.
- Evidence added: `docs/readiness/SETTINGS_ADMIN_SI1_CLOSEOUT_2026_07_29.md`
- HITL decision: requested -- register OAuth apps for Google Calendar (add the Calendar scope to
  the existing Google app), Zoom (new app), and Microsoft Teams (add scopes to the existing
  Microsoft app), then set `ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET` in production (Google/Microsoft
  reuse existing env vars).

### Connector Batch Update (2026-07-30): Linear, GitHub, Google Sheets/Docs/Slides, WhatsApp Business, X

- Date: 2026-07-30
- Origin: founder-scoped work while reviewing product alignment against YC RFS themes across the
  last 4 batches (Government software, AI for Governments, Company Brain/AI Operating System for
  Companies/SaaS Challengers/Software for Agents, AI-Native Compliance Architecture) -- founder's
  own framing: implement only where genuine overlap already exists with the product's own market
  findings/TAM-SAM-SOM/GTM, not "build for YC."
- Audit: Notion/Slack/HubSpot (already real, pre-existing) and MS Teams (real since SI-1) needed
  no code -- only production credentials, already requested via the standard naming convention.
- Added: 2 catalogue-only connectors extended to real OAuth contracts (Linear, GitHub); 3 new
  Google-based connectors reusing the existing Google OAuth app (Sheets, Docs, Slides); 1
  catalogue-only connector extended with an explicit Meta-verification caveat (WhatsApp Business);
  1 brand-new PKCE-required connector (X/Twitter).
- Incidental fix: GitHub's OAuth token endpoint defaults to form-encoded responses, not JSON --
  `exchangeOAuthCode` now sends `Accept: application/json` unconditionally (safe for every
  existing provider, all of which already return JSON regardless).
- 9 new tests across `connectorContract.test.ts`/`oauthProvider.test.ts`; exact-list/count
  assertions in `pluginRegistry.test.ts` updated (18 pilot-enabled connectors, up from 11).
- Card added: A-77, `Blocked` -- code/tests complete, zero production credentials exist for any of
  the 7 new/extended providers.
- HITL decision: requested -- register OAuth apps in Linear/GitHub/Meta/X developer consoles, set
  the corresponding env vars, register each new Google-based redirect URI in the same Google Cloud
  OAuth Client used for Calendar/Drive, then live-test at least one connect-and-import cycle per
  provider.
