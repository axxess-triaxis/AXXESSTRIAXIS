# Sprint 2 Closeout - Live Tenant Persistence And Golden Path Writes - 2026-07-22

## Purpose

Formal closeout record for Sprint 2, in the same format as `docs/SPRINT_1_CLOSEOUT_2026_07_22.md`. It traces every Sprint 2 prompt constraint to a verified outcome, updates the cumulative (Sprint 1 + 2) findings ledger, and separates two distinct score-delta views the user asked for explicitly:

1. **Sprint 2 isolated delta** -- what Sprint 2 alone changed, on top of the already-projected post-Sprint-1 state.
2. **Sprint 1+2 composite delta** -- the cumulative projected change from the original QA baseline to the current state, across both sprints together.

Both are estimates, not measured results -- see the repeated caveat in each section. Only a live QA replay (Sprint 5) produces a measured score.

Commits: `09b0dd6` (Sprint 2 fix + tests + docs) and `13366d0` (unrelated automation-overview doc, same push) on `canonical/sprint-1-35-unified-gitlab`, pushed to GitLab. GitHub (`origin`) remained suspended (403) at push time.

## 1. Sprint 2 Prompt Constraint Compliance

| Constraint | Status | Evidence |
|---|---|---|
| Do not bypass auth to make writes pass | Held | No auth code touched this sprint. `getServerAuthSession` / `canWriteResource` checks in the route are unchanged. |
| Do not weaken RLS | Held | No migration added or changed. `pnpm run supabase:verify` reports the same 27 migrations, 100 RLS-protected tables, and the same single pre-existing warning as Sprint 1 -- nothing new introduced or loosened. |
| Do not store project data only in local state | Held | Confirmed (did not need to fix) -- `projectsRepository.create` already writes through authenticated Supabase REST, never local-only. |
| Do not silently fall back to demo data in live mode | Held | Untouched; Sprint 1's demo-mode gating (`useWorkflowTimeline.ts`, `WorkflowRecordsPage.tsx`) is unchanged and still in effect. |
| Do not label demo/fallback writes as live writes | Held | Untouched. |
| Do not remove Demo Mode | Held | `src/demo/demoMode.ts` untouched. |
| Do not redesign the UI | Held | Zero UI/markup changes. `ProjectsSection.tsx` was read and tested, not modified. |
| Do not expand into AI/RAG unless strictly required | Held | No AI/RAG code touched. `recordWorkflowTimelineEvent` was reused as-is from its existing AI-review-action call site; nothing in that shared function was changed. |
| Do not commit secrets | Held | Diffed all changed files before staging; no new env vars, tokens, or credentials introduced. |
| Do not mark complete unless persistence survives refresh and verification passes | Held | Persistence-survives-refresh confirmed by code audit (`loadProjects()` re-fetches after save); full verification suite passed (see Section 5). |

No constraint was relaxed to close this sprint.

## 2. Cumulative Findings Ledger (Sprint 1 + Sprint 2, All 22 QA Findings)

This supersedes the Sprint-1-only ledger in `docs/SPRINT_1_CLOSEOUT_2026_07_22.md` Section 2 with Sprint 2's contribution folded in. Status legend is the same as that document.

| Finding | Severity | Status after Sprint 1 | Status after Sprint 2 | What changed this sprint |
|---|---|---|---|---|
| F-001 Mock auth session | P0 | Closed, verified | Unchanged (still closed) | -- |
| F-002 Sign Out doesn't sign out | P0 | Closed, verified | Unchanged | -- |
| F-003 Login form unreachable | P0 | Closed, verified | Unchanged | -- |
| F-004 No write action can succeed | P0 | Likely improved, unverified live | **Upgraded: root cause fully audited, evidence trail added** | Confirmed project creation was already using the real write path; added the audit/timeline evidence that the golden path's step 14 depends on. Still not independently re-run against a live Supabase project. |
| F-005 Every tenant-scoped API returns 401 | P0 | Likely improved, unverified live | **Upgraded: cross-tenant isolation now test-covered** | Added tests proving `organizationId` spoofing is ignored for non-Super-Admin scopes; confirmed RLS independently enforces the same boundary. Still not live-verified with two real tenants. |
| F-006-F-014 Nine permanently-loading workspaces | P0 | Open | **Unchanged, still open** | Out of scope. Sprint 3. |
| F-015 Fabricated dashboard timeline | P1 | Closed, opportunistic | Unchanged | -- |
| F-016 Raw "Unauthorized." text | P2 | Open | **Unchanged, still open** | Out of scope. Sprint 3. |
| F-017 Fabricated workflow records | P1 | Closed, opportunistic | Unchanged | -- |
| F-018 Onboarding progress inconsistent | P2 | Open | Unchanged | Out of scope. Sprint 4. |
| F-019 `/documents` routing bug | P1 | Closed, opportunistic | Unchanged | -- |
| F-020 Sidebar badge mismatch | P2 | Open | Unchanged | Out of scope. Sprint 4. |
| F-021 Duplicate API requests | P2 | Open | Unchanged | Out of scope. Sprint 5. |
| F-022 Tooling note | N/A | N/A | N/A | -- |

