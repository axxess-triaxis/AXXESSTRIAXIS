# Pilot Evidence -- Formalized for Paxel / YC Assessment (2026-07-27)

Date: 2026-07-27
Trigger: Paxel (YC tool) surfaced five pilot-readiness questions from its own analysis of prior
Claude Code session transcripts; the founder answered informally in chat. This document reconciles
those chat answers against this repository's own tracked evidence before they are formalized for a
YC assessment, per `CLAUDE.md`'s evidence-chain discipline.
Governance: every claim below is either (a) cited to an exact file/row in this repository, or (b)
explicitly marked **unverified / needs a dedicated audit** and not asserted as fact.

## Question-by-Question

### 1. Are pilot users completing onboarding / tenant provisioning?

**Verified, holds up as stated.** Two tenants provisioned and HITL-confirmed live: Triaxis Ventures
Private Limited (Tenant 0) and NEPDSIC (Tenant 0.5). Source: `ACTIONABLES_READINESS_MATRIX.md` A-06.
Onboarding-completion and first-workspace-loaded as discrete, event-instrumented signals do not yet
exist -- provisioning itself is verified, per-step onboarding telemetry is not.

### 2. Are Knowledge Hub uploads surviving refresh and getting indexed?

**Verified, the strongest evidence in this program.** A real production defect was found (uploads
showed a fake success and silently failed to persist, traced to a browser-to-Supabase-Storage
CORS/preflight failure hidden behind a silent fallback), fixed (same-origin `/api/documents/upload`
proxy), and **HITL live-confirmed the same day**: upload succeeded, appeared in the Documents & Files
indexing selector, survived a session refresh. Source:
`KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md`.

### 3. Are AI Review items turning into tasks or decisions?

**Partially verified; the full breadth claimed does not match tracked status.** Verified:
AI Review -> real Task (`A-13`'s original walkthrough, "Create Task" + "Approve and Create" produced
a real task, real audit trail). AI Review -> Stakeholder Note (`A-57`, root-caused and fixed
2026-07-26, **not yet HITL-confirmed live**). **Not found anywhere in this session's evidence:**
AI Review converting into projects, programs, or meetings specifically. The general version of this
claim, `A-16` ("verify approved AI output creates real work"), remains `Blocked` in the matrix, not
`Yes` -- meaning this repository's own tracking does not yet certify the broad claim. **Recommend
narrowing to "AI Review converts to real Tasks (live-verified) and Stakeholder Notes (fixed, pending
live confirmation)" unless the broader claim can be sourced.**

### 4. Are tenant-scoped workflows actually being used?

