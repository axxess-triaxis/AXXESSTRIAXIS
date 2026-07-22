# Sprint 4 Closeout - Demo/Live Data Separation, Navigation Integrity And Tenant Trust - 2026-07-22

## Purpose

Formal closeout record for Sprint 4, in the same format as `docs/SPRINT_1_CLOSEOUT_2026_07_22.md`, `docs/SPRINT_2_CLOSEOUT_2026_07_22.md`, and `docs/SPRINT_3_CLOSEOUT_2026_07_22.md`. It traces every Sprint 4 prompt constraint to a verified outcome, updates the cumulative (Sprint 1+2+3+4) findings ledger, and separates two distinct score-delta views the user has asked for on every closeout:

1. **Sprint 4 isolated delta** -- what Sprint 4 alone changed, on top of the already-projected post-Sprint-3 state.
2. **Sprint 1+2+3+4 composite delta** -- the cumulative projected change from the original QA baseline to the current state, across all four sprints together.

Both are estimates, not measured results. Only a live QA replay (Sprint 5) produces a measured score. Section 8 also inventories, in full, everything still unchecked across the five-sprint roadmap and checklist, per this closeout's explicit request.

Commit: `a61af01` on `canonical/sprint-1-35-unified-gitlab`, pushed to GitLab. GitHub (`origin`) remained suspended (403, re-verified this session) and was not a viable push target. One unrelated housekeeping commit (`62286d3`, a GitLab-sync documentation record requested separately by the user between Sprint 3 and Sprint 4) sits on the branch immediately before Sprint 4's commit -- it is not part of Sprint 4's QA scope and is not counted in this closeout's findings or deltas.

## 1. Sprint 4 Prompt Constraint Compliance

