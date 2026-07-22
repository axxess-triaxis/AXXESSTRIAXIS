# Sprint 3 Closeout - Workspace Loading And Error-State Hardening - 2026-07-22

## Purpose

Formal closeout record for Sprint 3, in the same format as `docs/SPRINT_1_CLOSEOUT_2026_07_22.md` and `docs/SPRINT_2_CLOSEOUT_2026_07_22.md`. It traces every Sprint 3 prompt constraint to a verified outcome, updates the cumulative (Sprint 1+2+3) findings ledger, and separates two distinct score-delta views the user asked for explicitly:

1. **Sprint 3 isolated delta** -- what Sprint 3 alone changed, on top of the already-projected post-Sprint-2 state.
2. **Sprint 1+2+3 composite delta** -- the cumulative projected change from the original QA baseline to the current state, across all three sprints together.

Both are estimates, not measured results -- this caveat matters more for Sprint 3 than for the prior two closeouts, for a structural reason explained in Section 6. Only a live QA replay (Sprint 5) produces a measured score.

Commits: `52f58d2`, `13366d0`, `4130b5f`, `09b0dd6`, `420802c`, `0c6e1a6` on `canonical/sprint-1-35-unified-gitlab`, merged into GitLab `main` via MR `!4` (merge commit `b05544d`). GitHub (`origin`) remained suspended (403) throughout. A separate, unrelated CI stage-mismatch fix (`44adcbb`) was pushed after the merge and is not part of Sprint 3's scope -- it is a pre-existing pipeline-configuration bug found and fixed while verifying the merge, predating all three sprints.

## 1. Sprint 3 Prompt Constraint Compliance

