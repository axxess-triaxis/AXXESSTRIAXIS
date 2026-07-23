# Readiness, Days-to-Launch And Stability Analysis - 2026-07-23 (Post-Sprint 42)

## Purpose

An objective, dated scoring exercise across 10 states standing between AXXESS TRIaxis and Enterprise Beta 1.0, mobile store release, and a first commercial pilot -- requested to inform the next 30-day roadmap decision. Every input is either a git-log fact, a direct file/CLI check performed on 2026-07-23, or a citation to an existing sprint document. The scoring *weights* are a disclosed judgment call, not a measurement -- change them and the numbers move predictably. This is a consistent, reproducible instrument applied to real evidence, not a certified or externally audited score.

A companion interactive version (scoring matrix + 30-day roadmap Kanban) was published as an artifact in this session.

Base commit for this analysis: `5f35e88` on `canonical/sprint-1-35-unified-gitlab`. Repo state at time of writing: 120 test files / 383 tests passing, typecheck/lint/build/supabase:verify all clean (per Sprint 42 verification).

## 1. Measured Development Pace

Primary unit: **sprints closed per calendar day**, since this program tracks and closes work in formally bounded, tested, documented sprint units already -- not raw lines-of-code, which is a weak proxy for value delivered and would conflate doc-heavy days with feature-heavy days.

**Window chosen:** Sprints 37-42 (the QA-remediation/hardening era), not the full Sprint 1-42 history. Rationale: Sprint 1-32 (Codex, 2026-07-02 to 2026-07-18) was green-field feature-building at a different tool/pace profile; Sprints 37-42 (Claude Code, this program) is fix-test-verify-document work -- the same *kind* of work as everything remaining in this analysis.

Per `git log`, commit timestamps for Sprints 37-42:

| Sprint | Code commit | Closeout doc |
|---|---|---|
| 37 (Auth Integrity) | 2026-07-22 14:36 | 14:42 |
| 38 (Live Persistence) | 2026-07-22 16:00 | 16:10 |
| 39 (Workspace Hardening) | 2026-07-22 16:42 | 17:08 |
| 40 (Demo/Live Separation) | 2026-07-22 18:24 | 18:35 |
| 41 (QA 2 / Milestone) | 2026-07-22 20:13 | 20:13 |
| 42 (Onboarding Auth Gate) | 2026-07-23 15:54 | (same commit) |

6 formally closed sprints across the calendar span 2026-07-22 to 2026-07-23 (2 calendar days).

- **Current Pace = 6 sprints / 2 calendar days = 3.0 sprints/day.**
- **2nd Pace (+20% coding output, per instruction) = 3.0 x 1.2 = 3.6 sprints/day.**
- Observed range for context: 5 sprints closed on 2026-07-22 alone (the high end); 1 sprint on the partial day 2026-07-23 (the low end, still in progress at time of writing) -- 3.0/day sits centrally within this observed range, not cherry-picked.
- Secondary cross-check (not the primary unit): code churn across the same 2-day window totals 13,332 lines changed (insertions+deletions), or ~6,666 lines/day -- offered only as a sanity check, since it mixes doc-heavy and code-heavy days unevenly.

## 2. Scoring Methodology

### Readiness %

Blends two dimensions this program's own sprint closeouts have always kept separate: how much of a state's required functionality *exists in code* (`CodeCompleteness%`) versus how much has actually been *exercised and confirmed live* (`LiveProofCompleteness%`).

```
Readiness% = w_code x CodeCompleteness% + w_live x LiveProofCompleteness%
w_code/w_live = 0.6/0.4 default, or 0.5/0.5 for the two tenancy-related states
```

The tenancy states get equal weighting because an unproven isolation claim is the single most consequential kind of wrong claim this product could make -- code-level RLS design isn't a substitute for a live-proven result there, more than it is for other states.

### Stability Index

One disclosed formula, applied identically to every state with state-specific inputs -- not ad hoc per-state scores:

```
StabilityIndex = 100
  - 25 x (open blocking/P0 issues on this state's critical path)
  - 8  x (open P1 issues)
  - 3  x (open P2/minor issues)
  - 10 x (1 if this state has deploy/operational-volatility precedent, else 0)
  - 15 x (1 - live-verified fraction of the critical path)
  floored at 0
```

Bands: 80-100 Stable, 60-79 Moderate, 40-59 Fragile, 0-39 Critical. A Critical band means "genuinely unproven or actively broken today," not "badly engineered" -- several Critical-band states below sit on a well-tested codebase whose one live path is currently blocked.

### Days to completion

Backlog is estimated in **sprint-equivalents** (comparable in scope to Sprints 37-42) from the specific, cited open items per state, with a 20% contingency buffer applied -- this program's own history shows real volatility (a 3-attempt production deploy, an 11-hour overnight test-timeout stall). Where a critical-path item leaves engineering's control entirely -- an app-store review, a penetration-test vendor's calendar, a sales cycle -- it is reported as a separate, *additive* external wait, never divided by pace. Two states (Commercial Pilot, First-30-Users) have no historical throughput data to project from at all and are marked accordingly rather than assigned a false-precision number.

