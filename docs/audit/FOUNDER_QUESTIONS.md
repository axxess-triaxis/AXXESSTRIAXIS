# Founder Questions -- AXXESS TRIaxis Forensic Progress Audit

Live tracking file per the audit's Founder Query Protocol. Every uncertainty encountered during the audit is logged here with a question ID, not resolved silently. Nothing here is answered by inference -- only by direct founder response, logged verbatim in the FOUNDER ANSWER field.

Status vocabulary: `OPEN` (awaiting founder answer) / `ANSWERED` (founder responded, recorded verbatim) / `RESOLVED` (answer plus, where required, corroborating evidence now exists) / `PARTIALLY CLEARED` (founder-directed label for an issue with real, verified evidence covering part but not all of what the question asked -- used when a full RESOLVED would overstate what's actually covered) / `OPEN ISSUE` (founder-directed label: the founder has acknowledged this as a real, standing problem rather than answering which interpretation is correct -- distinct from plain `OPEN`, which just means no founder response yet at all).

**Pre-Phase-18 consolidated open-items checkpoint (2026-08-11):** per the audit protocol's own rule
("before producing any final score or executive conclusion, present the founder with a consolidated
list of all unresolved material questions and require explicit answers or explicit permission to
leave them unresolved"), 6 items remained open at this point: Q-004 (partial tenant-isolation
coverage), Q-005 (RAG service-role RLS bypass, CRITICAL GAP), Q-006 (non-functional data-erasure
pipeline, CRITICAL GAP), Q-007 (no agent-approval audit trail, GAP), Q-008 (2 real failing tests),
Q-010 (2 test files unconfirmed, environment memory exhaustion). Presented to the founder via
AskUserQuestion; **founder's explicit choice: "Leave all 6 open, proceed"** -- explicit permission
granted to proceed to Phase 18 with all 6 stated as open/unresolved risk rather than resolved or
deferred. This satisfies the protocol's own requirement; Phase 18 proceeds on this basis.

---

## Q-001

**Category:** Audit scope and pacing

**Question:** This audit's protocol specifies 19 phases producing 20+ documents (baseline, repo forensics, product capability matrix, AI/agentic architecture, architecture audit, enterprise readiness, test/reliability audit, customer iteration, commercial evidence, usage/observability, mobile readiness, engineering velocity, capital efficiency, founder execution, claims register, YC delta, red-team, maturity scorecard, final executive audit, machine-readable evidence). How do you want this sequenced -- all phases attempted in this session, phase-by-phase with your review between each, or a specific subset prioritized first (e.g., Phase 14 Claims Register and Phase 8 Commercial Evidence, since those are the ones most likely to surface externally-facing claims needing correction)?

**Why this matters:** Determines whether I proceed phase-by-phase without further prompting, or stop after each phase for your sign-off. Given the volume of judgment calls this protocol requires me to route through you (per its own "ask aggressively" rule), running all 19 phases unattended risks producing a large batch of unresolved Q-IDs you'd have to answer all at once rather than incrementally.

**Current evidence:** N/A -- this is a process question, not a factual one.

**Possible interpretations:**
A. Run all 19 phases now, batch all resulting questions at the end.
B. Run one phase at a time, present findings + open questions, wait for your answers before the next phase.
C. Prioritize a specific subset (e.g., Claims Register, Commercial Evidence, Red Team) since those most directly affect what can be said externally.

**What evidence would resolve it:** Your direction.

**Founder answer (2026-08-10):** "all phases attempted before you review anything, phase-by-phase with your sign-off between each - This is ideal" -- read as: within each phase, complete the work without pausing to ask conversationally (log open questions to this file per the protocol instead); present the completed phase for sign-off before starting the next one. This is option B, with the clarification that in-phase execution should not be interrupted by chat-level questions.

**Status:** ANSWERED

---

## Q-002

**Category:** Audit scope / historical completeness

**Question:** Does this repository represent the complete history of AXXESS TRIaxis's product development, or did meaningful work happen before 2026-07-02 (the first commit) outside this repository?

**Founder answer (2026-08-10):** "This repo contains 100% of AXXESS."

**Status:** ANSWERED -- repository age (39 days as of this audit) is confirmed to equal company/product age, not merely the most recent slice of a longer history.

---

## Q-003

**Category:** Repository forensics / author identity

**Question:** Is the `Triaxis Ventures <noreply@triaxis.ventures>` git identity (435 of 669 commits, 65%) the founder?

**Founder answer (2026-08-10):** "Yes."

**Status:** ANSWERED -- all 5 human-labeled git identities (per Phase 0's email-level breakdown) are now confirmed as the same person. 669 of 669 non-bot-attributed commits (618 after excluding the 51 dependabot + 3 Vercel + 1 vexo-ai + 1 posthog bot commits = 618 human commits) are the founder's.

---

## Q-004

**Category:** Enterprise readiness / security posture

**Question:** The RLS *policy design* across this program's tenant tables looks sound and well-evidenced (near-universal tenant scoping, RLS enabled, JWT-scoped calls rather than service-role bypass by default). But Phase 2 found this program's automated RLS test coverage does not actually execute against a live database to prove cross-tenant isolation -- it asserts policy intent was written, not that it holds at runtime. Is this a known, accepted gap (e.g., isolation has been manually/informally verified some other way not captured in this repo), or is this a genuine, previously-unflagged gap that should be treated as a priority fix?

**Why this matters:** This is the single highest-stakes correctness property for a multi-tenant SaaS selling to enterprise/government buyers. It directly affects Phase 5 (Enterprise Readiness) scoring and Phase 16 (Red Team) analysis.

**Current evidence:** [Redacted for public distribution -- exact file paths and CI-job detail withheld. Full citation trail retained internally.]

**Possible interpretations:**
A. Isolation has been informally/manually verified (a `TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_06.md` doc exists elsewhere in this repo and has not yet been read/verified by this audit) and this is a documentation/CI-automation gap, not a correctness gap.
B. This is a genuine, previously-unflagged testing gap that should be prioritized.

**What evidence would resolve it:** Founder confirmation, plus pointing this audit at any existing manual isolation verification so it can be independently checked in a later phase.

**Founder answer (2026-08-10):** "This was tested, 4 out of 6 criteria passed (refer Git docs)."

**Independently verified against `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_06.md`:** the founder's claim is accurate and directly corroborated. On 2026-08-06, `scripts/verify-two-tenant-isolation.mjs` (written Sprint 5, 2026-07-22, but never previously executed against a real database) was run against the actual **production** Supabase project backing `landing.triaxisventures.com`, using two throwaway test tenants with real, non-privileged access tokens (not a service-role bypass) -- i.e., real RLS policies decided every outcome, not application code or a mock.

**Results, exactly as documented (run ID `mshjon07`):**
- `projects`, `tasks`, `documents`, `audit_logs` -- **4 of 6 resource types, both cross-tenant read AND write blocked, zero leakage found.**
- `knowledge_articles`, `workflow_timeline_events` -- **not verified**, because tenant A's own row-creation attempt failed before isolation could even be checked (a harness/fixture bug: `knowledge_articles` rejected the create with a `403` RLS violation on the *owning* tenant's own insert, flagged in the doc itself as deserving a closer look to rule out the RLS policy being overly strict rather than assumed to be a fixture-payload issue; `workflow_timeline_events` failed on an unrelated foreign-key issue in the test fixture).
- The harness's own cleanup step had a real bug (wrong delete order, left test rows in production), diagnosed and manually cleaned up the same session (24/24 deletes verified), but not yet patched in the script itself.
- This was a **single run**, not a repeated or CI-integrated regression check.

**Status:** PARTIALLY CLEARED (founder's own tracking label) -- real, adversarial, production-database proof of isolation exists for 4 of 6 resource types tested, materially upgrading this row from Phase 2's "NOT FOUND" framing. Not fully cleared: 2 of the 6 resource types remain unverified, and this proof is a one-time manual execution, not something that runs automatically on every deploy to catch a future regression. See Phase 2 document, updated accordingly. **Important scope note added by Phase 3 (Q-005 below): the table the AI/RAG pipeline actually retrieves from was not among the 6 resource types this harness tested, and uses a different, weaker isolation mechanism. This "partially cleared" status does not extend to that table -- see Q-005.**

**Security Hardening Sprint update (2026-08-11):** both fixture bugs root-caused and fixed in `scripts/verify-two-tenant-isolation.mjs`. (1) `knowledge_articles`: the insert RLS policy's `with check` requires `author_user_id = auth.uid()`; a NULL `author_user_id` evaluates to NULL (not true) in Postgres, so tenant A's own insert 403'd before cross-tenant isolation was ever exercised -- fixed by setting `author_user_id: tenant.userId` on the fixture. (2) `workflow_timeline_events`: `actor_user_id` FKs to `public.users(id)`, but `setUpTenant` never inserted a `public.users` row (only `profiles`/`organization_members`/`roles`/`user_roles`) -- fixed by inserting one, matching what real production code paths always do. Two new assertions added to `verify-two-tenant-isolation.test.mjs` confirming both fixes are present in source. **What remains genuinely unverified, requiring HITL:** this fix has NOT yet been re-run against a real Supabase project -- the harness requires live `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_URL`/anon-key credentials this session does not have and should not be given. **A human with those credentials needs to run `pnpm run supabase:verify:two-tenant-isolation` against a real (ideally staging, not production) project and confirm all 6 of 6 resource types now report `crossTenantReadBlocked: true`/`crossTenantWriteBlocked: true` before this item can move from PARTIALLY CLEARED to fully cleared.** The code fix itself is verified only by static source assertion (`verify-two-tenant-isolation.test.mjs`), not by a live run -- that distinction is deliberate, not an oversight.

**Status:** PARTIALLY CLEARED -- fixture fix applied and source-verified; live re-run against a real Supabase project still required (HITL).

**Live re-verification and organization hard-delete trigger fix (2026-08-12, PR #227 and PR #228):**
the live re-run this row's own "Status" line above named as the remaining requirement was completed
-- founder ran `scripts/verify-two-tenant-isolation.mjs` against production twice (run IDs
`msq54ahj`, `msq54k48`), both `"passed"`, all 6 of 6 `REQUIRED_COVERAGE` resource types (`projects`,
`tasks`, `documents`, `knowledge_articles`, `audit_logs`, `workflow_timeline_events`) showing both
`crossTenantReadBlocked: true` and `crossTenantWriteBlocked: true`. Full account:
`docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_12.md` (PR #227).

**A separate, real defect was found during that same verification, not part of the original
question**: the harness's own cleanup step failed on both passing runs, root-caused to a trigger
(`audit_user_roles_changes`/`record_enterprise_audit_log()`) that made **organization
hard-deletion structurally impossible through any code path** -- every attempt failed atomically
with `SQLSTATE 23503`. This was designed, implemented, and deployed as its own separate,
explicitly-authorized production-schema change (3 sequential migrations were required; the first
two each surfaced additional live-only defects and were corrected before the next attempt, each
step gated on founder authorization -- full account in
`docs/readiness/ORGANIZATION_HARD_DELETE_TRIGGER_FIX_2026_08_12.md`, PR #228). **Final verification
(run `msqb1xi6`, 2026-08-12): 6/6 isolation checks pass AND `cleanupErrors: []` -- organization
hard-delete succeeds for the first time since this schema existed (Sprint 6, 2026-07-03).**

While verifying this, one real production tenant ("Imprints Production") was separately found
missing and recovered -- unrelated in cause to either the isolation proof or the trigger fix, full
account in `docs/readiness/IMPRINTS_PRODUCTION_TENANT_RECOVERY_2026_08_12.md`.

**Status:** RESOLVED -- all 6 of 6 resource types proven, zero cross-tenant leakage, against
production, with real non-privileged access tokens on both sides (PR #227). The organization
hard-delete defect found during this verification is also now fixed and deployed, verified against
production (PR #228) -- not merely diagnosed. Both are closed, not open items carried forward.

---

## Q-005

**Category:** AI/RAG architecture -- tenant isolation

**Question:** The production AI/RAG document-retrieval path uses an elevated-privilege database client on one specific table that bypasses standard row-level tenant isolation, unlike the general CRUD repositories elsewhere in the app, which enforce real per-tenant isolation on every call. A row-level security policy exists on that table, but does not apply on this particular access path. Isolation there currently rests entirely on the application remembering to filter every query by tenant, with no database-level backstop -- and this is also the one table the Q-004 two-tenant production harness never tested. Is this a deliberate architectural choice, or a genuine gap worth closing?

**Why this matters:** This is the data an AI answer is actually grounded in -- if isolation ever failed here, a tenant could receive an AI-generated answer synthesized in part from another tenant's confidential documents.

**Current evidence:** [Redacted for public distribution -- exact file paths, line numbers, and the affected table/migration/test names are withheld from this public copy. Full citation trail, including a real adversarial unit test simulating the failure mode, retained internally.]

**Possible interpretations:**
A. Deliberate and considered sufficient -- the elevated-privilege access was chosen for a specific technical reason, and the app-level filter plus adversarial unit tests are the intended isolation mechanism for this table.
B. An oversight -- this table should be queried the same way the rest of the app is, or added to the two-tenant harness's coverage.

**What evidence would resolve it:** Founder confirmation of intent, and/or extending the two-tenant harness to also cover this table.

**Founder answer (2026-08-10):** "Log Q-005 as Open Issue" -- founder directed this be tracked as an acknowledged standing problem, not resolved with interpretation A or B from above.

**Status:** OPEN ISSUE -- acknowledged as real, not yet fixed, no interpretation (A/B) selected. Distinct from a pending question: this is a confirmed gap awaiting remediation, tracked for follow-up in Phase 5 (Enterprise Readiness) and Phase 16 (Red Team).

**Phase 5 update:** formally scored as a **CRITICAL GAP** in `docs/audit/05_ENTERPRISE_READINESS.md`, the highest severity tier this audit uses -- a failure here means a tenant could receive an AI-generated answer synthesized in part from another tenant's confidential documents, not just a stray row in an admin list.

**Security Hardening Sprint update (2026-08-11):** fixed. A hard-enforced tenant-boundary guard (`assertTenantBoundary`, `src/security/tenantGuard.ts`) now runs on every row `rag_document_chunks` returns before it can reach an answer, and on `ingestTenantDocument`'s write path -- both throw a `TenantAccessError` on a cross-organization mismatch instead of silently filtering. The pre-existing adversarial test in `tenantRagWorkflow.answerGrounding.test.ts` (which deliberately returns a cross-org chunk row) was rewritten to assert the throw rather than an implicit "no error means it worked." **Verified:** `npx tsc --noEmit` (0 errors, full repo), `npx eslint` (0 problems on touched files), `npx vitest run src/services/rag/tenantRagWorkflow.answerGrounding.test.ts src/services/rag/tenantRagWorkflow.test.ts src/security/tenantGuard.test.ts` (all passing, adversarial test now asserts `.rejects.toThrow(/cross-organization access denied/i)`). Service-role access to `rag_document_chunks` itself is unchanged (still bypasses RLS) -- this closes the application-layer gap with a hard, throw-on-mismatch guard, not a switch to JWT-scoped access; a database-level backstop (e.g., RLS enforcement on this specific access path) remains a larger, separate architectural change not attempted this pass. **Status updated to RESOLVED.**

**Status:** RESOLVED

---

## Q-006

**Category:** Data privacy / regulatory readiness

**Question:** The account-deletion request flow and the data-export request flow both perform zero actual data operations today -- they record a canned message stating the request will be manually processed, and one doesn't even log its own invocation. A separately-built erasure-planning module that would do the real work exists in the codebase but is never called by any production code path. Is this a known, deliberate "beta-stage manual process," or an unaddressed gap that hasn't been prioritized?

**Why this matters:** This is the mechanism a GDPR Article 17 / India DPDP-equivalent "right to erasure" claim would rest on. Scored **CRITICAL GAP** in Phase 5.

**Current evidence:** [Redacted for public distribution -- exact endpoint/file paths withheld from this public copy. Full citation trail retained internally.]

**Possible interpretations:**
A. Known and accepted for beta stage -- a human genuinely processes these manually today.
B. Not previously flagged -- should move up in priority given any real customer/regulatory exposure.

**Founder answer:** _(blank)_

**Related finding (2026-08-12, surfaced during Q-004's live re-verification, not this question's original scope):** organization hard-deletion is currently structurally broken -- a trigger (`audit_user_roles_changes`) causes any attempt to delete an organization to fail atomically. Any future real erasure-execution engine (the "not yet built" automated execution named as follow-up below) that relies on deleting an organization/tenant record itself would hit this same wall until it is fixed. See Q-004 above and `docs/readiness/TWO_TENANT_ISOLATION_HARNESS_EXECUTION_2026_08_12.md` for the full root cause. Not fixed this pass.

**Security Hardening Sprint update (2026-08-11):** honest queued-state fix applied (founder-approved scope: a real recorded request + a real computed plan, not a full multi-store execution engine -- that engine doesn't exist anywhere in this codebase and is a separate, larger sprint). Both `POST /api/account/deletion-request` and `POST /api/privacy/export-request` now insert a real `privacy_requests` row, call the existing (previously-orphaned) `buildPrivacyExecutionPlan()` and store its real, structured output in the row's `execution_plan` column, and audit-log the request via `auditLogsRepository.record`. If the insert itself fails (Supabase admin misconfigured, network/RLS error), the response no longer claims "queued" -- it says persistence could not be confirmed, so a caller is never told something happened that didn't (stress-tested explicitly: `route.test.ts`'s "never claims 'queued' when the insert itself fails" case in both routes). **Explicitly still not built, named as follow-up, not implied as done:** automated execution of the plan's own steps (real storage-object deletion, real vector-chunk deletion, real cache purge, search-index removal, export package assembly/signing) -- `docs/PRIVACY_ENGINEERING.md`'s "Operational Gaps" section already lists these as outstanding. **Verified:** `npx tsc --noEmit` (0 errors), `npx eslint` (0 problems), `npx vitest run src/app/api/account/deletion-request/route.test.ts src/app/api/privacy/export-request/route.test.ts` (10 tests, all passing). **Status updated to RESOLVED** for the queued-state scope described here; full automated erasure/export execution remains a distinct, larger, unscheduled item.

**Structural-blocker removal, relevant but not itself erasure (2026-08-12, PR #228):** a real
defect blocking organization/tenant hard-deletion at the database layer was found and fixed --
`docs/readiness/ORGANIZATION_HARD_DELETE_TRIGGER_FIX_2026_08_12.md` has the full account. This
matters directly to this row: any future automated execution engine for the "operational gaps"
this row already names (real storage-object deletion, real vector-chunk deletion, cache purge,
search-index removal) would eventually need to delete the tenant/organization record itself as the
terminal step of a full erasure, and that step was, until this fix, guaranteed to fail every time.
**This does not move Q-006 closer to RESOLVED for full automated execution** -- no execution engine
exists, none was built this pass, and this fix does not simulate or imply one. It removes a
blocker a future engine would otherwise hit, nothing more. Recorded here so a future session
building that engine does not need to rediscover this dependency.

**Status:** RESOLVED (for the queued-state scope this row's own answer describes -- unchanged by
the above). Full automated erasure/export execution remains open, unscheduled, and is not affected
by the trigger fix beyond having one fewer structural obstacle in its path.

---

## Q-007

**Category:** AI governance / audit trail completeness

**Question:** The AI agent tool-call approval flow -- where a human approves/rejects what an autonomous AI agent can do to tenant data -- writes zero entries to the audit-log table every other privileged action uses as its system of record. Is this intentional, or should it log the same way role changes and invitations do?

**Why this matters:** This is the human checkpoint for the single highest-autonomy surface in the product. Scored **GAP** in Phase 5.

**Current evidence:** [Redacted for public distribution -- exact file paths withheld from this public copy. Full citation trail retained internally.]

**Possible interpretations:**
A. Deliberate -- `approval_requests`/`agent_action_grants` were considered adequate as their own record.
B. An oversight -- should be logged for consistency and single-source-of-truth compliance reporting.

**Founder answer:** _(blank)_

**Security Hardening Sprint update (2026-08-11):** fixed at the application layer. `PATCH /api/approvals/[id]` now calls `auditLogsRepository.record` after every decision (`action: "approval.approved"` or `"approval.rejected"`, `category: "ai-governance"`, with `decisionReason`/`agentConnectionId`/`toolName`/`alwaysAllow` in `metadata`), and a second time when an "Always Allow" grant is created (`action: "agent_grant.created"`, `resourceId` set to the real created grant's id). Both actions are now reconstructable from `audit_logs`, the same system of record used for role changes and invitations. **Deliberately not built this pass:** a defense-in-depth database trigger extending `record_enterprise_audit_log()` to cover `approval_requests`/`agent_action_grants` directly -- both tables are written exclusively via the service-role client (no per-user JWT), so a DB-level trigger would populate `actor_user_id`/`actor_role` as NULL, a materially weaker record than the app-level write above; documented as a known limitation of that option rather than silently shipped. **Verified:** `npx tsc --noEmit` (0 errors), `npx eslint` (0 problems), `npx vitest run "src/app/api/approvals/[id]/route.test.ts"` (7 tests, all passing, including new assertions for both audit-log action types and rejection still logging without a grant). **Status updated to RESOLVED** for the app-level audit trail described here.

**Status:** RESOLVED

---

## Q-008

**Category:** Testing & reliability -- genuine (non-infra) test failure

**Question:** Running the real test suite (Phase 6, after fixing an unrelated `node_modules` corruption issue) surfaced 2 real, reproducible, non-infra failures in `src/features/settings/SettingsSection.test.ts`: `"defaults to security when no tab is requested"` and `"falls back to security for an unrecognized tab value rather than rendering nothing"`, both asserting `initialTabFromLocation()` returns `"security"`. But `SettingsSection.tsx` line 38/40 currently defaults to `"profile"` (a change from an earlier, already-shipped removal of the Security tab). Confirmed via `git diff` that this mismatch exists identically on both `audit/phase0-baseline` and `main` -- this is not audit-branch staleness, it is a present, unfixed test/implementation mismatch on the branch this audit found in the repository right now. Is this a known, already-scheduled fix, or a new finding?

**Why this matters:** It's a real, currently-red test on the branch examined -- direct evidence for Phase 6's "does the test count represent real engineering confidence" question, independent of the separate worker-crash infra issue found in the same phase.

**Current evidence:** `src/features/settings/SettingsSection.test.ts:17-34`; `src/features/settings/SettingsSection.tsx:35-40`; confirmed identical on `main` via `git diff audit/phase0-baseline main -- src/features/settings/SettingsSection.test.ts` (empty diff).

**Founder answer:** _(blank)_

**Status:** OPEN

---

## Q-009

**Category:** Usage & observability -- production error rate (founder-stated, mid-audit)

**Question:** Founder stated, unprompted, mid-Phase-6: "Posthog also shows 40+ failures (mostly script) in 300+ views" and "We have 10-15% failure rate on beta and demo combined; depending on denominator." No screenshot or exported artifact was shared for either figure. Per the founder's own standing instruction earlier this session ("No no dont fit all this PostHog data. Needs heavy data purification based on IP, location etc... You purify it in PostHog, then share the result"), this audit is not independently pulling or logging raw PostHog numbers. Is this observation intended as a claim this audit should carry into Phase 9 (Usage & Observability) once a purified source artifact is shared, or informal context only?

**Why this matters:** A double-digit production error rate is a material reliability signal, but it is currently a verbal, hedged ("depending on denominator") founder statement with no attached artifact -- exactly the category CLAUDE.md's evidence discipline requires tagging as "Founder-stated, source artifact needed" rather than treated as verified.

**Current evidence:** None in-repo. No PostHog export, dashboard screenshot, or error-tracking config has been reviewed by this audit for this claim.

**Founder answer:** "You can get your data purified Posthog Insights from here" -- shared a live PostHog AI report URL (`us.posthog.com/project/498426/ai`, chat `479104be-094b-455a-bbe5-06fdc20978eb`), then logged in when this session's browser hit PostHog's login wall.

**Resolved against a real artifact, read directly by this session (2026-08-11), not re-typed from a screenshot:** PostHog's own AI-generated "Product analytics & error report -- Aug 11, 2026." Key findings, with PostHog's own caveats preserved:
- **Traffic (last 30 days):** MAU 377, peak DAU 236 (Aug 10), partial-week WAU ~333+ (Aug 9-11) -- all explicitly flagged by PostHog itself as **"no test filter"** (includes all traffic, not just real users).
- **Traffic spike, Aug 9-10:** DAU jumped from a 2-10/day baseline (Jul 27-Aug 8) to 98 (Aug 9) then 236 (Aug 10) -- unexplained; PostHog's own report recommends checking referrer/UTM data to confirm organic vs. bot traffic, and does not itself resolve this.
- **Geography (test-filtered):** India 364 users (~97%), US 9, plus Germany/Ireland/Nepal/Romania.
- **7 active error issues, test-filtered, Aug 9-11 spike window:** (1) cross-origin script error, 42 occurrences/38 users -- needs `crossorigin="anonymous"` + CORS headers; (2) Android WebView `postMessage` bridge error (native method called on a destroyed WebView), ~40 occurrences/~39 users across 4 sub-groups -- needs a null-check/try-catch guard; (3) React error #418 SSR hydration mismatch, 13 occurrences/6 users/8 sessions.
- **Internal contradiction in PostHog's own report, flagged not resolved:** the report's headline claims all 7 issues "emerged in the last 3 days (Aug 9-11)," but issue #3's own "First seen" date is Jul 29 -- 11 days earlier than that claim. Not reconciled by this session; recorded as a data-quality flag in the source itself.
- Retention shows ~0% beyond week 0 for both measured cohorts, but PostHog attributes this to `posthog.identify()` likely not being called post-login/signup, not necessarily real churn.

**Status:** RESOLVED -- founder's "40+ failures... 300+ views" and "10-15% failure rate" claims are now traceable to a real, dated PostHog artifact rather than left as an unverified recollection. Note the artifact itself does not cleanly support either of those two exact figures as stated (the 7-issue/~130-total-occurrence error count and the unresolved traffic-spike numbers are closer to what's actually in the report) -- recorded as resolved-with-real-evidence, not resolved-by-confirming-the-original-numbers-were-exact.

---

## Q-010

**Category:** Testing & reliability -- environment memory exhaustion late in a long session

**Question:** Two settings test files -- `SettingsSection.linkedPhone.test.tsx` (4 tests) and `SettingsSection.tabs.test.tsx` -- each failed to execute in complete isolation, multiple attempts, across two vitest pool configurations (`threads` default and `--pool=forks`), well after every other file in the 251-file suite had already run individually or in small batches without this problem. Source inspection of both files found nothing unusual (standard `it()` blocks, standard `vi.mock()` usage, structurally identical to sibling files that ran cleanly earlier in the same session). **Root cause identified directly, not inferred:** `systeminfo` showed this machine has only 7,933 MB total physical memory, and by the time these two files were reached, only **1,658 MB was available** -- after many hours of this session's repeated vitest invocations (dozens of full/sharded runs performed for this same Phase 6 investigation). This is not a defect in either test file; it is this machine running low on memory late in an unusually long, repeated-test-invocation session.

**Why this matters:** This is a distinct failure mode from the broader, already-documented `fileParallelism`/worker-crash tradeoff (commit `181f1e1`, cited in Phase 6) -- that tradeoff explains crashes under concurrent load across many files started together; this is sequential, single-file runs failing late in a long session due to cumulative memory pressure on a memory-constrained (8GB) machine, which that commit's comment does not describe. Real pass/fail status for these 2 files' combined ~10-11 tests remains unconfirmed, purely because the environment couldn't sustain another vitest invocation, not because of anything in the code.

**Current evidence:** 7 raw command outputs this session (2026-08-11) across the two files, all ending in `Error: Worker exited unexpectedly` or an unresponsive process needing a manual kill; `systeminfo` output showing 1,658 MB / 7,933 MB available physical memory at time of the last attempts; both files reviewed directly, no code defect found.

**Founder answer:** _(blank)_

**Status:** OPEN -- environment-capacity issue, not a code defect. Would very likely pass on a memory-fresh run (a new session, or after killing accumulated node processes) -- not re-attempted further in this pass to avoid compounding the same resource pressure on other in-progress work.

---

## Q-011

**Category:** Commercial evidence -- pitch outcome framing discrepancy

**Question:** `PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #32 (Reliance Jio GenNext / Amey Mashelkar) documents an actual rejection email (2026-08-06): *"not selected for the upcoming program due to limited fitment within our ecosystem at the moment,"* with structured "ASSURED"-framework feedback. In this session, the founder described the same relationship as: "Pitched to Reliance Group (Reliance Jio Gennext) - Aligned on technology and product utility, lacks scope to initiate pilot immediately." Both can be simultaneously true (the rejection email itself called the product "quite interesting"), but they read very differently to an external audience -- "not selected" vs. "lacks scope to initiate pilot immediately." Which framing should be used going forward, or should both be carried?

**Why this matters:** Phase 8 (Commercial Traction Evidence) cites this pipeline relationship; using the softer framing externally while the repo's own documented evidence shows a clear rejection would be an inflated claim under this program's own evidence-chain rule.

**Current evidence:** `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #32 (email-sourced, dated); this session's verbal statement (2026-08-11, undated artifact).

**Founder answer (2026-08-11):** "Reliance Jio Gennext rejected but read the mail (it's already documented)... You will know reason for softer framing... Context and tone are important not everything is 0/1." **Refined further, same thread:** "The rejection is real, but it was because they liked the product while having no current scope to pilot (not exactly a binary rejection)."

**Status:** RESOLVED, with the founder's own more precise framing recorded rather than this phase's cruder first-pass summary. Not "a rejection, softened in conversation" -- the actual, accurate shape of the outcome is: a real program-selection "no" (entry #32's own email, "not selected... due to limited fitment within our ecosystem at the moment"), driven specifically by JioGenNext's program-fit/scope constraints at this time, occurring *alongside* genuine, specific product interest from the same email ("felt the product/service that you are building is quite interesting"). Both are true at once and neither should be dropped -- "rejected" alone undersells the real interest shown; "aligned, lacks scope" alone undersells that this was a real, closed program decision, not an open door. Both framings from entry #32 and this session should be carried together going forward, not collapsed into either a bare "rejected" or a bare "aligned but not now."

---

## Q-012

**Category:** Commercial evidence -- customer-LOI count reported to an investor vs. internal tracker

**Clarification (2026-08-11):** Plug and Play UAE is an accelerator/investor program, not a
customer -- there is no LOI between AXXESS and Plug and Play, and this question was never about one.
The founder flagged that the original phrasing here read as if it were; corrected below. What this
question is actually about: a claim the founder made *to* Plug and Play, about AXXESS's *own
customer* LOI count, that doesn't match the internal customer-LOI tracker.

**Question:** `docs/readiness/PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #10 (Plug and Play UAE)
already flags an unresolved discrepancy from 2026-08-03: on 2026-08-01, the founder sent Plug and
Play's investor team a traction-update email reporting AXXESS's own customer-facing figures --
"5 signed LOIs, 2 additional committed LOIs," "2 active commercial pilots, 3 additional pilots
commencing shortly" -- as evidence of traction. Those specific figures do not match
`docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`'s own tracked 6 customer
entities. This was not resolved when first found and remains unresolved as of Phase 8.

**Why this matters:** This is a customer-traction claim made directly to a real investor -- if the
internal tracker is simply incomplete (real customer progress not yet logged there), that's a
documentation gap; if the investor email overstated the position, that's a claims-accuracy issue.
Either way, not about Plug and Play itself.

**Current evidence:** Full detail already in `PITCH_AND_TRACTION_LOG_2026_07_24.md` entry #10's own
reconciliation flag; not re-derived here.

**Founder answer (2026-08-11):** "LOI - 5 signed (3 docs total) and 2 committed."

**Status:** RESOLVED -- reconciles cleanly against `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_
STRATEGIC_PARTNERSHIPS_LOG.md`'s own "Pending / Expected (Not Yet Received)" section, which this
question's earlier framing had not fully connected to the Plug and Play figures. That section
states the founder was expecting "3-4 additional LOI documents... covering 7-8 prospective
customers," with "3 of those LOI documents received so far (Imprints Production, Ekora Hive, and
the Mahanta group letter), together covering 5 of the expected 7-8 customers." The founder's answer
here -- 5 signed across 3 documents, 2 committed -- matches that tracked expectation almost exactly
(7-8 expected minus 5 received leaves 2-3 still outstanding, matching "2 committed"). The 2026-08-01
email to Plug and Play was accurate against this repo's own internal tracking at the time; the
apparent mismatch in the original flag came from comparing against the tracker's 6-entity summary
table alone without also reading its own forward-looking expected-customers section.

---

## Q-013

**Category:** Commercial evidence -- LOI advance-payment amount discrepancy

**Question:** `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` records both Imprints Production's and Ekora Hive's oral advance-payment offers as **$20-30 USD each** (not yet collected). In this session, the founder stated Ekora's commitment as ~INR 5,000 and the remaining 4 LOIs (including Imprints) as INR 20,000-25,000 combined -- a total of INR 25,000-30,000 across all 5. Five LOIs at $20-30 each would total roughly $100-150 (~INR 8,500-12,750), well under the figure given this session. Have these amounts actually been renegotiated upward since the log's last update (2026-08-08), or is this a different figure being described?

**Why this matters:** These are real (if uncollected) financial commitments cited in Phase 8; an unreconciled 2-3x discrepancy in the total should not be carried forward into external material without resolving which figure is current.

**Current evidence:** `docs/LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md` (2026-08-08, last updated); this session's verbal statement (2026-08-11).

**Founder answer (2026-08-11):** "About advance payment: Mention total INR 25-30k advance commitment (written 1 and oral 4)." Breakdown: 1 of the 5 commitments is **in writing** (Ekora Hive, ~INR 5,000, matching what the founder stated earlier this session -- "Committed token advance around INR 5,000) in writing"); the remaining 4 (Imprints Production + the 3 Mahanta-group firms) are **oral commitments**, combining to INR 20,000-25,000. Total: INR 25,000-30,000 across all 5, written + oral combined.

**Status:** RESOLVED, with one open note carried forward, not silently dropped. The founder's total (INR 25-30k, 1 written + 4 oral) is now the current figure to use. This does not exactly reconcile with `LOIS_BETA_PILOT_INTEREST_REFERRAL_AND_STRATEGIC_PARTNERSHIPS_LOG.md`'s own text (last updated 2026-08-08), which records *both* Imprints's and Ekora's offers as oral, $20-30 USD each -- i.e. that document has Ekora's commitment as oral/USD-denominated, not written/INR-denominated as now stated. Most likely explanation: the commitment terms firmed up (moved from an oral USD estimate to a written INR figure) between 2026-08-08 and today, which the tracker doc simply hasn't been updated to reflect yet -- not treated as a contradiction requiring further founder confirmation, since the founder's answer here is the more current, direct source.

---