**Update, 2026-07-27, same day:** all four routing defects (`A-35`, `A-36`, `A-37`, `A-39`) were
root-caused and fixed after this document's original commit (`570975a`), following the founder's
explicit go-ahead to start on them. `A-35`: the app already called `betaFeedbackRepository.list()`
on the admin Product Analytics page but only ever reduced it to a count -- added a real Feedback
Inbox rendering each submission (type, module, rating, message, submitter, timestamp). `A-36`/`A-37`:
both `/admin/invitations` and `/admin/roles` redirected to bare `/settings`, which defaulted to the
Security tab regardless of intent -- `SettingsSection.tsx` now reads an explicit `?tab=` query
parameter, and both redirects now pass `?tab=users` (the tab with the real, tested invite and
per-user role-change controls). `A-39`: the "Send feedback" checklist step was hardcoded to
`/dashboard`, which has no feedback surface -- it now directly opens the app's existing, real
`BetaFeedbackButton`/`BetaFeedbackModal` instead of navigating away. All four: typecheck, lint
(zero warnings), and the full test suite (152 files / 605 tests, up from 148/595 pre-fix) pass; 8 new
tests added directly covering these fixes. **Deployed to `landing.triaxisventures.com` the same day**
(`dpl_8QvjWHsaUFGAqDdqVCaB6CJb3WNd`), with explicit founder confirmation before deploying.
**HITL live-retested post-deploy, same day: A-36, A-37, and A-39 are confirmed working and closed**
(founder's own words: "Invite Pilot team: Lands on 'Settings' correct page, has option to invite
team. Assign roles - Lands at 'Users' has functionality to assign role. Send feedback - Correctly
opens on feedback form. Close all 3."). **A-35 remains pending** -- deployed, but not yet separately
confirmed that a real submission now appears in the new Feedback Inbox (the founder's earlier
feedback screenshot was submitted against the pre-fix deployment).

**Original 2026-07-27 finding (superseded by the fix above, kept for the record):** `A-41` (Golden
Path step-to-workspace mapping, the closest tracked proxy for this question) showed 6 of 10 Golden
Path items correctly mapped and 4 confirmed incorrect. "Almost fully used" did not match a
documented 4-of-10 open failure rate at the time this document was first written.
**Recommended formal statement (updated, post-live-retest):** "9 of 10 Golden Path workflow entry
points are live HITL-confirmed correctly routed as of 2026-07-27; the 10th (feedback-submission
visibility in the admin inbox) is code-and-test-verified and deployed, pending a final live check
that a real submission appears there. All 4 defects found in the 2026-07-25 walkthrough were
root-caused, fixed, tested, and deployed the same day the pilot-readiness question was raised
(2026-07-27); 3 of the 4 are now live-confirmed closed by the founder."

### 5. Are errors clustered around auth, upload, RAG, or workspace loading, and how much is rectified?

**No fabricated percentage.** What is directly countable as of 2026-07-27:

- **12 distinct, dated remediation/closeout documents exist** in `docs/readiness/` -- not 8:
  `SPRINT_1_TENANT_0_PRODUCTION_ACTIVATION_CLOSEOUT`,
  `SPRINT_2_LIVE_GOLDEN_PATH_EXECUTION_CLOSEOUT_2026_07_24`,
  `SPRINT_3_TWO_TENANT_ISOLATION_PERMISSION_PROOF_CLOSEOUT_2026_07_24`,
  `SPRINT_4_INTEGRATIONS_ANALYTICS_OPERATIONAL_EVIDENCE_CLOSEOUT_2026_07_24`,
  `SPRINT_5_QA3_CLOSURE_NON_HITL_DELTA_CLOSEOUT_2026_07_24`,
  `EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25`, `..._ED2_CLOSEOUT_2026_07_25`,
  `..._ED3_CLOSEOUT_2026_07_25`, `RAG_REMEDIATION_SPRINT_1_SOURCE_INTEGRITY_CLOSEOUT_2026_07_26`,
  `..._SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26`, `..._SPRINT_3_WORKFLOW_POLISH_CLOSEOUT_2026_07_26`,
  `KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26`.
- **At least 6 distinct dated HITL walkthrough sessions** are directly citable in
  `ACTIONABLES_READINESS_MATRIX.md`: 2026-07-22, 2026-07-24, 2026-07-25 (first pass), 2026-07-25
  (explicitly logged as a second, same-day re-walkthrough), 2026-07-26. This is a floor, not a
  ceiling -- no full line-by-line audit was performed to rule out more.
- **Current tracked tally**: 67 actionables, 36 `Yes` / 19 `Blocked` / 12 `No`
  (`ACTIONABLES_READINESS_MATRIX.md`, 2026-07-27, updated same day after the A-35/36/37/39 fixes
  below moved 4 rows from `No` to `Yes`).
- **A precise auth/upload/RAG/workspace-loading-specific defect burn-down (open-count ->
  rectified-count) has not been computed.** Building one requires a dedicated pass tagging all 67
  rows by area, not an estimate. **Do not state a percentage for this until that pass is done.**

## Recommended Formal Statement (Corrected)

> AXXESS TRIaxis has 2 HITL-confirmed provisioned pilot tenants, a verified Knowledge Hub
> upload-persistence-and-indexing loop (a real production defect found, fixed, and live-confirmed the
> same day), AI Review conversion into real Tasks (live-verified) and Stakeholder Notes (fixed,
> pending live confirmation), and a Golden Path workflow-routing map that was 6-of-10 correct as of
> 2026-07-25, with all 4 remaining routing defects root-caused, fixed, tested, and deployed the same
> day this assessment was prepared (2026-07-27) -- 3 of the 4 (Invite Pilot Team, Assign Roles, Send
> Feedback) are now live HITL-confirmed closed in production; the 4th (feedback-submission inbox
> visibility) is deployed and pending a final live check. The program has produced 12 dated
> remediation closeout documents across at least 6 distinct HITL walkthrough sessions, currently
> tracking 67 actionables at 36 confirmed-working-or-fixed / 19 blocked-on-external-dependency / 12
> confirmed-defect. A precise defect-rectification percentage for auth/upload/RAG/workspace-loading
> specifically has not yet been computed and is not claimed.

## What Would Strengthen This Before Submission

1. ~~Fix or explicitly re-scope A-35/A-36/A-37/A-39 (the 4 open Golden Path routing defects) before
   claiming workflows are "almost fully" used.~~ **Done, 2026-07-27** (code + test; see Question 4
   above). Remaining gap: HITL has not yet live-walked these four in production.
2. Source or drop the "AI Review converts to projects/programs/meetings" claim.
3. If a precise error-rectification percentage is wanted, run the dedicated area-tagging pass across
   all 67 actionables first.
4. Build the `trackPilotEvent()` instrumentation Paxel's own analysis proposed (tenant provisioning,
   document upload/index chain, AI Review conversion, workflow step tracking, error clustering) so
   future claims are backed by real event queries instead of chat recollection.