| Constraint | Status | Evidence |
|---|---|---|
| Do not redesign the UI | Held | Zero markup/layout changes. Fixes were: one routing-metadata entry, two loading-flag corrections, and error-copy substitutions at existing call sites. |
| Do not rewrite the architecture | Held | No new shared abstraction introduced. Reused the existing `EmptyState`/`LoadingState`/`RouteBoundary`/toast pattern as-is (see Section 4 of `docs/SPRINT_LOG.md`'s Sprint 3 entry for the explicit "state model used" rationale). |
| Do not hide errors by showing fake success | Held | Every fixed call site still shows an error state on failure -- only the *copy* changed (from a raw backend string to fixed, safe text), never the underlying success/failure signal. |
| Do not replace live workspace failures with unlabeled demo data | Held | Confirmed unchanged: Approvals/Stakeholders/Analytics show an honest empty state outside Demo Mode, never demo data. No code in this sprint touched that gating. |
| Do not weaken auth, RBAC or tenant checks | Held | No auth/RBAC/RLS code touched. `pnpm run supabase:verify` reports the same 27 migrations, 100 RLS-protected tables, and the same single pre-existing warning as Sprints 1 and 2. |
| Do not remove provider-gated states | Held | Confirmed unchanged: Integrations' and Analytics' `DataStateBadge state="Provider-gated"` behavior was audited, not modified. |
| Do not expose raw backend error strings to users | Actively fixed | This was Sprint 3's core deliverable -- 9 call sites across 3 files no longer surface `result.error`/`payload.error` to the user. |
| Do not add global catch-all behavior that masks security failures | Held | Every fix is a targeted, per-call-site `response.status` check (401 -> sign-in copy, 403 -> permission copy, other -> generic retry copy) -- not a blanket try/catch that would swallow or generalize security-relevant failures. |
| Do not commit secrets | Held | Diffed every changed file before staging; no new credentials, tokens, or env vars introduced. |
| Do not mark complete unless every affected workspace resolves without indefinite loading | Held | All 9 named workspaces plus Dashboard were individually audited and either confirmed already-safe or fixed; each has a corresponding automated test (see `docs/SPRINT_LOG.md`). |

No constraint was relaxed to close this sprint.

## 2. Cumulative Findings Ledger (Sprint 1+2+3, All 22 QA Findings)

This supersedes the ledger in `docs/SPRINT_2_CLOSEOUT_2026_07_22.md` Section 2. A note on numbering first: the raw QA report lists `F-006-F-014` as a single collective finding covering "nine workspaces hang on a permanent loading state," without itemizing a distinct description for every individual number in that range. The derived `docs/BETA_QA_ACTIONABLES_2026_07_22.md` later assigned specific numbers to 6 action items covering those workspaces (F-006, F-010, F-011, F-012, F-013, F-014 -- some items, like F-014, bundle three workspaces together). **F-007, F-008 and F-009 were never individually itemized with their own distinct description in either source document** -- they exist only as part of the raw report's collective range. The table below uses the actionables doc's specific mapping, which is the most precise one available, and does not force an artificial one-to-one row for F-007/F-008/F-009 the way an earlier internal draft of this ledger did.

| Finding | Description | Severity | Status after Sprint 2 | Status after Sprint 3 | What changed this sprint |
|---|---|---|---|---|---|
| F-001 | Mock auth session | P0 | Closed, verified | Unchanged | -- |
| F-002 | Sign Out doesn't sign out | P0 | Closed, verified | Unchanged | -- |
| F-003 | Login form unreachable | P0 | Closed, verified | Unchanged | -- |
| F-004 | No write action can succeed | P0 | Closed, test-covered | Unchanged | -- |
| F-005 | Every tenant-scoped API returns 401 | P0 | Closed, test-covered | Unchanged | -- |
| F-006 | AI Workspace loading | P0 | Open | **Closed** | Audited: no page-level loading gate exists, cannot hang. Fixed 2 raw-error-leak call sites as additional hardening. |
| F-010 | Approvals loading + mislabeled "Loading Executive Dashboard" | P0 | Open | **Closed, verified** | Root-caused: `routes.ts` had no `appRoutes` entry for `"approvals"` at all, so route lookups silently fell back to the Dashboard route's label. Fixed and regression-tested. |
| F-011 | Stakeholders/CRM loading | P0 | Open | **Closed (verified by audit)** | Confirmed a synchronous, Demo-Mode-gated stub with no fetch -- cannot hang. No code change; render test added. |
| F-012 | Analytics loading | P0 | Open | **Closed (verified by audit)** | Same as F-011 -- synchronous stub, no fetch, no change needed. Render test added. |
| F-013 | Integrations loading | P0 | Open | **Closed** | Audited: populates state without blocking render, cannot hang. Fixed 6 raw-error-leak call sites, including the connector-credentials panel. |
| F-014 | Settings/Organization Admin/Audit Logs loading | P0 | Open | **Closed** | Settings: audited, no loading gate exists, no fix needed. Organization Admin and Audit Logs: genuine defect found and fixed (stale `loading` flag with no terminal fallback on an early return; blank `return null` for absent user replaced with a sign-in-required state). |
| (n/a) | Social Alerts loading | P0 (raw report) | Open | **Not audited this sprint -- see Section 6 caveat** | The raw QA report's original 9-workspace list included "Social Alerts," but the Sprint 3 prompt's explicit "Affected Workspaces" list substituted "AI Review Inbox" in its place. Social Alerts' loading behavior was not examined this sprint. |
| F-015 | Fabricated dashboard timeline | P1 | Closed, opportunistic | Unchanged | -- |
| F-016 | Raw "Unauthorized." text | P2 | Open | **Closed, verified** | Fixed the confirmed AI Review Inbox instance (2 call sites) plus 7 more instances of the identical anti-pattern found in AI Workspace and Integrations, beyond what the raw report specifically named. |
| F-017 | Fabricated workflow records | P1 | Closed, opportunistic | Unchanged | -- |
| F-018 | Onboarding progress inconsistent | P2 | Open | Unchanged | Out of scope. Sprint 4. |
| F-019 | `/documents` routing bug | P1 | Closed, opportunistic | Unchanged | -- |
| F-020 | Sidebar badge mismatch | P2 | Open | Unchanged | Out of scope. Sprint 4. Note: Approvals' own sidebar badge ("23" against a zero-record tenant) was observed during this sprint's audit but is explicitly this finding, not F-010, and was left untouched. |
| F-021 | Duplicate API requests | P2 | Open | Unchanged | Out of scope. Sprint 5. |
| F-022 | Tooling note | N/A | N/A | N/A | -- |

**Net after Sprint 3: 15 of the ~19 individually-itemized findings closed (6 from Sprint 1, 2 upgraded in Sprint 2, 7 newly closed this sprint: F-006, F-010, F-011, F-012, F-013, F-014, F-016), 3 remain open and correctly deferred (F-018, F-020, F-021), 1 not applicable (F-022), and 1 (Social Alerts) was in the raw report's original scope but not in this sprint's assigned scope, so its status is genuinely unknown rather than closed or open.**

## 3. Score Delta -- Two Separate Views, Both Estimated

**Read this the same way as the prior two closeouts: reasoned projections, not measured results.** Section 6 explains why Sprint 3's numbers carry a structurally larger uncertainty than Sprint 1's or Sprint 2's.

### 3a. Why Sprint 3's isolated effect is potentially large -- but conditional

The raw QA report itself identified the 9-hanging-workspace pattern as "the single biggest UX failure found" and, separately, as the mechanism behind its worst-case investor-demo scenario: *"a genuinely cold click-through has a real chance of landing on AI Workspace, Integrations, Settings, or Audit Logs -- each of which hangs forever with no error, no explanation, no way forward. That's a demo-ending failure mode."* If the live deployment, once redeployed, behaves the way the current local code does, this sprint directly resolves that scenario for 6 of the 7 pages named across the report (AI Workspace, Approvals, Stakeholders, Analytics, Integrations, Settings, Organization Admin, Audit Logs minus Social Alerts, which was not audited). That makes this sprint's *potential* impact larger per-axis than Sprint 2's. The word "potential" is doing real work in that sentence -- see Section 6.

### 3b. Sprint 3 Isolated Delta (vs. post-Sprint-2 projected state)

| Score | Post-Sprint-2 projected | Post-Sprint-3 projected | Isolated Sprint 3 delta |
|---|---|---|---|
| Beta readiness | ~46-56/100 | ~54-70/100 | **+8 to +14 points** (≈+15-25% relative) -- most of the workspace-coverage-matrix P0 rows (the report's own biggest cited UX failure) would flip from "Never resolves" to "Loads," assuming redeploy. |
| Enterprise readiness | ~58-65/100 | ~64-75/100 | **+6 to +10 points** (≈+9-15% relative) -- Audit Logs (an explicitly named compliance-evidence page) resolving, plus removal of raw error text, are direct enterprise-trust signals. |
| Investor demo readiness | ~56-65/100 | ~66-83/100 | **+10 to +18 points** (≈+18-28% relative) -- this is the largest isolated move of the three sprints so far, because it directly targets the report's own stated worst-case investor-demo failure mode. |
| Pilot customer readiness | ~25-34/100 | ~30-43/100 | **+5 to +9 points** (≈+15-26% relative) -- a pilot user navigating the product would no longer hit dead-end spinners, and Audit Logs (cited as needed for compliance evidence) now resolves. |

### 3c. Sprint 1+2+3 Composite Delta (vs. original QA baseline)

| Score | Original QA baseline | Post-Sprint-1+2+3 composite projected | Composite delta (absolute) | Composite delta (% relative) |
|---|---|---|---|---|
| Beta readiness | 22/100 | ~54-70/100 | +32 to +48 | ≈+145% to +218% |
| Enterprise readiness | 48/100 | ~64-75/100 | +16 to +27 | ≈+33% to +56% |
| Investor demo readiness | 35/100 | ~66-83/100 | +31 to +48 | ≈+89% to +137% |
| Pilot customer readiness | 12/100 | ~30-43/100 | +18 to +31 | ≈+150% to +258% |

## 4. What Improved (Sprint 3 Specifically)

- The exact QA-reported symptom on Approvals ("Loading Executive Dashboard") is fixed at its actual root cause -- a missing route-metadata entry -- not papered over. This had zero test coverage before this sprint; it now has two independent regression tests (`routes.test.ts`, `RouteBoundary.test.tsx`).
- Two workspaces (Organization Admin, Audit Logs) that had a genuine, if narrow, defect (a `loading` flag with no terminal fallback) are fixed, and both now show an explicit "Sign in required" state instead of a blank page for an edge-case absent-user condition.
- Nine call sites across three files no longer surface a raw backend string (like `"Unauthorized."`) to the user -- each now shows fixed, role-aware copy (sign-in-required, permission-denied, or generic-retry) and logs the real detail to the console for developer diagnostics instead of discarding it or showing it to the end user.
- Seven of the nine workspaces named in the sprint scope (AI Workspace, Approvals, Stakeholders, Analytics, Integrations, Settings, and -- once Sprint 3's specific defect is counted -- Organization Admin/Audit Logs) now have direct automated test coverage proving they resolve without hanging, where none existed before.
- The credentials-configuration panel in Integrations -- the single highest-severity spot for a raw-error leak, since it handles provider secrets -- was specifically hardened.

## 5. What Has Not Improved (Sprint 3 Specifically)

- **Social Alerts was not audited.** It was part of the raw QA report's original 9-workspace list but was not part of the Sprint 3 prompt's explicit "Affected Workspaces" list (which named "AI Review Inbox" instead). Its loading behavior, and whether it shares the same class of defect found elsewhere, remains unknown.
- Live beta verification did not happen. Every finding in this closeout is a local-code audit plus automated test, not a re-run of the QA golden path against `beta.triaxisventures.com`.
- The remaining P2 findings (F-018 onboarding progress inconsistency, F-020 sidebar badge mismatch, F-021 duplicate Dashboard requests) are entirely untouched -- correctly deferred to Sprints 4 and 5, not accidentally skipped.
- The credential-save/revoke error-copy fix in Integrations does not change the underlying fact (documented in that panel's own existing code comment) that live connectivity verification against the external provider is not implemented -- saving still only confirms the credential was stored, not that the provider accepted it. Sprint 3 did not change this.
- No performance work was done -- request deduplication (F-021) and general loading-state *speed* are unrelated to this sprint's "does it ever resolve" scope.

## 6. Caveats And Assumptions (Detailed)

- **The single most important caveat for this closeout, more so than for Sprints 1 or 2:** most of Sprint 3's findings are of the form "this does not reproduce in the current local codebase," not "we shipped a code fix that will change behavior on redeploy." For Sprints 1 and 2, the fix *is* the code change, and its effect is fully contingent only on that code reaching the live deployment. For Sprint 3, roughly two-thirds of the audited workspaces (5 of 9: Stakeholders, Analytics, Settings, and the "safe" parts of AI Workspace/Integrations/AI Review Inbox) were already safe in the current source -- which means either (a) the live beta tested by QA was running meaningfully older or different code than what is in this repository today, or (b) something about the live deployment's runtime environment (not just its source code) caused the hang independently of what's in source control. This closeout cannot distinguish between those two possibilities. **If (b) is true, redeploying this exact code will not resolve the reported symptoms**, and Sprint 3's projected score improvements in Section 3 would not materialize. This can only be resolved by Sprint 5's live redeploy and QA replay.
- **Assumption:** Section 3's isolated and composite deltas assume the eventual live redeployment runs code equivalent to the current `main` branch (post-MR-!4) and that the auth-shell/demo-mode environment variables are configured per `docs/VERCEL_DEPLOYMENT.md`. Neither has been confirmed against the actual Vercel project.
- **Caveat:** "Closed (verified by audit)" in Section 2, for Stakeholders and Analytics specifically, means "confirmed the current source code cannot exhibit this failure mode" -- it is a weaker claim than "closed, verified" (Sprint 1's F-001/F-002/F-003), which had a direct behavioral regression test exercising the actual fixed code path. There was no bug to regression-test for Stakeholders/Analytics because there was nothing to fix; the render tests added confirm current-state safety, not a fix.
- **Caveat:** the F-006-F-014 numbering ambiguity described in Section 2's preamble is a genuine gap in the source documentation, not something this closeout invented -- but this closeout's table is the first place in this repository's documentation trail where that ambiguity (F-007/F-008/F-009 never being individually itemized) is made explicit rather than papered over with an invented one-to-one mapping.
- **Caveat:** the isolated Sprint 3 delta in Section 3b, like Sprint 2's, is a subjective allocation exercise with no formula available from the original QA report. The ranges reflect the reasoning given in Section 3a, weighted toward the report's own emphasis (workspace-loading was called its single biggest UX failure, and the investor-demo scenario was explicitly tied to exactly these pages) -- but they are estimates, not a computation.
- **Caveat:** the `44adcbb` CI pipeline fix (found while verifying the MR merge) is unrelated to Sprint 3's QA scope and is not counted anywhere in this closeout's findings ledger or score deltas -- it is a pipeline-infrastructure correctness issue, not a product-facing finding from the QA report.
- **Assumption carried over from Section 3's Sprint 1 and Sprint 2 starting points:** the post-Sprint-2 figures used as this closeout's baseline were themselves estimates from `docs/SPRINT_2_CLOSEOUT_2026_07_22.md`, not measured values -- errors in that estimate compound into this one.

## 7. Sprint 3 Closure Statement

Sprint 3 -- Workspace Loading And Error-State Hardening -- is **closed**, within the constraints given (Section 1). All implementation checklist items, required tests, lint/type checks, build/regression checks, and documentation updates are complete and passing locally (108 test files / 324 tests, typecheck/lint/build/supabase:verify all clean). Seven QA findings (F-006, F-010, F-011, F-012, F-013, F-014, F-016) are newly closed this sprint, bringing the cumulative total to 15 of ~19 itemized findings closed. The sprint's most consequential result was not a large volume of code change but a root-cause fix (the missing Approvals route entry) and the honest determination that most of the QA report's "9 hanging workspaces" narrative does not reproduce in the current codebase -- a finding that is good news only if it also holds true on the next live redeploy, which remains unverified (Section 6).

**Recommended next step:** Sprint 4 -- Demo/Live Data Separation And Navigation Integrity -- per `docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md`, addressing F-018/F-020/F-021. Before or alongside Sprint 4, consider a short, explicit audit of Social Alerts (the one raw-report workspace this sprint did not cover) to close the Section 6 gap, and flag to whoever manages the live Vercel deployment that Sprint 5's live QA replay is now the single highest-value remaining step -- it is the only way to convert any of the three closeouts' estimated deltas into a measured one.
