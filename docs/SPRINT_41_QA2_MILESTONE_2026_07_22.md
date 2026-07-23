# Sprint 41 - QA 2: Live Verification, Tenant Isolation & Release-Gate Audit - Milestone Record - 2026-07-22

## Attestation Of Authorship (Stated Explicitly, In Full)

**AXXESS TRIaxis was built end to end by one person: Sudipta Koushik Sarmah, Founder & Managing Director of Triaxis Ventures Private Limited.**

This covers, without exception: design, product definition, coding, engineering, testing, workflow orchestration, beta feedback collection, product iteration and remediation across the full Sprint 1-41 program documented in this file, and both Tenant 0 onboarding attempts (`docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`).

**No second human has been involved in any part of this work, at any point.** The only assistance used throughout has been AI assistant tools and agents -- Claude Code, Codex, Claude Pro, ChatGPT Plus, Microsoft Copilot, and the other tools recorded in Section 9's spend record below.

This is recorded here as the user's own direct, explicit statement -- Claude Code has not independently verified identity or sole authorship (it has no mechanism to), and this record should be read as an attestation, not a third-party audit finding. The same statement is also recorded in `README.md`'s "Provenance" section and `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`.

## 0. What This Document Is

This is the canonical milestone record for **Sprint 41 ("QA 2 - Live Verification, Tenant Isolation & Release-Gate Audit")**, the sprint previously tracked in this repository's documentation as **"Sprint 5"** of the five-sprint QA remediation program (`docs/SPRINT_5_CLOSEOUT_2026_07_22.md`). That document remains in place, unmodified, as the detailed technical closeout for this sprint's own findings ledger and score deltas -- this document supersedes it only as the **numbering and program-context record**, placing that same sprint's work inside the full engineering history of AXXESS (Sprint 1 through Sprint 41), documenting total program spend, and answering the specific questions asked of it: next actionables, gap analysis, delta report, caveats, a fact/partial/untouched breakdown, the complete test and lint ledger, and the deployment narrative including what stalled and what errored.

Nothing technical is re-derived or re-verified here that Sprint 5's own closeout, the four QA closeouts before it, or `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md` already established -- this document consolidates and re-contextualizes that evidence under the renumbering the user has now specified, and extends it with the specific new content requested.

## 1. Full Program History And Numbering (Sprint 1-41)

| Sprint range | Owner | Name | What it produced |
|---|---|---|---|
| **1-32** | Codex | Engineering & Product Sprints | The core AXXESS product build: identity/governance, enterprise workflows, AI orchestration/RAG, connector infrastructure (Gmail/Microsoft/Notion), operational controls, release automation, pilot tenant acceptance, customer-success live-ops, and full-stack mobile store launch readiness (Android/iOS). This history is recorded sprint-by-sprint throughout `docs/SPRINT_LOG.md` and `README.md`'s "Current Engineering Status" section. Delivered **beta 0.70**. |
| **33-35** | Claude Code | Post-enterprise-beta-feedback product iteration | Iteration driven by real enterprise beta feedback: **n=30 respondents, 1,200+ actionable feedback points, NPS 80+**. This is the period covering the canonical workspace migration/consolidation and the demo/live data-leakage remediation rounds referenced in `Enterprise beta feedback - Batch 1 (30 responses)/DEMO_DATA_LEAKAGE_AUDIT.md` (5 rounds of fixes documented there) and `docs/CANONICAL_WORKSPACE_MIGRATION.md`. |
| **36** | Claude Code | Exhaustive QA -- full workflow orchestration | The independent, end-to-end QA audit that produced the raw artifact preserved at `docs/qa-artifacts/2026-07-22-claude-code-beta-e2e-qa-report.txt` (SHA-256 `05102445D0CC696072109AB43848C1F378BE6E39BAC0A8E587ED45EBAC6DA488`), scoring the beta 22/100 (beta readiness), 48/100 (enterprise), 35/100 (investor demo), 12/100 (pilot customer) and identifying 22 numbered findings (F-001 through F-021, plus a tooling note). This sprint functions as this program's **"QA 1"** round, even though it was not literally labeled that at the time. |
| **37** | Codex + Claude Code (coordinated) | QA remediation 1: Auth Integrity And Protected Access | Closed F-001 through F-005. Previously tracked in this repo as "Sprint 1" of the QA program. See `docs/SPRINT_1_CLOSEOUT_2026_07_22.md`. |
| **38** | Codex + Claude Code (coordinated) | QA remediation 2: Live Tenant Persistence And Golden Path Writes | Closed F-004/F-005's evidence gap. Previously "Sprint 2." See `docs/SPRINT_2_CLOSEOUT_2026_07_22.md`. |
| **39** | Codex + Claude Code (coordinated) | QA remediation 3: Workspace Loading And Error-State Hardening | Closed F-006 through F-014, F-016. Previously "Sprint 3." See `docs/SPRINT_3_CLOSEOUT_2026_07_22.md`. |
| **40** | Codex + Claude Code (coordinated) | QA remediation 4: Demo/Live Data Separation, Navigation Integrity And Tenant Trust | Closed F-018, F-020. Previously "Sprint 4." See `docs/SPRINT_4_CLOSEOUT_2026_07_22.md` and the dedicated `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md`. |
| **41** | Claude Code | **QA 2: Live Verification, Tenant Isolation & Release-Gate Audit** -- **MILESTONE** | The sprint this document is about. Closed F-021 (the last of the 20 original actionables), performed this program's first real live-provider verification and production redeploy, wrote (but did not execute) a two-tenant isolation harness, generalized audit/timeline evidence beyond `projects`, formally audited and fixed a previously-undiscovered Social Alerts demo-data leak, and resolved both recurring tech-debt warnings. Previously tracked in this repo as "Sprint 5." See `docs/SPRINT_5_CLOSEOUT_2026_07_22.md` for full technical detail. |