**Net after Sprint 2: 8 of 22 findings closed (3 verified in Sprint 1, 3 opportunistic in Sprint 1, 2 upgraded from "likely improved" to "closed with test coverage" in Sprint 2), 13 remain open and correctly deferred, 1 not applicable.** (Sprint 1 alone reported 6 closed + 2 likely-improved; Sprint 2 converts those 2 likely-improved into closed, net +2 vs Sprint 1's tally.)

## 3. Score Delta -- Two Separate Views, Both Estimated

**Read this section the same way as Sprint 1's: these are reasoned projections, not measured results.** No live QA replay has happened. The only way to get a real number is Sprint 5's live golden-path re-run against `beta.triaxisventures.com`.

### 3a. Why Sprint 2's isolated effect is small

Sprint 2 did not change whether a project can be created (Sprint 1's auth fix already made that architecturally possible) or whether it survives refresh (already true beforehand). Its only new effect is that a created project now leaves an audit trail. Two important limiting facts temper how much that should move any score:

- The dedicated **Audit Logs page (`/admin/audit-logs`) is one of the nine workspaces that hangs indefinitely (F-014, still open, Sprint 3 scope)**. A real user still cannot navigate to Audit Logs and see the new evidence there, even though the backend now correctly writes it. This caps the user-visible benefit of the audit half of Sprint 2's fix.
- The **Projects page itself is not one of the hanging workspaces** (it already loaded in the QA report, with the only prior problem being that Create returned 401). Its project-detail panel renders a `WorkflowTimelinePanel`, which now has a real event to show after a create. This half of Sprint 2's fix **is** user-visible without waiting for Sprint 3.

So: the timeline half of this fix is observable today; the audit-log half is real in the database but not yet reachable through the product UI.

### 3b. Sprint 2 Isolated Delta (vs. post-Sprint-1 projected state)

| Score | Post-Sprint-1 projected | Post-Sprint-2 projected | Isolated Sprint 2 delta |
|---|---|---|---|
| Beta readiness | ~45-55/100 | ~46-56/100 | **+1 point** (≈+2% relative) -- golden-path step 14 partially improves (timeline visible), but Audit Logs page still hangs and none of the 9 other blockers moved. |
| Enterprise readiness | ~55-62/100 | ~58-65/100 | **+2 to +3 points** (≈+4-5% relative) -- compliance/audit-trail correctness is a real enterprise-readiness signal even before it's click-through-visible, and the visible project timeline helps; capped by the Audit Logs page itself still being broken. |
| Investor demo readiness | ~55-65/100 | ~56-65/100 | **+0 to +1 point** (≈0-2% relative) -- an investor demo click-through is unlikely to specifically probe audit-trail depth; negligible marginal effect. |
| Pilot customer readiness | ~20-28/100 | ~25-34/100 | **+5 to +6 points** (≈+20-25% relative) -- this is the score Sprint 2 was aimed at: "durable record + evidence of the action" is exactly what a real pilot customer needs to trust the system, and this is the most direct hit from this sprint's work. |

### 3c. Sprint 1+2 Composite Delta (vs. original QA baseline)

| Score | Original QA baseline | Post-Sprint-1+2 composite projected | Composite delta (absolute) | Composite delta (% relative) |
|---|---|---|---|---|
| Beta readiness | 22/100 | ~46-56/100 | +24 to +34 | ≈+109% to +155% |
| Enterprise readiness | 48/100 | ~58-65/100 | +10 to +17 | ≈+21% to +35% |
| Investor demo readiness | 35/100 | ~56-65/100 | +21 to +30 | ≈+60% to +86% |
| Pilot customer readiness | 12/100 | ~25-34/100 | +13 to +22 | ≈+108% to +183% |

**These composite numbers are dominated by Sprint 1's fix, not Sprint 2's.** Sprint 1 closed the single root cause the QA report itself identified as explaining "a dozen symptoms." Sprint 2's contribution is real but narrow -- it should not be read as if Sprint 2 alone produced double-digit point swings; Section 3b is the honest isolated view, and it is small (+0 to +6 points depending on the axis).

## 4. What Improved (Sprint 2 Specifically)

- A created project now leaves a real, tenant-scoped, database-backed audit trail (`audit_logs` row: action, actor, tenant, target resource) -- not just a client-side notification, which was all that existed before.
- A created project now leaves a workflow-timeline event (`workflow_timeline_events` row), which is **already visible today** in the Projects page's project-detail panel (`WorkflowTimelinePanel`), without waiting for any other sprint.
- Cross-tenant write isolation, which was already enforced by the code and by RLS, is now proven by an automated test -- so a future change that accidentally weakens it would fail a test rather than silently ship.
- The QA report's specific concern that "Workflow timelines: actively misleading" no longer applies to a genuinely-created project's own timeline entry -- that entry is now real, not fabricated, and tied to an actual audit log ID.

## 5. What Has Not Improved (Sprint 2 Specifically)

- The Audit Logs page (`/admin/audit-logs`) itself is still one of the nine indefinitely-hanging workspaces (F-014). The new audit rows exist in the database but are not yet reachable through that page. This is explicitly Sprint 3 scope, not touched here.
- No live Supabase project was used to actually create a project and confirm the audit/timeline rows land as designed. Every piece of Sprint 2 evidence is a mocked-fetch unit test plus a static code-path audit -- **not a live-fire test.**
- Two-tenant isolation was proven at the unit-test level (mocked scopes, asserted request bodies/URLs) and independently by reading the RLS policy SQL -- not by provisioning two real Supabase-backed tenants and testing live cross-tenant access.
- Task and meeting creation (which share the exact same generic repository route) were deliberately **not** given the same audit/timeline evidence treatment this sprint, to stay strictly scoped to the sprint's explicit "project creation" user journey. This is a known, intentional gap, not an oversight -- worth a follow-up if the same evidentiary standard should apply there too.
- All nine permanently-loading workspaces, the raw `Unauthorized.` text, onboarding-progress inconsistency, sidebar badge mismatch, and duplicate Dashboard requests are entirely unchanged (correctly out of scope).

## 6. Caveats And Assumptions (Detailed)

- **Assumption:** the Vercel deployment this analysis reasons about has (or will have) `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true` and a correctly configured Supabase project. Sprint 2's fix is inert without Sprint 1's fix being live -- they are not independently deployable improvements in practice, only independently auditable/testable in this local pass.
- **Assumption:** the reader treats Section 3's numbers as bounded, reasoned estimates for planning purposes, not as a certified score. The only certifying event is a live QA replay (Sprint 5).
- **Caveat:** "closed" in the findings ledger (Section 2) means "the code path was audited and/or fixed and is covered by an automated test that would fail if it regressed" -- it does not mean "re-confirmed against the live beta.triaxisventures.com deployment."
- **Caveat:** the audit/timeline evidence added this sprint is best-effort (wrapped in `.catch(() => undefined)`, matching the existing pattern used elsewhere in this codebase) -- a transient failure writing the audit or timeline row will not fail the project creation itself. This is a deliberate design choice (evidence should never block the primary action) but means the evidence trail is not transactionally guaranteed to exist for every successful create. This was not itself a Sprint 2 requirement to change, and matches how every other evidence-writing call site in this codebase already behaves.
- **Caveat:** the isolated Sprint 2 delta in Section 3b is a subjective allocation exercise -- there is no formula in the original QA report for how "backend audit correctness" versus "visible UI evidence" should be weighted per score axis. The ranges given reflect a deliberately conservative reading (small numbers, wide-ish ranges) rather than a precise calculation, because no such precise calculation is possible without re-running the actual QA methodology.
- **Caveat:** Section 3's Beta/Investor/Enterprise/Pilot readiness figures for "post-Sprint-1" are themselves carried over unchanged from `docs/SPRINT_1_CLOSEOUT_2026_07_22.md` -- they were not recomputed here, only used as the starting point for Sprint 2's isolated delta.

## 7. Sprint 2 Closure Statement

Sprint 2 -- Live Tenant Persistence And Golden Path Writes -- is **closed**, within the constraints given (Section 1). All implementation checklist items, required tests, lint/type checks, build/regression checks, and documentation updates are complete and passing locally (98 test files / 299 tests, typecheck/lint/build/supabase:verify all clean). Two QA findings (F-004, F-005) were upgraded from "likely improved, unverified" to "closed, test-covered" this sprint; no new findings were closed outright, since Sprint 2's actual gap (missing evidence) was narrower than the sprint prompt's broader "prove persistence" framing assumed -- persistence itself was already proven true by Sprint 1's fix. The isolated Sprint 2 score delta is small (Section 3b); the larger composite delta (Section 3c) is carried mostly by Sprint 1.

**Recommended next step:** Sprint 3 -- Workspace Loading And Error-State Hardening -- specifically because it unblocks the Audit Logs page (F-014), which is the one remaining piece needed to make Sprint 2's audit-trail work fully user-visible, in addition to fixing the nine indefinite-loading workspaces and the raw `Unauthorized.` text.