## 3. Scoring Matrix

| State | Readiness | Backlog | Days @ Current (3.0/d) | Days @ 2nd Pace (3.6/d) | External wait | Realistic total | Stability | 30-day outlook |
|---|---|---|---|---|---|---|---|---|
| Enterprise Beta 1.0 | 53% | 6.0 sp-eq | 2.0 d | 1.7 d | None required | 2-3 days | 38/100 Critical | Achievable |
| Single Tenancy (Tenant 0 fully live) | 54% | 5.0 sp-eq | 1.7 d | 1.4 d | None required | ~2 days | 38/100 Critical | Achievable |
| Multi-Tenancy (2+ proven isolated) | 43% | 7.0 sp-eq | 2.3 d | 1.9 d | None required* | 2-3 days | 52/100 Fragile | Achievable |
| Live Workflow (full golden path proven) | 52% | 4.5 sp-eq | 1.5 d | 1.25 d | None required | ~2 days | 41/100 Critical | Achievable |
| Android Beta 1.0 (Play release) | 42% | 1.5 sp-eq | 0.5 d | 0.4 d | 1-7 days | 2-9 days | 42/100 Fragile | Achievable |
| iOS Beta 1.0 (App Store release) | 33% | 1.75 sp-eq | 0.6 d | 0.5 d | 1 day - 4+ weeks | 3 days - 5 weeks | 17/100 Critical | At risk |
| Commercial Pilot (signed, paying) | 39% | 2-4 sp-eq** | <1.5 d** | <1.3 d** | weeks-months | Not pace-computable | 52/100 Fragile | Not expected |
| Security & Compliance Hardening | 36% | 1.5 sp-eq | 0.5 d | 0.4 d | 1-3 weeks | 1-3+ weeks | 69/100 Moderate | At risk |
| Analytics Instrumentation (web-only) | 18% | 1.0 sp-eq | 0.3 d | 0.3 d | Full 3-surface blocked on iOS/Android ship | ~1 day (web) | 77/100 Moderate | Achievable (web) |
| First-30-Users Analytics Review | 6% | n/a | -- | -- | weeks-months | Not pace-computable | 31/100 Critical | Not expected |

\* Assumes a Docker daemon or a linked Supabase project is available when the isolation harness is run -- currently neither exists in this checkout; provisioning either is same-day work but is the one soft external dependency in an otherwise code-bound state.

\*\* Code/product readiness only, assuming manual billing for a first pilot -- automated Stripe/Paddle checkout is unbuilt and only worth building once a pilot is actually being negotiated.

## 4. Gap Analysis, By Origin

### Blocking the core golden path
*Sources: `docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md`, `docs/SPRINT_42_ONBOARDING_AUTH_GATE_AND_OAUTH_ENABLEMENT_2026_07_23.md`*

- **Provision Tenant -> "Unauthorized"** reproduced twice live; Sprint 42 fix committed (`f58ec92`) but not yet deployed or live-verified.
- Whether an **authenticated** user still hits the same error is untested -- a possible second, distinct bug in `provisionTenantForUser` or session-cookie handling.
- **Security-notice acceptance** not enforced per-step (`continueFlow()` only checks `isOnboardingComplete` at the final step); the final block message doesn't name which requirement failed.
- **"Create account"** works server-side (confirmed via a real, working confirmation email) but gives no visible success state -- reads as broken next to the adjacent "Onboarding" button.

### Never live-verified, code exists
*Source: `docs/SPRINT_41_QA2_MILESTONE_2026_07_22.md` §3b/§11*

- **Two-tenant isolation harness** written, unit-tested, **never executed** against a real database -- no Docker daemon, no linked Supabase project in this checkout.
- **F-021 dedup fix** confirmed pre-fix live, never re-confirmed live post-fix on an authenticated dashboard.
- **Zero Playwright/E2E coverage** for any fix across Sprints 37-41 -- explicitly requested in Sprint 41's own prompt, not delivered.
- **No live provider/connector testing** ever performed with real Gmail/Microsoft credentials.
- The **Enterprise Beta 1.0 gate itself** (Triaxis Ventures onboarding as first real tenant + Claude Code audit) "has not been attempted at any point in this QA program" (Sprint 41 §3c, verbatim).

### Mobile -- real vs. simulated readiness
*Source: direct repo + `gh` CLI check, 2026-07-23*