**Renumbering convention going forward:** this repository's QA-program documents (`docs/SPRINT_1_CLOSEOUT_2026_07_22.md` through `docs/SPRINT_5_CLOSEOUT_2026_07_22.md`, `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md`) are **not renamed or renumbered in place** -- they remain filed under their original "Sprint 1-5" QA-program-local numbering, and this document is the cross-reference that maps each one to its place in the full Sprint 1-41 engineering history (Sprint 1 QA-local = Sprint 37 overall, Sprint 2 QA-local = Sprint 38, Sprint 3 QA-local = Sprint 39, Sprint 4 QA-local = Sprint 40, Sprint 5 QA-local = **Sprint 41, "QA 2," this milestone**).

## 2. Sprint 41 (QA 2) -- What It Did, In Full

See `docs/SPRINT_5_CLOSEOUT_2026_07_22.md` Sections 1-8 for the complete, itemized technical record. Summarized:

1. **Live replay against `beta.triaxisventures.com`** using a real browser session (not just code audit): confirmed the production deployment was still running pre-Sprint-37 code -- a cold browser rendered a full mock-authenticated "Organization Admin" dashboard while every tenant-scoped API call returned `401` (F-001/F-003, live-confirmed), and the network log showed the dashboard's data hooks firing the same ~16 requests 2-3x each, then the whole batch again (F-021, live-confirmed, worse than assumed).
2. **Root-caused why**: `npx vercel inspect` showed the live production deployment was created 2026-07-21, before Sprint 37 (QA-local Sprint 1) even began; `npx vercel env ls production` showed `NEXT_PUBLIC_AXXESS_AUTH_SHELL`/`NEXT_PUBLIC_AXXESS_DEMO_MODE` had never been set on the Vercel project at all.
3. **With the user's explicit, in-session approval**, set both missing environment variables and executed a production redeploy via the Vercel CLI, intending to ship Sprints 37-41's cumulative fixes live for the first time.
4. **Fixed F-021** at its root cause: `useLiveWorkspaceMetrics` was called 3 independent times within `DashboardSection` alone, each with its own uncoordinated fetch. Added a tenant-scoped, short-TTL, in-flight-request cache (`src/hooks/liveWorkspaceMetricsCache.ts`) shared by all three call sites, invalidated on logout.
5. **Formally audited Social Alerts** (a gap left informal since QA-local Sprint 3/4) and found a genuine, previously undocumented bug: `AlertsSection.tsx` showed 4 demo alerts and a hardcoded "4 active" badge completely unconditionally, with zero Demo Mode gating. Fixed to match the established Analytics/Stakeholders pattern.
6. **Generalized audit/timeline evidence** from `projects`-only (QA-local Sprint 2's scope) to also cover `tasks`, `documents`, `knowledge_articles` and `meetings`.
7. **Wrote `scripts/verify-two-tenant-isolation.mjs`**, an executable harness that creates two real Supabase Auth users in two real organizations and proves neither can read or mutate the other's data via real RLS. Not executed this sprint (no linked Supabase project, no local Docker daemon).
8. **Resolved both recurring tech-debt warnings**: renamed `middleware.ts` to `proxy.ts` (Next.js 16's official, behavior-identical rename) and confirmed the one permissive-RLS warning (`public.permissions`, a table with no tenant/user column at all) is genuinely safe, documenting the rationale rather than leaving it unexplained.

## 3. Facts, Partial/Incomplete, And Untouched -- The Explicit Three-Way Breakdown Requested

### 3a. What Can Be Said As Facts (directly observed or executed this sprint, not inferred)

- The live production deployment at `beta.triaxisventures.com`, as of this sprint's live replay, was running code that predates Sprint 37 -- observed directly via a real browser session and a captured network-request log, not assumed.
- Every tenant-scoped API call observed during that replay (`projects`, `tasks`, `notifications`, `documents`, `workflows/timeline`, `programs`, `users`) returned `401` while the client rendered a fully authenticated dashboard -- a direct, first-party observation of F-001/F-003 reproducing live.
- The same set of dashboard requests fired 2-3x each, then the entire batch fired again a second time, in the same page load -- a direct, first-party observation of F-021 reproducing live, and worse than the audit-only assumption carried since Sprint 36.
- `beta.triaxisventures.com` is aliased to the `axxesstriaxis` Vercel project's `target: production` deployment (confirmed via `npx vercel inspect`), which was created 2026-07-21 14:31 IST -- before this session's Sprint 37 work began.
- `NEXT_PUBLIC_AXXESS_AUTH_SHELL` and `NEXT_PUBLIC_AXXESS_DEMO_MODE` were absent from the Vercel project's production environment variables (confirmed via `npx vercel env ls production`) until this sprint set them explicitly (confirmed via a follow-up `env ls`).
- `public.permissions` (the table behind the one recurring RLS warning) has no `organization_id`, `user_id`, or any tenant/user-identifying column at all -- confirmed by reading its own `create table` statement in the migration file, not assumed from the warning text alone.
- 113 test files / 349 tests pass locally as of this sprint (up from 96/286 at the start of the QA program in Sprint 37); `pnpm run lint` reports zero warnings; `pnpm run typecheck` and the mobile equivalent report zero errors; `pnpm run build` succeeds with the Next.js middleware-deprecation warning confirmed absent; `pnpm run supabase:verify` reports the same 27 migrations / 100 RLS-protected tables as every prior sprint.
- A production deploy was executed via `pnpm run vercel:deploy:production` with the user's explicit approval, after an earlier attempt failed with a confirmed, transient DNS resolution error (`getaddrinfo ENOTFOUND api.vercel.com`), not a code or configuration problem (Section 7 documents this in full). **The retry succeeded**: deployment `dpl_F6Q3Cq4wZdi6DaWFENfGWgLPJYwt` reached `readyState: READY` and is confirmed aliased to `beta.triaxisventures.com`.
- **A post-redeploy live replay confirmed F-001/F-003 are fixed live, not just locally**: a fresh, cookie-less browser against `https://beta.triaxisventures.com/` now shows the real "Sign in" form, and the network log shows exactly one request (`GET /api/auth/session -> 401`), not a rendered mock dashboard. This is a genuine, measured before-and-after live result -- the first of its kind in this program's history. (F-021's dedup fix specifically was not re-confirmed live by this replay -- see Section 3b.)

### 3b. What Is Partially Done / Incomplete

- **F-021's dedup fix specifically**: the code fix and its unit tests are done, and the auth-fix half of the post-redeploy replay succeeded -- but that replay was unauthenticated and, correctly, never reached the dashboard, so the duplicate-request fix itself has not been re-observed live. This is now the single most consequential "partial" item remaining.
- **Two-tenant isolation**: a real, executable harness exists and is unit-tested for its own internal logic, but has never been run against an actual database. "Tenant isolation is verified" remains true only at the unit/static-RLS-policy level, exactly as it was before Sprint 41 -- the harness closes the *tooling* gap, not the *verification* gap, until someone runs it.
- **Audit/timeline evidence coverage**: extended from 1 of 16 possible resource types to 5. The remaining 11 (`organizations`, `users`, `programs`, `document_versions`, `document_categories`, `document_tags`, `document_permissions`, `document_activity`, `notifications`, `audit_logs` itself, `invitations`) still write with no audit/timeline trail through the generic repository route -- though `approval_requests`/`stakeholder_notes`/`project_updates` are separately covered through the AI-review-approved-action path, confirmed by audit rather than newly built.
- **Live golden-path replay**: only the unauthenticated, cold-start portion was replayed live (and confirmed fixed -- see Section 3a). Sign-in, project creation, and dashboard/audit/timeline verification as a real authenticated tenant were not replayed live this sprint -- doing so would require creating a new real account, which this program's own constraints do not permit an unattended agent to do.
- **Sidebar badge counts** (Social Alerts, Approvals): the decision to hide rather than fabricate is implemented and documented, but no live counting data source was built. This remains "Option A implemented," not "Option B built," exactly as it was after Sprint 40.

### 3c. What Is Genuinely Untouched Toward Beta 1.0 And Pilot Readiness

- **No Playwright/E2E coverage exists for any QA-program fix**, across all five QA-local sprints (37-41). Every regression test added in this entire program is Vitest unit/component-level or a source-content assertion. This was explicitly requested in Sprint 41's own prompt and was not delivered.
- **No live provider/connector testing** has ever been performed in this program -- Gmail, Microsoft, Notion and enterprise-connector states have only ever been confirmed correct by reading code, never by exercising a real OAuth credential.
- **The "Enterprise Beta 1.0" gate** from `docs/NEXT_5_MILESTONES_BETA_AND_MOBILE_RELEASE.md` -- Triaxis Ventures Pvt Ltd onboarding fully as the first real tenant and Claude Code auditing that live workflow as market-release beta -- has not been attempted at any point in this QA program.
- **iOS App Store and Android Google Play releases** (the other two of the "next 5 milestones") remain exactly where they were before this QA program started; nothing in Sprints 37-41 touched mobile store submission itself, only the pre-existing mobile release-gate tooling used as a verification check.
- **Mixpanel/PostHog validated analytics events** and the **first-30-users analytics review** milestones are untouched by this QA program.
- **No security review or penetration test** has been performed on the live deployment at any point in this program.
- **GitHub reinstatement**: the GitHub remote has been suspended (403) since before Sprint 37 and remains suspended as of Sprint 41. Every commit across all five QA-local sprints has gone to GitLab only. This has never been revisited or escalated within the QA program's own scope.

## 4. Gap Analysis, Updated To This Point

`docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md` (covering QA-local Sprints 1-4 / overall Sprints 37-40) already carries a Sprint 5/41 update note pointing here. Restating its status after Sprint 41:

- Of that document's 7-item priority list (Section 8), **items 1 (live redeploy+replay -- resolved for F-001/F-003, the auth mismatch; F-021's dedup fix specifically still needs an authenticated live check, see 3b), 3 (extend audit evidence -- resolved), 4 (F-021 -- resolved locally and confirmed live pre-fix; not yet re-confirmed live post-fix), 5 (formal Social Alerts audit -- resolved), and 7 (tech-debt warnings -- resolved)** are addressed by Sprint 41. **Item 2 (live two-tenant isolation test)** has its tooling gap closed but not its verification gap (Section 3b). **Item 6 (live badge-count strategy)** was explicitly decided (Option A) and documented, not newly built.
- The single largest gap identified across the whole program -- Phase 4 (Tenant Isolation And Governance Verification) never having been attempted live -- is **still open**. The harness now exists; the live run does not.
- A new gap, not previously documented anywhere in this program, was discovered this sprint: the Social Alerts unconditional-demo-data bug (Section 2, item 5 above). It is now closed, but its prior existence means the QA program's own coverage was not exhaustive even after four full remediation sprints -- worth noting for future audits' calibration of how much residual risk to assume even after a "clean" sprint.
- The gap analysis's own central caveat -- "no sprint has ever run against a live deployment" -- is the one this sprint was built to resolve, and it is now **half-resolved**: the *before* state was directly measured; the *after* state (post-redeploy) has not yet been confirmed as of this writing (Section 9).

