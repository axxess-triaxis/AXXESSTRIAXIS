# Sprint 1-4 Gap Analysis - What The Roadmap And Checklist Say Is Still Missing - 2026-07-22

**Sprint 5 update (2026-07-22):** this document is left as-is below, frozen at its original end-of-Sprint-4 state, since it is itself a piece of evidence about what that state was. Sprint 5 closed several of the gaps identified here: F-021 (Dashboard duplicate requests, Section 7/8), the Social Alerts formal audit (Section 4), audit/timeline evidence beyond `projects` (Section 2), and the two recurring tech-debt warnings (Section 5). It also converted the single largest caveat repeated throughout this document -- "no sprint has ever run against a live deployment" -- into a real, executed live browser replay against `beta.triaxisventures.com`, which confirmed the production deployment was still running pre-Sprint-1 code, and then redeployed it. The live two-tenant isolation test (Section 6/priority #2) was written as an executable harness in Sprint 5 but still has not been *run* against a real database -- that gap survives Sprint 5 exactly as described below. See `docs/SPRINT_5_CLOSEOUT_2026_07_22.md` for the full detail.

## Purpose

This document answers one question directly: **across Sprints 1, 2, 3 and 4, what has the five-sprint remediation program *not* done yet**, measured against its own governing documents:

```text
docs/Post-Claude Code exhaustive workflow audit production remediation package.md   (program index)
docs/BETA_QA_ACTIONABLES_2026_07_22.md                                             (20 actionables)
docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md                        (5-phase roadmap)
docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md                          (per-sprint checklist)
docs/SPRINT_LOG.md                                                                  (command-by-command evidence)
docs/SPRINT_1_CLOSEOUT_2026_07_22.md through docs/SPRINT_4_CLOSEOUT_2026_07_22.md  (per-sprint closeouts)
```

Sprint 4's own closeout (Section 8) already inventoried what remains *for Sprint 5 specifically*. This document goes one level deeper: it treats Sprints 1-4 as a completed unit and asks, sprint by sprint, what each one left undone even within its own declared scope -- not just "what was deferred to a later sprint," but "what was the sprint's own checklist item that got a caveat, a partial answer, or a narrower fix than the acceptance criteria technically asked for." Several of the facts below were independently re-verified against the current source tree while writing this document (cited with file/line references), rather than taken only from prior closeout prose.

This is not a criticism exercise for its own sake -- every gap below was already disclosed somewhere in this repository's documentation trail (that repeated, unprompted disclosure is itself part of Sprint 1-4's diligence record). The value of this document is consolidating all of it into one place, sprint by sprint, so nothing is missed by having to cross-reference four closeouts and a checklist to reconstruct the full picture.

## Executive Summary