- `mobile:store:release-gate` and `mobile:capacitor:store:doctor` (`--mode=ci`) check local doc/config text presence only -- **zero network calls** to Apple or Google, zero validation that any credential is actually accepted by either platform.
- Android signing secrets are complete (4/4 present in GitHub); **one real signed AAB has been produced** (2026-07-13, workflow run `29229956375`).
- iOS: `ASC_ISSUER_ID` and `ASC_PRIVATE_KEY` are missing from GitHub secrets (Team ID and Key ID alone are present) -- **no real iOS build has ever succeeded** in CI; every real attempt has failed, and the one "successful" run skipped the iOS job in 3 seconds under a since-removed parking guard.
- Neither `ios/App.xcodeproj` nor `android/gradlew` is checked into the repo -- both are regenerated per CI run via `cap add`.
- No App Store Connect app record, no Google Play Console listing, no TestFlight group, no Play testing track, and no review submission of any kind exists anywhere in the repo's evidence trail.
- `docs/NEXT_5_MILESTONES_BETA_AND_MOBILE_RELEASE.md`'s own current-status block, unchanged since creation: *"iOS App Store release not yet complete. Android Google Play release not yet complete."*

### Commercial & multi-tenancy -- undocumented as milestones
*Source: direct repo grep, 2026-07-23*

- **Zero payment-provider SDK** installed anywhere in `package.json`. Stripe/Paddle exist only as an encrypted-credential-storage stub in `enterpriseConnectorVault.ts`, explicitly documented as *"Configuration only -- no live checkout flow is wired yet."*
- **No document anywhere in the repo** defines a "single-tenancy" vs. "multi-tenancy" milestone or gate -- the only formally defined first-tenant gate (Enterprise Beta 1.0) never mentions a second organization.
- **No second real tenant has ever been onboarded or isolation-tested against live data**, confirmed explicitly and repeatedly across multiple sprint docs (`docs/AUTOMATION_OVERVIEW.md`: *"A human or agent manually provisioning two tenants and testing"* listed as "No" under what's automated or done).
- **No SLA, signed contract, or MOU** exists with any organization. `MONOREPO_ARCHITECTURE_AND_BUSINESS_MODEL.md` §7, verbatim: *"No customer has paid AXXESS money... No pilot is currently signed and running; pilot-horizon and Pilot-Customer selections are expressed intent, not executed contracts."* The five-tier pricing table exists only as an architectural/positioning document, with no enforcement mechanism.

## 5. 30-Day Roadmap Kanban

Every open item placed by how long that specific item takes -- not by which state it belongs to.

### Today (<1 day) -- 6 items, all Claude-Code-executable
Deploy Sprint 42 to production - Fix "Create account" UX clarity - Fix notices-validation gap - Re-verify Android signed-build pipeline - Wire Play service account (once supplied) - Wire ASC credentials (once supplied)

### This Week (Day 1-7) -- 9 items, mostly pace-driven live verification
Live walkthrough of sign-up/sign-in/provision post-deploy - Confirm F-021 dedup fix live - Run the two-tenant isolation harness against a real DB - Onboard a real second tenant + confirm no cross-tenant UI leakage - Full golden-path replay (knowledge, RAG, approval, task creation, dashboard/audit/timeline) - Claude Code 15-area audit artifact - Triage/patch 22 Dependabot alerts - Validate web-surface analytics events - Register real Google/Microsoft OAuth apps

### Week 2-4 (Day 8-30) -- 5 items, external-turnaround-gated but land within 30 days
Google Play listing/screenshots/data-safety -> submit for review (3-9 days) - Apple Developer Program enrollment if not already active (1 day-4+ weeks) - First-ever real iOS CI build once unblocked, then App Review (2-5 days) - Commission and run an external penetration test (1-3 weeks) - Invite a second real user into Tenant 0, assign roles live (1-3 days)

### Beyond 30 Days -- 4 items, GTM/business-cycle-gated, not code-projectable
Sign the first commercial pilot contract/MOU - Build automated billing, only once a pilot needs it (1-1.5 days of engineering, whenever triggered) - First-30-real-users cohort review across web/iOS/Android - Full 3-surface analytics completion (blocked transitively on iOS/Android ship)

## 6. Verdict For The 30-Day Roadmap

**Achievable within 30 days at either pace, engineering-side:** Enterprise Beta 1.0, Single Tenancy, Multi-Tenancy, Live Workflow, Android Beta 1.0, and web-only Analytics Instrumentation. Their combined code-bound backlog is small (1.0-7.0 sprint-equivalents each) and even the worst-case external wait among them (Android Play review, ~9 days) fits comfortably inside a 30-day window.

**At risk of missing 30 days:** iOS Beta 1.0, entirely dependent on how quickly Apple Developer Program enrollment (if not already active) and App Review resolve -- the single largest variance in this entire analysis, capable of ranging from 3 days to 5+ weeks. Security & Compliance Hardening is similarly at risk if a penetration-test vendor's calendar runs long.

**Not realistically expected within 30 days, and not projectable from coding pace at all:** Commercial Pilot and the First-30-Users analytics milestone. Both are gated by sales-cycle and user-acquisition timelines with zero historical throughput data in this codebase to project from -- the 2x coding-speed multiplier this analysis was asked to model has no purchase on either.