## 5. Delta Report

See `docs/SPRINT_5_CLOSEOUT_2026_07_22.md` Section 3 for the full isolated-Sprint-41 and composite-Sprint-37-through-41 score tables, reproduced here for convenience:

| Score | Original QA-36 baseline | Post-Sprint-40 (QA-local 4) | Post-Sprint-41 (QA 2) | Composite delta (37-41) |
|---|---|---|---|---|
| Beta readiness | 22/100 | ~57-72/100 | ~68-82/100 | +46 to +60 (≈+209% to +273%) |
| Enterprise readiness | 48/100 | ~69-80/100 | ~75-85/100 | +27 to +37 (≈+56% to +77%) |
| Investor demo readiness | 35/100 | ~70-87/100 | ~80-92/100 | +45 to +57 (≈+129% to +163%) |
| Pilot customer readiness | 12/100 | ~33-46/100 | ~40-52/100 | +28 to +40 (≈+233% to +333%) |

**Every number above except the "Original QA-36 baseline" column is an estimate, not a measurement** -- this has been true of every closeout in this program and remains true here. The one thing that changed in Sprint 41 is that the *baseline these estimates project from* is, for the first time, itself grounded in a directly observed live state rather than an assumption about one. See Section 3a/3b above and Section 6 of the Sprint 5 closeout for the full reasoning.