| Sprint | What it closed | What it left open within its own scope |
|---|---|---|
| 1 (Auth Integrity) | Auth-shell/middleware default, logout, login reachability, protected routes, client/server session agreement -- all locally verified | Live Vercel env vars never confirmed against the actual deployment; investor-preview login only exercised through existing test coverage, not manually re-tested |
| 2 (Live Tenant Persistence) | Confirmed project create/persist/refresh already worked; added audit+timeline evidence for project creation | Audit/timeline evidence was added for **`projects` only** -- tasks, meetings, documents, knowledge articles, invitations and every other of the 16 allowed resource types still create with **no audit_logs or workflow_timeline_events row at all**; live Supabase re-test of the exact QA repro never performed; two-tenant isolation proven only at the unit/RLS level |
| 3 (Workspace Loading) | Fixed Approvals routing bug, 2 stale-loading-flag defects, 9 raw-error leaks | Social Alerts (in the raw QA report's original 9-workspace list) was never audited at all this sprint; live beta replay never performed; no live provider/connector testing |
| 4 (Demo/Live Separation) | Fixed onboarding progress root cause (F-018), sidebar badge gating (F-020) | Fabricated badge counts are *hidden*, not replaced with a real data source; Social Alerts' hang-audit gap from Sprint 3 was only informally, not formally, closed; live beta replay never performed |
| All four, structurally | -- | No sprint has ever run against a live Supabase project or a live Vercel deployment. No Playwright/E2E spec was added for any Sprint 1-4 fix -- every regression test across all four sprints is Vitest unit/component-level or source-content assertion. Two pre-existing tech-debt items (Next.js 16 middleware-deprecation warning, one permissive `using (true)` RLS predicate) have been noted as a caveat in every sprint's verification evidence since Sprint 1 and fixed in none of them. |

## 1. Sprint 1 Gaps (Auth Integrity And Protected Access)

Sprint 1's own checklist (`docs/BETA_QA_5_SPRINT_REMEDIATION_CHECKLIST_2026_07_22.md`, Sprint 1 section) shows every box checked. The gaps are in the caveats attached to those checked boxes, not in unchecked boxes:

- **Live environment variables were never confirmed.** The checklist's own diligence-evidence line states this directly: *"Live Vercel beta environment variables were not verified against the actual `beta.triaxisventures.com` deployment in this pass."* The code now defaults safely even if the variable is missing or misconfigured, but nobody has looked at the actual Vercel project dashboard to confirm `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true` / `NEXT_PUBLIC_AXXESS_DEMO_MODE=false` are actually set there.
- **Investor preview login was never manually re-tested.** Exercised only through the pre-existing `/auth` "Open investor preview" code path and the existing demo-mode test suite -- nobody clicked through it by hand against a running instance this sprint.
- **The exact QA repro was never replayed.** Sprint 1 fixed the *mechanism* (`src/middleware.ts`'s stale env-var check), reasoned from the QA report's description of the symptom -- but the original QA session's literal browser walkthrough (cold browser -> `beta.triaxisventures.com` -> observe mock Organization Admin) has never been repeated, on this branch or any other, to confirm the fix actually produces the expected different outcome live.
- **A pre-existing, unrelated build warning was noted but not fixed.** `pnpm run build`'s output includes a Next.js 16 notice that `middleware.ts` is a deprecated convention in favor of `proxy.ts`. Sprint 1's own verification evidence log calls this out explicitly as "not introduced by this sprint... tracked as a follow-up" -- and it remains unfixed as of Sprint 4.
- **A pre-existing RLS warning was noted but not fixed.** `pnpm run supabase:verify`'s single warning (a permissive `using (true)` predicate in the original 2026-07-02 initial schema migration) was flagged as out-of-scope in Sprint 1 and has been re-confirmed, unresolved, in every subsequent sprint's verification output through Sprint 4.

## 2. Sprint 2 Gaps (Live Tenant Persistence And Golden Path Writes)

This is the sprint with the most consequential unclosed gap in the entire four-sprint program, and it is easy to miss because it reads as a scoping decision rather than an outright miss.

- **Audit/timeline evidence is wired for exactly one resource type: `projects`.** Re-verified directly against the current source this session: `src/app/api/repositories/[resource]/route.ts` line 211 shows `notifyAfterMutation` fires for `"projects" || "tasks" || "meetings"`, but line 214's `if (resourceName === "projects")` gate around `recordProjectCreateEvidence` (lines 139-166) means **only a project create writes an `audit_logs` row and a `workflow_timeline_events` row.** Of the 16 resource types in `allowedResources` (`organizations`, `users`, `programs`, `projects`, `tasks`, `documents`, `document_versions`, `document_categories`, `document_tags`, `document_permissions`, `document_activity`, `knowledge_articles`, `meetings`, `notifications`, `audit_logs`, `invitations`), creating a task or meeting triggers a notification but no audit/timeline evidence; creating a document, knowledge article, invitation, or any of the other 12 types triggers neither. The Sprint 2 checklist itself discloses this as a deliberate scope decision ("audit+timeline evidence intentionally scoped to `projects` only, per this sprint's explicit user journey"), but the roadmap's own Phase 2 checklist (`docs/BETA_QA_ANALYSIS_AND_REMEDIATION_ROADMAP_2026_07_22.md`) lists "Upload or import one document," "Create one task, approval request or project update," and "Verify activity timeline update" / "Verify audit event creation" as golden-path steps without qualifying them to projects-only -- so a literal reading of the roadmap's own golden path is not yet fully satisfied by what Sprint 2 built.
- **No live Supabase project was ever used.** Every piece of Sprint 2 evidence -- persistence, refresh-survival, audit/timeline writes, tenant-scoped filtering -- is proven via mocked-`fetch` Vitest tests and a source-code audit of the RLS policies. Nobody created a real project against a real Supabase-backed deployment and confirmed the `audit_logs`/`workflow_timeline_events` rows actually landed as expected.
- **Two-tenant isolation is proven only at the query/mutation-logic level, never live.** Sprint 2 added tests proving a spoofed `organizationId` in a request body is ignored for non-Super-Admin roles and confirmed the relevant RLS policies exist -- but no test in this repository, at any point across Sprints 1-4, provisions two actual tenants and confirms tenant A genuinely cannot read tenant B's data end-to-end. (Confirmed via search this session: the only tests matching "tenant isolation," "two-tenant," or "cross-tenant" anywhere in `src/` are `supabaseEnterpriseRepositories.test.ts`, `tenantGuard.test.ts`, `governedRag.test.ts`, `tokenVault.test.ts`, and `ragRepository.test.ts` -- all unit-level, none of them Playwright/E2E, none of them provisioning two real tenants.)

## 3. Sprint 3 Gaps (Workspace Loading And Error-State Hardening)

- **Social Alerts was never formally audited in Sprint 3.** The raw QA report's original list of 9 hanging workspaces included Social Alerts, but the Sprint 3 prompt's own "Affected Workspaces" list substituted "AI Review Inbox" in its place. Sprint 3's closeout (Section 5) states this explicitly: *"Social Alerts was not audited... Its loading behavior, and whether it shares the same class of defect found elsewhere, remains unknown."* This gap was not closed until Sprint 4, and even then only informally (see Section 4 below).
- **No live beta replay.** Every one of Sprint 3's "closed" findings (the Approvals routing fix, the two stale-loading-flag fixes, the nine raw-error-leak fixes) is verified by local code audit and Vitest tests, never by loading the actual pages on `beta.triaxisventures.com`.
- **No live provider/connector testing.** Sprint 3 hardened Integrations' error-copy for Gmail/Microsoft/Notion/enterprise-connector failures, but no live OAuth credential was ever exercised in this local environment across any of the four sprints -- provider-gated states are confirmed correct only by reading the code, never by triggering a real provider failure.
- **A structural, unresolved uncertainty the closeout itself flags:** 5 of the 9 audited workspaces (Stakeholders, Analytics, Settings, and the "safe" parts of AI Workspace/Integrations/AI Review Inbox) turned out to already be safe in the current source with nothing to fix. Sprint 3's own closeout (Section 6) is explicit that this cannot distinguish between two possibilities -- (a) the live beta QA tested was running older/different code than this repository, or (b) something about the live runtime environment itself (not the source code) caused the hang. **If (b) is true, none of Sprints 1-4's fixes will resolve the reported symptoms on redeploy**, and this has never been ruled out because no redeploy has happened.

## 4. Sprint 4 Gaps (Demo/Live Data Separation, Navigation Integrity And Tenant Trust)

- **Social Alerts' hang-audit gap from Sprint 3 is still not formally closed.** Sprint 4 incidentally read `AlertsSection.tsx` while fixing its sidebar badge count (F-020) and observed it is a synchronous component with no fetch and no loading gate, matching the safe pattern of Approvals/Stakeholders/Analytics -- but this was a byproduct of unrelated work, not a targeted audit, and there is no dedicated regression test proving it (unlike the other 8 workspaces, each of which has one). It should not be relied on to the same standard as the rest of Sprint 3's work.
- **Fabricated sidebar counts are hidden, not replaced with real data.** F-020's fix makes the "4" (Social Alerts) and "23" (Approvals) badges render only in Demo Mode. This satisfies the QA finding's literal complaint (badges must not contradict tenant state), but no repository was built to compute a real Social Alerts or Approvals count for a live tenant -- so a live tenant today sees no badge at all on those items, not a correct badge. Whether "no badge" or "a real live count" is the intended end state was never decided; Sprint 4 chose the smaller, safer fix.
- **No live beta replay**, same as every prior sprint.
- **F-021 (duplicate Dashboard API requests) is completely untouched** -- correctly out of scope for Sprint 4, but worth restating plainly: as of the end of Sprint 4, this is the only one of the original 20 actionables with zero work done against it.
- **The dead-code file (`legacyInstitutionalViewRepository.ts`) confirmed to have zero consumers was deliberately left in place.** This is a defensible scope decision (documented explicitly in Sprint 4's own closeout), but it is still, factually, a piece of confirmed-dead code sitting in the repository un-deleted after being specifically identified.

## 5. Cross-Cutting Gaps (Apply Across All Four Sprints, Not Any One Of Them)

These are not any single sprint's failure -- they are structural gaps that persist because no sprint's scope has included them yet.

- **No sprint has ever run against a live Supabase project.** `pnpm run supabase:verify` (used in every sprint) checks migration files and RLS policy declarations statically -- it does not connect to a running Supabase instance and exercise a query. Every "tenant isolation confirmed" or "audit event confirmed" claim across all four sprints is either a static policy read or a mocked-fetch unit test, never a live database round-trip.
- **No sprint has ever run against a live Vercel deployment.** The local automation (`scripts/post-sprint-verify-and-preview-deploy.ps1`, the Windows Scheduled Task) only performs Vercel **preview** deploys as a smoke-test gate; it does not touch the production `beta.triaxisventures.com` deployment, and nobody has manually redeployed production or reconfirmed its environment variables since before Sprint 1.
- **No Playwright/E2E spec exists for any Sprint 1-4 fix.** `tests/e2e/` contains specs named after earlier product sprints (`sprint27-golden-path.spec.ts`, `sprint29-pilot-acceptance.spec.ts`, etc.) but nothing named for this QA remediation program. Every regression test added across Sprints 1-4 is either a Vitest unit/component test (with React Testing Library where applicable) or a "source-content" test that greps the raw `.tsx`/`.ts` file for expected/forbidden strings. This is a materially different, and lower, standard of proof than an actual browser-driven end-to-end test -- source-content tests, in particular, can be satisfied by any code that happens to contain the right substring, not necessarily code that behaves correctly at runtime.
- **Two pre-existing tech-debt items have been re-confirmed, unfixed, in every sprint's verification output since Sprint 1:** the Next.js 16 `middleware.ts`-to-`proxy.ts` deprecation warning on every `pnpm run build`, and the one permissive `using (true)` RLS predicate on every `pnpm run supabase:verify`. Neither blocks any exit criterion, but neither has been assigned to any sprint either.
- **All four closeouts' score-delta tables (Beta/Enterprise/Investor/Pilot readiness) remain estimates.** Every single number in every closeout document, including the composite Sprint 1+2+3+4 figures, is a reasoned projection with no formula behind it -- not a measurement. The only way to convert any of them into a measured number is the live QA golden-path replay that has not yet happened.

## 6. Consolidated Roadmap-Phase Status (Cross-Referenced Against Actual Evidence)

| Roadmap phase | Nominal status | What's actually still missing |
|---|---|---|
| Phase 1 - Beta Access Integrity | "Complete" (Sprint 1) | Live env var confirmation against the actual Vercel project; live cold-browser replay |
| Phase 2 - Live Tenant Golden Path | "Complete" (Sprint 2, persistence/audit/timeline subset) | Audit/timeline evidence for 15 of 16 resource types (see Section 2); live Supabase write-and-verify; the full continuous golden-path walkthrough (sign-in -> org -> document upload -> AI question -> citation -> review -> approval -> task/approval/project update -> dashboard/timeline/audit verification) has never been run as one chain, live or locally -- each link has only been tested in isolation |
| Phase 3 - Workspace Loading-State Hardening | "Complete" (Sprint 3) | Social Alerts formal audit (only informally touched in Sprint 4); live beta replay; live provider/connector testing |
| Phase 4 - Tenant Isolation And Governance Verification | Not started as a live phase | Every single item on this phase's checklist (two real tenants, users with different roles, tenant-specific document upload, cross-tenant retrieval verification, role-restricted document verification, AI-answer citation-scope verification, rejected-AI-output verification, approved-AI-output audit verification, tenant-scoped audit log verification) requires two actually-provisioned live tenants and has not been attempted with real tenants at any point across Sprints 1-4 -- only unit-level RLS/spoofed-input tests exist. **This is the single largest unclosed item in the whole program.** |
| Phase 5 - Investor And Enterprise Evidence Pack | Ongoing, partial | README/CHANGELOG/SPRINT_LOG have been updated every sprint (this part is genuinely current); beta screenshots after a live redeploy have never been captured; environment-variable requirements are documented but not confirmed against the live project |

## 7. Consolidated Actionables Status (All 20, True Completeness)

| # | Actionable | Locally closed? | Live-verified? |
|---|---|---|---|
| 1 | Enforce real Supabase auth in beta/production | Yes (Sprint 1) | No |
| 2 | Sign out actually clears state | Yes (Sprint 1) | No |
| 3 | Restore reachability of the real login form | Yes (Sprint 1) | No |
| 4 | Block live workspace access without a real session | Yes (Sprint 1) | No |
| 5 | Verify project creation end to end | Yes (Sprint 2, evidence gap only) | No |
| 6 | Audit all tenant-scoped API routes for session agreement | Yes (Sprint 2) | No (unit/RLS-static only) |
| 7 | Add timeout/error fallbacks to all loading workspaces | Yes (Sprint 3, 8 of 9 formally) | No |
| 8 | Fix AI Workspace loading failure | Yes (Sprint 3) | No |
| 9 | Fix Approvals loading failure | Yes (Sprint 3) | No |
| 10 | Fix Stakeholders/CRM loading failure | Yes (Sprint 3, audit-only) | No |
| 11 | Fix Analytics loading failure | Yes (Sprint 3, audit-only) | No |
| 12 | Fix Integrations loading failure | Yes (Sprint 3) | No |
| 13 | Fix Settings/Org Admin/Audit Logs loading failures | Yes (Sprint 3) | No |
| 14 | Gate dashboard timeline fallback to Demo Mode | Yes (pre-Sprint-1, regression-verified Sprint 4) | No |
| 15 | Remove raw Unauthorized text | Yes (Sprint 3) | No |
| 16 | Gate workflow records fallback to Demo Mode | Yes (pre-Sprint-1, regression-verified Sprint 4) | No |
| 17 | Fix onboarding progress inconsistency | Yes (Sprint 4) | No |
| 18 | Fix `/documents` route mapping | Yes (Sprint 3, regression-verified Sprint 4) | No |
| 19 | Reconcile sidebar badge counts | Yes (Sprint 4, by hiding rather than replacing -- see Section 4) | No |
| 20 | Deduplicate repeated Dashboard API requests | **No -- untouched** | No |

**19 of 20 are locally closed; 0 of 20 have ever been confirmed against the live beta deployment.** This second column is the plainest possible statement of the program's largest gap: every closure claim made across four sprints and four closeout documents is conditional on the eventual live redeploy actually reproducing the same behavior as the local codebase, which Section 3 of every closeout has flagged as an open assumption, not a certainty.

## 8. Priority Ranking For What To Close Next

Ordered by leverage -- highest-impact gap first, reasoning included:

1. **Live Vercel redeploy + live QA golden-path replay.** This is not one gap among many -- it is the gap that determines whether every other gap in this document is real or already accidentally resolved. Nothing else can move from "estimated" to "measured" without it.
2. **Live two-tenant isolation test (Phase 4).** This is a security-relevant claim ("tenant A cannot read tenant B's data") currently resting entirely on unit tests and a static RLS-policy read. It is the largest gap that is *not* contingent on redeploy access -- it can be built and run against any Supabase branch/project, live or otherwise, independent of whether beta itself is redeployed.
3. **Extend audit/timeline evidence beyond `projects`.** Currently the single narrowest-scoped fix in the whole program relative to how broadly the roadmap's own golden path describes it. Tasks, documents, and meetings are all named in the roadmap's Phase 2 checklist as things that should produce timeline/audit evidence; only projects do.
4. **F-021, Dashboard request deduplication.** The only wholly untouched actionable; Sprint 5's own scope already targets it.
5. **A formal Social Alerts audit with its own regression test**, closing the one remaining item from Sprint 3's original 9-workspace scope that has never received a dedicated audit.
6. **Decide and implement a real live-tenant count source for the two hidden sidebar badges**, if a "shows a real number" outcome is preferred over "shows nothing" for a live tenant.
7. **The two long-standing tech-debt warnings** (Next.js 16 middleware deprecation, the permissive RLS predicate) -- lowest urgency since neither blocks an exit criterion, but both have now been re-confirmed, unfixed, across four consecutive sprints' verification evidence.

## 9. Closing Statement

Sprints 1 through 4 closed 19 of the original 20 QA actionables at the local-repository level, with full typecheck/lint/test/build/Supabase-schema/mobile-release-gate verification passing at every step (110 test files / 331 tests as of Sprint 4, up from a starting point of 96/286 at Sprint 1). Within that real progress, this document identifies six categories of gap that persist: an audit/timeline evidence scope narrower than the roadmap's own stated golden path (Sprint 2), one workspace's loading behavior never formally audited (Social Alerts, spanning Sprints 3-4), fabricated data hidden rather than replaced with real counts (Sprint 4), zero live-environment verification of any kind across all four sprints, zero Playwright/E2E coverage for any of the four sprints' fixes, and two long-standing tech-debt warnings nobody has been asked to fix. None of these are contradictions of what the four closeout documents already claimed -- every one of them was disclosed somewhere in this repository's documentation trail before this document existed. What this document adds is putting all of it in one place, ranked by leverage, so Sprint 5 (or whichever sprint follows) can pick up the highest-value item first rather than rediscovering these gaps by re-reading four separate closeout documents.