| Constraint | Status | Evidence |
|---|---|---|
| Do not redesign the UI | Held | Zero markup/layout changes. Fixes were: two `useState`/`.catch` gating conditions in `DashboardSection.tsx`, one new type field (`badgeKind`) plus a render-condition change in `Sidebar.tsx`, and two `badgeKind` tags added to existing `navigation.ts` entries. |
| Do not rewrite the architecture | Held | No new shared abstraction introduced. Reused the exact `isDemoModeEnabled()` gating pattern already used correctly elsewhere in the same files (e.g. `getDashboardKpis`'s existing demo/live branch in `DashboardSection.tsx`). |
| Do not weaken auth, RBAC or tenant checks | Held | No auth/RBAC/RLS code touched. `pnpm run supabase:verify` reports the same 27 migrations, 100 RLS-protected tables, and the same single pre-existing warning as Sprints 1, 2 and 3. |
| Do not remove Demo Mode or Investor Preview | Held | `src/demo/demoMode.ts`, `TopBar.tsx`'s "Investor Preview" badge, and `GuidedDemoBanner.tsx` were audited, confirmed correctly gated, and left untouched. |
| Do not let demo data leak into a live tenant's view | Actively fixed | This was Sprint 4's core deliverable for F-018: `DashboardSection.tsx`'s project list no longer seeds or falls back to 186 fabricated demo projects outside Demo Mode. |
| Do not show fabricated tenant-state counts to a live tenant | Actively fixed | This was Sprint 4's core deliverable for F-020: the "4" (Social Alerts) and "23" (Approvals) sidebar badges now render only in Demo Mode. |
| Do not delete code outside the sprint's specific scope | Held | `legacyInstitutionalViewRepository.ts` was confirmed to have zero consumers (dead code) during this sprint's audit but was deliberately left in place -- deleting it was judged out of Sprint 4's specific ask, despite precedent existing for deleting a similarly dead file in an earlier audit round. |
| Do not commit secrets | Held | Diffed every changed file before staging; no new credentials, tokens, or env vars introduced. |
| Do not mark complete unless F-001-F-016 are re-verified as not regressed | Held | Re-read `useWorkflowTimeline.ts`, `WorkflowRecordsPage.tsx`, and `lazyRoutes.tsx` against their Sprint 1-3 fixed state; no regressions found. Full 110-file/331-test suite (including all Sprint 1-3 regression tests) passes. |

No constraint was relaxed to close this sprint.

## 2. Cumulative Findings Ledger (Sprint 1+2+3+4, All 22 QA Findings)

This supersedes the ledger in `docs/SPRINT_3_CLOSEOUT_2026_07_22.md` Section 2. The same numbering caveat carries forward: F-007, F-008 and F-009 were never individually itemized with their own distinct description in either the raw report or the derived actionables doc -- they exist only as part of the raw report's collective "F-006-F-014" range, so no artificial one-to-one row is forced for them here.

| Finding | Description | Severity | Status after Sprint 3 | Status after Sprint 4 | What changed this sprint |
|---|---|---|---|---|---|
| F-001 | Mock auth session | P0 | Closed, verified | Unchanged | -- |
| F-002 | Sign Out doesn't sign out | P0 | Closed, verified | Unchanged | -- |
| F-003 | Login form unreachable | P0 | Closed, verified | Unchanged | -- |
| F-004 | No write action can succeed | P0 | Closed, test-covered | Unchanged | -- |
| F-005 | Every tenant-scoped API returns 401 | P0 | Closed, test-covered | Unchanged | -- |
| F-006 | AI Workspace loading | P0 | Closed | Unchanged | -- |
| F-010 | Approvals loading + mislabeled "Loading Executive Dashboard" | P0 | Closed, verified | Unchanged | -- |
| F-011 | Stakeholders/CRM loading | P0 | Closed (verified by audit) | Unchanged | -- |
| F-012 | Analytics loading | P0 | Closed (verified by audit) | Unchanged | -- |
| F-013 | Integrations loading | P0 | Closed | Unchanged | -- |
| F-014 | Settings/Organization Admin/Audit Logs loading | P0 | Closed | Unchanged | -- |
| (n/a) | Social Alerts loading | P0 (raw report) | Not audited | **Partially observed, not formally closed** | Incidentally read `AlertsSection.tsx` while fixing its sidebar badge (F-020) and confirmed it is a synchronous component with no fetch and no loading gate -- cannot hang, matching the pattern of Approvals/Stakeholders/Analytics. This was not a formal audit with a dedicated regression test, so it is recorded as an observation, not a closed finding. See Section 6. |
| F-015 | Fabricated dashboard timeline | P1 | Closed, opportunistic | **Regression-verified, unchanged** | Re-confirmed `useWorkflowTimeline.ts` still gates its fallback behind `isDemoModeEnabled()`; no regression. |
| F-016 | Raw "Unauthorized." text | P2 | Closed, verified | Unchanged | -- |
| F-017 | Fabricated workflow records | P1 | Closed, opportunistic | **Regression-verified, unchanged** | Re-confirmed `WorkflowRecordsPage.tsx` still gates its fallback behind `isDemoModeEnabled()`; no regression. |
| F-018 | Onboarding progress inconsistent | P2 | Open | **Closed, verified** | Root-caused to `DashboardSection.tsx`'s ungated demo-project fallback (not the onboarding widget itself); fixed and regression-tested. |
| F-019 | `/documents` routing bug | P1 | Closed, opportunistic | **Regression-verified, unchanged** | Re-confirmed `lazyRoutes.tsx` still maps `documents` and `knowledge` to distinct components; added a dedicated heading-distinctness regression test this sprint. |
| F-020 | Sidebar badge mismatch | P2 | Open | **Closed, verified** | Added `badgeKind` discriminator; fabricated counts now gated to Demo Mode; regression-tested. |
| F-021 | Duplicate API requests | P2 | Open | Unchanged | Out of scope. Sprint 5. |
| F-022 | Tooling note | N/A | N/A | N/A | -- |

**Net after Sprint 4: 17 of the ~19 individually-itemized findings closed (6 from Sprint 1, 2 upgraded in Sprint 2, 7 closed in Sprint 3, 2 newly closed this sprint: F-018, F-020), 1 remains open and correctly deferred (F-021), 1 not applicable (F-022), and 1 (Social Alerts' loading-hang question, as opposed to its badge count) remains an informal observation rather than a formally closed finding.** This is the highest single-sprint closure count relative to what remained open going in (2 of the 3 open P2 findings closed, leaving only F-021).

## 3. Score Delta -- Two Separate Views, Both Estimated

**Read this the same way as the prior three closeouts: reasoned projections, not measured results.**

### 3a. Why Sprint 4's isolated effect is smaller in magnitude than Sprint 3's, but qualitatively important

Sprint 4's two fixes (F-018, F-020) are both P2 findings -- lower severity than the P0 auth and loading-state findings Sprints 1-3 addressed. Neither blocks the golden path outright the way a `401` or an infinite spinner does. However, both directly attack the specific *trust* concern the raw QA report repeatedly raised: that fabricated or inconsistent data undermines confidence in the product even when the underlying workflow technically functions. The raw report's own language singles this out ("seeded or fallback records appeared as if they were live tenant evidence"), which is why these findings, despite P2 severity, are weighted more heavily on Investor demo readiness and Enterprise readiness than a typical P2 fix would be.

### 3b. Sprint 4 Isolated Delta (vs. post-Sprint-3 projected state)

| Score | Post-Sprint-3 projected | Post-Sprint-4 projected | Isolated Sprint 4 delta |
|---|---|---|---|
| Beta readiness | ~54-70/100 | ~57-72/100 | **+2 to +3 points** (≈+3-5% relative) -- neither F-018 nor F-020 is itself a golden-path blocker, so the direct beta-readiness effect is modest. |
| Enterprise readiness | ~64-75/100 | ~69-80/100 | **+4 to +6 points** (≈+6-8% relative) -- a live tenant no longer sees inconsistent onboarding state or fabricated tenant-activity counts, both of which are exactly the class of issue an enterprise buyer's technical evaluator would flag as a trust red flag. |
| Investor demo readiness | ~66-83/100 | ~70-87/100 | **+4 to +6 points** (≈+5-7% relative) -- consistent onboarding progress and honest badge counts directly address the report's "seeded data masquerading as live evidence" concern, which investors are explicitly sensitive to. |
| Pilot customer readiness | ~30-43/100 | ~33-46/100 | **+3 to +4 points** (≈+8-10% relative) -- a pilot user's first-10-minutes onboarding experience is now deterministic and won't mislead them about their own progress. |

### 3c. Sprint 1+2+3+4 Composite Delta (vs. original QA baseline)

| Score | Original QA baseline | Post-Sprint-1+2+3+4 composite projected | Composite delta (absolute) | Composite delta (% relative) |
|---|---|---|---|---|
| Beta readiness | 22/100 | ~57-72/100 | +35 to +50 | ≈+159% to +227% |
| Enterprise readiness | 48/100 | ~69-80/100 | +21 to +32 | ≈+44% to +67% |
| Investor demo readiness | 35/100 | ~70-87/100 | +35 to +52 | ≈+100% to +149% |
| Pilot customer readiness | 12/100 | ~33-46/100 | +21 to +34 | ≈+175% to +283% |

## 4. What Improved (Sprint 4 Specifically)

- The onboarding progress inconsistency (F-018) is fixed at its actual root cause -- an ungated demo-data fallback in `DashboardSection.tsx` -- rather than by patching symptoms in the onboarding widget itself, which would have left the same bug free to resurface through any other consumer of `projectCount`.
- A clean live tenant with zero real projects now sees a deterministic, non-fluctuating onboarding state ("1 of 10 complete") on every load, matching the QA report's own stated expectation that "progress changes only when durable actions occur."
- Two sidebar badges that previously showed fabricated counts ("4", "23") to every user regardless of tenant state now correctly hide outside Demo Mode, closing the specific gap the QA report identified around Approvals' badge contradicting a zero-record tenant.
- Three of the five actionables in this sprint's scope (F-015, F-017, F-019) were formally regression-tested for the first time as an explicit named Sprint 4 deliverable, rather than being carried forward as an implicit assumption -- this closes a documentation gap even though no code changed.
- A previously undocumented observation was captured in passing: Social Alerts (the one Sprint 3 audit gap) is, like Approvals/Stakeholders/Analytics, a synchronous component with no fetch and therefore cannot hang -- narrowing, though not formally closing, the one remaining workspace-loading unknown from Sprint 3.

## 5. What Has Not Improved (Sprint 4 Specifically)

- **Social Alerts' loading-hang status is still not formally closed.** The observation in Section 2 was incidental (made while fixing an unrelated badge issue), had no dedicated regression test written for it, and was not part of this sprint's declared scope -- it should not be relied upon as equivalent to the formal audits Sprint 3 performed for the other 8 workspaces.
- Live beta verification did not happen. Every finding in this closeout is a local-code audit plus automated test, not a re-run of the QA golden path against `beta.triaxisventures.com`.
- F-021 (duplicate Dashboard API requests) is entirely untouched -- correctly deferred to Sprint 5, not accidentally skipped.
- The fabricated sidebar badge counts are *hidden* in live mode, not *replaced* with a real live-tenant count. No repository exists yet to compute an actual Social Alerts or Approvals count for a live tenant; if real counts are desired (rather than simply suppressing the fake ones), that is new work, not something this sprint did.
- No performance work was done, and no live two-tenant isolation testing was performed -- both remain exactly where Sprint 3's closeout left them.

## 6. Caveats And Assumptions (Detailed)

- **Structural caveat carried forward from Sprint 3, still applicable:** 3 of this sprint's 5 scoped actionables (F-015, F-017, F-019) were already fixed by prior sprints and did not require new code. As with Sprint 3, this closeout cannot independently confirm whether the live beta deployment (last redeployed before Sprint 1, as far as this repository's evidence shows) currently exhibits these symptoms or not -- only that the current local source code does not.
- **Assumption:** Section 3's isolated and composite deltas assume the eventual live redeployment runs code equivalent to the current `canonical/sprint-1-35-unified-gitlab` branch at commit `a61af01`, with the auth-shell/demo-mode environment variables configured per `docs/VERCEL_DEPLOYMENT.md`. Neither has been confirmed against the actual Vercel project.
- **Caveat:** the Social Alerts observation in Section 2/4 is explicitly weaker evidence than a formal audit. It is a single-file read made for an unrelated reason (fixing its badge), not a targeted investigation with a regression test proving the claim. Treat it as "probably fine, not yet verified to the same standard as the other 8 workspaces."
- **Caveat:** the isolated Sprint 4 delta in Section 3b is, like every prior sprint's isolated delta, a subjective allocation exercise with no formula available from the original QA report. The relatively small point ranges reflect the P2 severity of the two fixed findings; the reasoning in Section 3a for weighting them slightly above a "typical" P2 fix is judgment, not computation.
- **Caveat:** hiding a fabricated count (this sprint's approach to F-020) is a different remediation strategy than replacing it with a real count. Both are defensible closures of "the badge does not contradict tenant state" (the QA finding's literal ask), but a reviewer specifically expecting live Social Alerts/Approvals counts to appear for a real tenant will not find them -- only their absence, which is the honest state given no such counting repository exists.
- **Assumption carried over from Section 3's Sprint 1/2/3 starting points:** the post-Sprint-3 figures used as this closeout's baseline were themselves estimates from `docs/SPRINT_3_CLOSEOUT_2026_07_22.md`, not measured values -- errors in that estimate compound into this one, and into Section 3c's composite figures.

## 7. Sprint 4 Closure Statement

Sprint 4 -- Demo/Live Data Separation, Navigation Integrity And Tenant Trust -- is **closed**, within the constraints given (Section 1). All implementation checklist items, required tests, lint/type checks, build/regression checks, and documentation updates are complete and passing locally (110 test files / 331 tests, typecheck/mobile typecheck/lint/build/supabase:verify/mobile release gates all clean). Two QA findings (F-018, F-020) are newly closed this sprint, bringing the cumulative total to 17 of ~19 itemized findings closed -- leaving only F-021 (duplicate Dashboard requests) as an open, in-scope-for-Sprint-5 finding, plus the informal Social Alerts loading-hang observation from Section 2. The sprint's most consequential result, echoing Sprint 3's pattern, was a root-cause fix (F-018 traced to `DashboardSection.tsx`, not the onboarding widget) rather than a symptom patch, plus confirmation that most of this sprint's assigned scope had already been correctly closed by prior sprints.

**Recommended next step:** Sprint 5 -- QA Replay, Performance And Release Gate -- per `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md`, addressing F-021 and, critically, converting all four sprints' estimated score deltas into measured ones via a live beta redeploy and QA golden-path replay. Section 8 below inventories everything still open across the full roadmap and checklist, in detail, per this closeout's explicit remit.

## 8. What's Still Left To Tick Off -- Full Roadmap And Checklist Inventory

This section exists because the user asked, on top of the standard closeout, for an explicit accounting of everything still unchecked across `docs/Post-Claude Code exhaustive workflow audit production remediation package.md` and its linked documents. Nothing here is new work performed this sprint -- it is a consolidated, current-as-of-2026-07-22 inventory of what remains, sourced directly from the checkbox state in `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md` and the roadmap phases in `docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`.

### 8a. The 20 Original QA Actionables

19 of 20 are closed or regression-verified. **Actionable 20 (Deduplicate Repeated Dashboard API Requests, F-021) is the only one not yet addressed.** See `docs/BETA_QA_ACTIONABLES_2026_07_22.md` for the full per-item status and evidence.

### 8b. Sprint 5 Checklist -- Every Box Still Unchecked

From `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md`, Sprint 5 section, verbatim:

**Implementation Checklist:**

- [ ] Deduplicate repeated Dashboard API requests.
- [ ] Add request consolidation, memoization or caching where appropriate.
- [ ] Create or update Playwright golden-path coverage.
- [ ] Cover sign-in, tenant setup, project create, audit/timeline verification.
- [ ] Add two-tenant isolation coverage.
- [ ] Add demo/live separation regression coverage.
- [ ] Re-run the Claude QA golden path against local build.
- [ ] Deploy or prepare deployment through provider CLI.
- [ ] Re-run the Claude QA golden path against live beta.
- [ ] Record before/after status for each original QA finding.

**Tests Required:**

- [ ] Unit test: Dashboard request deduplication.
- [ ] Integration test: Dashboard handles auth failure once.
- [ ] E2E test: sign in and create organization.
- [ ] E2E test: create project and verify persistence.
- [ ] E2E test: audit log updates.
- [ ] E2E test: timeline updates.
- [ ] E2E test: demo/live separation.
- [ ] E2E test: two-tenant isolation.

**Lint And Type Checks / Build And Regression Checks:** all 8 commands (`typecheck`, mobile `typecheck`, `lint`, `test`, `build`, `supabase:verify`, `mobile:store:release-gate`, `mobile:capacitor:store:doctor`) are unchecked as *Sprint 5's own* evidence -- note this is a per-sprint documentation formality, not a sign the suite currently fails; Section 2 of this closeout shows all 8 passing as of Sprint 4.

**Documentation Required:**

- [ ] Update `README.md`.
- [ ] Update `CHANGELOG.md`.
- [ ] Update `docs/SPRINT_LOG.md`.
- [ ] Update `docs/BETA_QA_ACTIONABLES_2026_07_22.md`.
- [ ] Update `docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`.
- [ ] Add beta replay evidence document.
- [ ] Record deployment provider evidence if live beta is redeployed.

**Diligence Evidence:**

- [ ] Record commit hash.
- [ ] Record provider deployment ID or URL if deployed.
- [ ] Record test command outputs.
- [ ] Record Supabase schema verification output.
- [ ] Record live beta replay result.
- [ ] Record remaining risks and owner.
- [ ] Record whether GitHub or GitLab was used only as source control, not deployment mediator.

**Exit Criteria:**

- [ ] All 20 QA actionables are closed or explicitly deferred with rationale. (19/20 closed as of Sprint 4; only F-021 remains.)
- [ ] Claude QA golden path passes locally.
- [ ] Claude QA golden path passes against live beta, if provider access is available.
- [ ] Duplicate Dashboard requests are reduced or justified.
- [ ] Full verification suite passes. (Already true locally as of Sprint 4 -- Sprint 5 needs to reconfirm after its own changes.)
- [ ] Documentation is updated for all five review audiences.

### 8c. Roadmap Phases -- What's Done vs. Still Open

From `docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`:

- **Phase 1 (Beta Access Integrity):** all local checklist items done (Sprint 1). Still open: confirming the *actual deployed* Vercel beta environment variables, not just the code defaults.
- **Phase 2 (Live Tenant Golden Path):** the persistence/audit/timeline subset is done locally (Sprint 2). Still open: the full end-to-end checklist (create a real Supabase Auth user, create an organization, assign role/department, upload/import a document, ask a grounded question, show citations, submit for review, approve an action, create a task/approval/project update, verify dashboard/timeline/audit updates) has not been run as one continuous live walkthrough -- each piece has been unit-tested or code-audited in isolation, not chained together against a live deployment.
- **Phase 3 (Workspace Loading-State Hardening):** done locally (Sprint 3), with the Social Alerts caveat noted throughout this document.
- **Phase 4 (Tenant Isolation And Governance Verification):** **not started as a live phase.** Every item on its checklist -- create two tenants, create users with different roles, upload tenant-specific documents, verify cross-tenant document retrieval is impossible, verify role-restricted documents are not retrieved by unauthorized roles, verify AI answers cite only authorized sources, verify rejected AI output does not create tasks or approvals, verify approved AI output writes audit evidence, verify audit logs are tenant-scoped -- requires two actually-provisioned live tenants and has only been proven at the unit-test/RLS level (Sprint 2's spoofed-`organizationId` tests), never with two real tenants exercising the product live. This is the single largest unclosed gap in the entire five-sprint program.
- **Phase 5 (Investor And Enterprise Evidence Pack):** partially done on an ongoing basis (README/CHANGELOG/SPRINT_LOG have been updated every sprint; verification commands and outcomes are attached to every sprint's evidence). Still open: capturing beta screenshots after a live redeploy, and recording environment-variable requirements as confirmed (not just documented) against the live Vercel project.

### 8d. Final Program Completion Criteria -- Met vs. Not Yet Met

From the same roadmap document's "Final Program Completion Criteria," each item's current status:

- A real unauthenticated browser sees login instead of mock Organization Admin. -- **Met locally**, not live-verified.
- A real user can sign in, create/select a tenant and create a durable project. -- **Met locally** (architecturally + unit-tested), not live-verified.
- Every core workspace resolves without indefinite loading. -- **Met locally** for 8 of 9 named workspaces with formal audit; Social Alerts remains an informal observation only.
- Demo data appears only in Demo Mode or Investor Preview. -- **Met locally**, closed this sprint (F-018, F-020) plus Sprint 1-3's earlier fixes (F-015, F-017).
- Live tenants show honest empty or real data states. -- **Met locally**, same basis as above.
- `/documents` and `/knowledge` are distinct. -- **Met**, verified with a dedicated regression test.
- Audit and timeline evidence updates after real actions. -- **Met locally** (Sprint 2), unit-tested only, not live-verified.
- Tenant isolation has been tested. -- **Partially met.** Query/mutation-logic level and RLS-level testing only; no live two-tenant test has been performed (see Phase 4 above).
- The Claude Code QA golden path has been replayed and documented. -- **Not met.** This is Sprint 5's core remaining deliverable.
- Full verification passes. -- **Met locally** as of every sprint including this one.
- The repo contains raw QA evidence, derived actionables, sprint checklist, changelog and sprint-log updates. -- **Met.**

**Bottom line: of the 11 Final Program Completion Criteria, 8 are met locally (though several carry a "not live-verified" caveat), 1 is partially met (tenant isolation), and 1 is fully unmet (live QA golden-path replay) plus 1 (full verification passes) that is trivially re-satisfied by definition each sprint. The single highest-leverage remaining action across the entire program is a live Vercel beta redeploy followed by a live QA golden-path replay -- nothing else in this document can be upgraded from "estimated" to "measured" without it.**