## 6. All Tests Performed And Cleared, Plus Lint, Sprint 37 Through Sprint 41

| Sprint (QA-local / overall) | Test files | Tests | Lint | Typecheck (web) | Typecheck (mobile) | Build | Supabase verify | Mobile release gates |
|---|---|---|---|---|---|---|---|---|
| 37 (Sprint 1) | 96 | 286 | PASS, 0 warnings | PASS | PASS | PASS | PASS (27 migrations, 100 RLS) | PASS |
| 38 (Sprint 2) | 98 | 299 | PASS, 0 warnings | PASS | PASS | PASS | PASS (unchanged) | PASS |
| 39 (Sprint 3) | 108 | 324 | PASS, 0 warnings | PASS | PASS | PASS | PASS (unchanged) | PASS |
| 40 (Sprint 4) | 110 | 331 | PASS, 0 warnings | PASS | PASS | PASS | PASS (unchanged) | PASS |
| **41 (QA 2)** | **113** | **349** | **PASS, 0 warnings** | **PASS** | **PASS** | **PASS (middleware-deprecation warning now absent)** | **PASS (unchanged: 27 migrations, 100 RLS-protected tables, same single documented-safe legacy warning)** | **PASS** |

New test files added specifically in Sprint 41: `src/hooks/liveWorkspaceMetricsCache.test.ts` (4 tests), `src/features/alerts/AlertsSection.test.tsx` (3 tests), `scripts/verify-two-tenant-isolation.test.mjs` (7 tests), `src/proxy.test.ts` (replaces `src/middleware.test.ts`, same 18 test cases). Extended files: `src/app/api/repositories/[resource]/route.test.ts` (+4 cases for the generalized evidence writer), `src/auth/AuthProvider.test.tsx` (+1 case for cache invalidation on logout).

Every one of these test runs was executed in this session via `corepack pnpm exec vitest run` / `corepack pnpm run <script>` and the pass/fail counts above are copied directly from that tooling's own output, not summarized from memory.

## 7. What Deployed, What Took Multiple Attempts, What Stalled, What Gave Errors

This section documents the deployment attempt narrative in full, as explicitly requested.

1. **First attempt** -- `corepack pnpm run vercel:deploy:production` (no extra flags): **failed immediately**. `scripts/deploy-vercel.mjs` internally shells out to plain `pnpm` (not `corepack pnpm`) to run its own pre-deploy typecheck/lint/test gate. Plain `pnpm` is not on `PATH` in this Bash environment (a known, pre-existing environment quirk, not specific to this sprint). Error: `'pnpm' is not recognized as an internal or external command`.
2. **Second attempt** -- same command with `--skip-checks` appended (to bypass the internal gate, since the equivalent checks had already been run manually and passed moments earlier): **blocked by the Claude Code auto-mode classifier**, not by any technical failure. The classifier's own message explained it was blocking this specific action given the stakes of a production deploy combined with skipping its own safety checks. This was treated as a legitimate stop, not worked around.
3. **Root-cause fix for the `pnpm`-not-found problem**: rather than continuing to use `--skip-checks` (which the classifier had just declined), a local shim was created instead -- `~/.local-bin/pnpm` (a POSIX shell script forwarding to `corepack pnpm`) and, once that proved insufficient for Windows-native process spawning, `~/.local-bin/pnpm.cmd` (a `.cmd` batch-file wrapper, since Node's `child_process` on Windows resolves command names using Windows' own `PATHEXT` rules, which do not recognize an extension-less Unix shell script as an executable).
4. **Third attempt** -- `corepack pnpm run vercel:deploy:production` (no `--skip-checks`, now with the `.cmd` shim on `PATH`): **succeeded in starting** -- the internal typecheck/lint/test/build gate ran for real this time and passed, taking roughly 6 minutes (this matches the ~7-minute full test-suite runtime observed earlier in this same session). The command then progressed to its final step, `npx vercel deploy --prod --yes`, confirmed via direct process inspection (`Get-CimInstance Win32_Process`) showing that exact command line running.
5. **What looked like a stall turned out to be a real failure, confirmed once the backgrounded command's own output finally surfaced**: the `vercel deploy --prod --yes` step (deployment `dpl_6PVJJDfsxLJrgrsKDTRYR4VzrtKH`) ran for roughly 25-30 minutes, then completed with a definitive error, not a timeout: `{"status":"error","reason":"deploy_failed","message":"request to https://api.vercel.com/v13/deployments/dpl_6PVJJDfsxLJrgrsKDTRYR4VzrtKH?teamId=... failed, reason: getaddrinfo ENOTFOUND api.vercel.com"}`. This is a **DNS resolution failure** -- the local machine, at that moment, could not resolve `api.vercel.com` at all -- not a code defect, not a Vercel-side outage, and not a configuration mistake. Vercel's own CLI output included the correct next step: `"next": [{"command": "vercel deploy", "when": "retry deploy"}]`.
6. **Confirmed transient**: immediately after the failure was discovered, `curl` and `nslookup` against `api.vercel.com` both succeeded normally (`nslookup` resolved `76.76.21.112`; `curl` got a normal `308` redirect). Whatever caused the DNS failure had already cleared.
7. **Fourth attempt -- succeeded.** `pnpm run vercel:deploy:production` was re-run (same `.cmd`-shim approach from step 3) once connectivity was confirmed restored: deployment `dpl_F6Q3Cq4wZdi6DaWFENfGWgLPJYwt` completed with `{"status":"ok","readyState":"READY","target":"production"}`, and `npx vercel inspect` confirmed it aliased to `beta.triaxisventures.com` (among the project's other domains). **A post-redeploy live replay, performed immediately after, confirmed the fix live**: a fresh, cookie-less browser against `https://beta.triaxisventures.com/` now shows the real "Sign in" form, and the network log shows exactly one request (`GET /api/auth/session -> 401`) -- no dashboard data ever fires for an unauthenticated visitor, because the dashboard is now correctly gated behind login. This is the first genuine before-and-after live measurement in this entire program's history, not an estimate.
8. **What did *not* fail or stall**: every local verification command (`typecheck`, mobile `typecheck`, `lint`, `test`, `build`, `supabase:verify`, `mobile:store:release-gate`, `mobile:capacitor:store:doctor`) ran cleanly on the first attempt, with no retries needed, across this entire sprint -- including inside the deploy script's own pre-deploy gate, both times it ran. The two Vercel environment-variable additions (`NEXT_PUBLIC_AXXESS_AUTH_SHELL`, `NEXT_PUBLIC_AXXESS_DEMO_MODE`) succeeded on the first attempt each, confirmed via a follow-up `vercel env ls`.
9. **What this means concretely for the "facts vs. partial" breakdown in Section 3**: the first production deploy attempt is a **confirmed failure** with a specific, transient, non-code root cause; the retry is a **confirmed success**, and its effect (F-001/F-003 fixed) is now a **measured fact**, not an estimate -- move this item from Section 3b ("partial") to Section 3a ("facts") accordingly. F-021's dedup fix specifically still requires an authenticated live check, which this unauthenticated replay could not perform -- that remains in Section 3b.
10. **GitHub reachability was restored late in this sprint** -- every repository-status claim in Sprints 37-41 (and every closeout through the first version of this document) stated GitHub (`origin`) was suspended (403). A routine `git ls-remote --heads origin` re-check, run as standing practice before every push, returned a full branch listing instead of a 403 for the first time in this program's history. `canonical/sprint-1-35-unified-gitlab` was pushed to GitHub as a new branch at that point (`main` was not touched), per the "prefer GitHub if reachable, mirror to GitLab" policy stated in every sprint prompt. This is a genuine, first-party-confirmed status change, not an assumption -- future sprints should re-check GitHub reachability rather than continuing to assume it is suspended.

## 8. Caveats (Consolidated)

- Every score in Section 5 is an estimate except the original QA-36 baseline itself; see Section 5's closing note.
- The redeploy's outcome is unconfirmed (Section 7, item 5) -- nothing in this document should be read as claiming the live site is currently fixed. Only the *pre*-redeploy broken state is a confirmed fact (Section 3a).
- The two-tenant isolation harness has never been executed against a real database (Section 3b).
- No live authenticated golden-path replay has ever been performed in this program, on any of Sprints 37-41.
- No Playwright/E2E test exists for any fix made across Sprints 37-41.
- The Sprint 33-35 and Sprint 1-32 summaries in Section 1 are stated at the level of generality already documented elsewhere in this repository (`docs/SPRINT_LOG.md`, `README.md`, `docs/CANONICAL_WORKSPACE_MIGRATION.md`, the `DEMO_DATA_LEAKAGE_AUDIT.md` feedback-round document) -- this document does not re-derive or independently re-verify those sprints' individual technical claims, only places them in the requested numbering scheme.
- The spend figures in Section 10 are as supplied by the user for this documentation request; this document records them as given and does not independently audit invoices, receipts, or billing statements.

## 9. Total Program Spend Through Sprint 41

As documented by the user, covering the full Sprint 1-41 program to date:

| Item | Cost | Term |
|---|---|---|
| ChatGPT Plus | $20 | 1 month |
| Codex credits (2,500) | $100 | -- |
| Claude Pro | $23 | 1 month |
| Microsoft Copilot | $10 | 1 month |
| Website build and hosting | $60 | -- |
| Vercel | Free | -- |
| Linear | Free | -- |
| Supabase | Free | -- |
| GitHub | Free | -- |
| GitLab | Free | -- |
| VS Code | Free | -- |
| Capacitor | Free | -- |
| **Total product/dev/web spend** | **≈$220** | |

This covers the entire program's tooling cost from Sprint 1 (Codex) through Sprint 41 (QA 2) -- an enterprise-grade, 41-sprint product and QA remediation program, including a full-stack mobile-ready enterprise SaaS product, a 30-respondent enterprise beta with 1,200+ actionable feedback points and NPS 80+, an independent exhaustive QA audit, and a five-round live-verification remediation program, delivered for approximately $220 in total tooling spend.

## 10. Milestone Declaration

**Sprint 41 -- "QA 2: Live Verification, Tenant Isolation & Release-Gate Audit" -- is hereby marked as a program milestone**, on the basis that it is the first sprint in the entire Sprint 1-41 history to:

- perform a real, executed, first-party live-provider verification of the production deployment (not a code audit, not an estimate);
- discover and correct a live, previously-unconfirmed divergence between the audited codebase and the actual deployed product (the deployment predating all QA remediation work);
- close the last of the original 20 QA actionables (F-021);
- attempt (with explicit user authorization) a production deployment as a direct consequence of QA findings, rather than deferring that action to an unspecified future sprint.

This milestone is recorded with an update made within this same sprint: the first production redeploy attempt failed (a confirmed, transient DNS error, not a code problem); the retry succeeded, and a post-redeploy live replay confirmed F-001/F-003 are genuinely fixed on `beta.triaxisventures.com` -- a measured result, not an estimate, and the first of its kind in this program's history. The one qualification that remains is that F-021's dedup fix specifically has not yet been re-confirmed live, since doing so requires an authenticated session that this sprint's read-only replay could not create. Confirming that is now the explicit, single highest-priority item in the next-actionables list below.

**Live Tenant 0 onboarding is now underway**, as this milestone's own recommended next step called for. It is being performed by the user directly (not Claude Code, which cannot create or authenticate a real account itself). The first finding from that walkthrough -- no discoverable sign-up entry point and no OAuth options anywhere in the UI, compounded by a completely missing OAuth callback handler -- has been diagnosed, remediated, deployed, and **confirmed live** (via direct `curl` and a browser screenshot against `beta.triaxisventures.com` itself, not inferred from the deploy command's own success message) as of 2026-07-23. See `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md` (Product Issue 1) for the full record, including what still requires external, non-code setup (real Google/Microsoft OAuth app registration) and what remains open (a generic, unhelpful sign-in error message found in the same investigation). That log will accumulate further findings as the walkthrough continues.

## 11. Next Actionables (20 Items)

Ordered by leverage, highest first:

1. **Perform an authenticated live replay to confirm F-021's dedup fix.** The redeploy succeeded and the unauthenticated replay already confirmed F-001/F-003 are fixed live; what remains is signing in as a real (or provisioned test) tenant and checking the dashboard's network log no longer shows the 2-3x/double-batch duplication pattern observed pre-fix.
2. ~~Perform a post-redeploy live replay against `beta.triaxisventures.com`~~ -- **done this sprint**: confirmed F-001/F-003 fixed live (real login form, single correctly-scoped `401`). Superseded by item 1 above for the remaining, authenticated portion.
3. **Execute `scripts/verify-two-tenant-isolation.mjs`** against a real local (Docker + `supabase start`) or linked/branch Supabase project, and record its printed JSON result as the first genuinely live-verified tenant-isolation evidence in this program.
4. **Perform a full authenticated live golden-path replay** (real or provisioned test tenant: sign-in, project creation, dashboard/audit/timeline verification) against the redeployed beta -- ideally executed by the user or a provisioned test account, since an unattended agent should not create new live accounts.
5. **Add Playwright/E2E coverage for the golden path** (sign-in through project creation through audit/timeline verification), closing a gap every one of Sprints 37-41 has left open.
6. **Add a Playwright/E2E two-tenant isolation test**, complementing the scripted harness with a browser-level check that two real logged-in sessions cannot see each other's data.
7. **Extend audit/timeline evidence** to the remaining resource types not covered by Sprint 41 (`organizations`, `users`, `programs`, `document_versions`, `document_categories`, `document_tags`, `document_permissions`, `document_activity`, `invitations`), if the roadmap's golden path is judged to require them.
8. **Decide and, if warranted, build a real live-count data source** for the Social Alerts and Approvals sidebar badges (Option B), now that Option A (hide in live mode) has been implemented and documented for two consecutive sprints.
9. **Perform live provider/connector testing** (Gmail, Microsoft, Notion, enterprise connectors) with real credentials, since every provider-gated state in this program has only ever been confirmed correct by code audit.
10. **Begin the "Enterprise Beta 1.0" gate**: onboard Triaxis Ventures Pvt Ltd itself as the first full real tenant, per `docs/NEXT_5_MILESTONES_BETA_AND_MOBILE_RELEASE.md`.
11. **Commission a security review or penetration test** of the live deployment before any wider pilot rollout, given this is the first sprint where the live site has been directly, empirically confirmed reachable and (pre-fix) exhibiting real auth-boundary confusion.
12. **Investigate GitHub account reinstatement**, since GitHub has remained the intended primary source-of-truth repository per this program's own stated repository policy, but has been suspended (403) since before Sprint 37 with no escalation attempted within QA-program scope.
13. **Advance the iOS App Store release milestone** (TestFlight and the full testing suite), untouched by the QA program itself.
14. **Advance the Android Google Play release milestone**, same status as iOS.
15. **Wire up Mixpanel/PostHog validated event tracking** across the web, iOS, and Android betas per the "Next 5 Milestones" plan.
16. **Begin the first-30-users analytics review** once real beta users generate events across the three surfaces.
17. **Re-run `docs/SUPABASE_CLI.md`'s local Docker drill** (`supabase start` / `supabase:db:reset` / `supabase:test:rls`) at least once in an environment where Docker is actually running, to confirm the local-development path this program has relied on describing but never actually exercised in-session.
18. **Link this checkout to a real or staging Supabase project** (`pnpm run supabase:link`) so future migrations and the two-tenant isolation harness can be run against a persistent, dedicated project rather than requiring ad hoc local setup each time.
19. **Add CI automation that runs the two-tenant isolation harness on a schedule** against a dedicated staging Supabase project, once one exists, so tenant isolation has standing regression coverage rather than a one-time manual check.
20. **Conduct a Sprint 41+ retrospective on QA-program cost-efficiency**: given the entire Sprint 1-41 program (product build through five rounds of QA remediation) was delivered for roughly $220 in tooling spend (Section 9), consider what marginal spend (e.g., a dedicated staging Supabase project, CI minutes for live E2E runs, provider sandbox credentials for connector testing) is now justified to close the remaining live-verification gaps identified in items 1-9 above.
