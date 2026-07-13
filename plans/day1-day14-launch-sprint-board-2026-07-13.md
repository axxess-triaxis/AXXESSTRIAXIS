# Day 1-14 Launch Sprint Board

Date: 2026-07-13
Sprint Type: Full GO Closure Sprint
Primary Goal: Move from guarded beta GO to full GO eligibility with evidence-backed closure.

## Day 1-7 Execution Status (as of 2026-07-13)

| Day | Status | Outcome | Evidence |
|---|---|---|---|
| Day 1 | DONE | Scope and governance baseline established, release separation confirmed | plans/day1-day2-user-readiness-execution-2026-07-13.md |
| Day 2 | DONE (Conditional) | Core auth/onboarding validated, advanced auth properly gated | plans/day1-day2-user-readiness-execution-2026-07-13.md |
| Day 3 | DONE | Core journey QA coverage verified from E2E inventory and route checks | plans/day3-day5-user-readiness-execution-2026-07-13.md |
| Day 4 | DONE (Conditional) | Observability foundation verified; alerting/latency operationalization still open | plans/day3-day5-user-readiness-execution-2026-07-13.md |
| Day 5 | DONE (Conditional) | Compliance/trust foundation verified; privacy ops/legal closure still open | plans/day3-day5-user-readiness-execution-2026-07-13.md |
| Day 6 | DONE (Conditional) | Beta cohort process/feedback controls validated; live cohort evidence pending | plans/day6-day8-user-readiness-execution-2026-07-13.md |
| Day 7 | DONE (Conditional) | Mobile distribution pipelines verified; store-console credential completion pending | plans/day6-day8-user-readiness-execution-2026-07-13.md |

Day 1-7 run result:
- Guarded beta continuation is valid.
- Broad launch remains blocked by open reliability, distribution, cohort, and trust/compliance closures.

## Owner Legend

- Product (PD)
- Engineering (ENG)
- QA (QA)
- DevOps/SRE (SRE)
- Compliance/Privacy (COMP)
- Mobile/Release Ops (MOB)

## Day-by-Day Plan

### Day 1 - Scope Lock and Launch Governance

Objective:
- Freeze launch scope and exclusions.

Tasks:
- Approve controlled beta scope and exclude broad public launch claims.
- Confirm website/beta architecture separation remains policy-locked.
- Confirm incident commander and rollback authority.

Owners:
- PD, SRE, ENG

Acceptance Criteria:
- Signed scope note published.
- Excluded features list published.
- Incident and rollback owners assigned.

### Day 2 - Auth and Onboarding Baseline

Objective:
- Ensure core user entry flows are stable.

Tasks:
- Validate sign-up, login, logout, session, forgot-password, account deletion initiation.
- Confirm gated auth paths (MFA/passkeys/reset-finalization) are clearly labeled as unavailable.

Owners:
- ENG, QA

Acceptance Criteria:
- Core auth checklist marked green.
- No misleading UI claims for gated auth paths.

### Day 3 - Core Journey QA

Objective:
- Verify top user journeys end-to-end.

Tasks:
- Run and review auth/projects/tasks/notifications/meetings/knowledge/admin/audit E2E coverage.
- Record defects and assign severity.

Owners:
- QA, ENG

Acceptance Criteria:
- Top journey matrix complete.
- Sev1 defects = 0 open.

### Day 4 - Observability Wiring

Objective:
- Convert observability foundation into operational controls.

Tasks:
- Enable and validate auth-failure alerts.
- Enable and validate RLS anomaly alerts.
- Enable crash and latency threshold alerts.

Owners:
- SRE, ENG

Acceptance Criteria:
- Alert test evidence captured.
- On-call acknowledgement proof available.

### Day 5 - Compliance and Trust Operations

Objective:
- Close trust and compliance operational gaps.

Tasks:
- Stand up privacy request operations queue (owner, SLA, escalation).
- Finalize legal-reviewed trust/compliance customer wording.

Owners:
- COMP, PD

Acceptance Criteria:
- Signed privacy operations checklist.
- Approved customer-facing trust language.

### Day 6 - Controlled Cohort Wave 1

Objective:
- Validate real-user activation and friction.

Tasks:
- Run first 5-user cohort.
- Capture first-session friction and activation drop-offs.

Owners:
- PD, QA

Acceptance Criteria:
- Cohort report published.
- Top friction list prioritized.

### Day 7 - UX Fix Closure (Top 3)

Objective:
- Remove highest-friction adoption blockers.

Tasks:
- Fix top 3 friction issues from Day 6.
- Re-test impacted flows.

Owners:
- ENG, QA

Acceptance Criteria:
- Top 3 friction issues resolved or accepted with rationale.

### Day 8 - Mobile Distribution Readiness

Objective:
- Prove internal distribution pathways.

Tasks:
- Complete TestFlight internal distribution trial.
- Complete Play Internal Testing distribution trial.
- Validate install/upgrade/session continuity checks.

Owners:
- MOB, QA

Acceptance Criteria:
- Distribution evidence for iOS and Android captured.
- No release-blocking mobile regressions.

### Day 9 - Load/Soak and Reliability Drill

Objective:
- Confirm resilience under realistic load.

Tasks:
- Execute scripted load/soak for auth, dashboard, search/AI.
- Validate API p95 and error budgets.

Owners:
- ENG, SRE, QA

Acceptance Criteria:
- Load/soak report published.
- Pass/fail against thresholds documented.

### Day 10 - Rollback Rehearsal

Objective:
- Prove recoverability.

Tasks:
- Run one web rollback rehearsal.
- Run one mobile artifact rollback rehearsal.
- Record recovery timings and communication sequence.

Owners:
- SRE, MOB

Acceptance Criteria:
- Rollback evidence attached.
- Recovery runbook timing updated.

### Day 11 - Controlled Cohort Wave 2

Objective:
- Expand confidence across a larger sample.

Tasks:
- Invite second cohort wave (5-10 users).
- Monitor incident trends and user success metrics.

Owners:
- PD, QA, SRE

Acceptance Criteria:
- Wave 2 report complete.
- No unresolved Sev1 incident.

### Day 12 - P0 Closure Audit

Objective:
- Verify all P0 blockers are fully closed.

Tasks:
- Check closure evidence for:
  - Cohort and UX
  - Alerting and latency ops
  - Mobile distribution proof
  - Load/soak report
  - Privacy/legal trust completion

Owners:
- PD, ENG, QA, SRE, COMP, MOB

Acceptance Criteria:
- P0 board marked closed with evidence links.

### Day 13 - Final Go/No-Go Meeting

Objective:
- Make final launch decision.

Tasks:
- Complete owner sign-off template.
- Confirm launch scope and excluded features.
- Confirm incident commander and rollback authority for launch window.

Owners:
- PD, ENG, QA, SRE, COMP

Acceptance Criteria:
- Signed go/no-go record published.

### Day 14 - Full GO Flip or Hold

Objective:
- Execute decision with controlled risk.

Tasks:
- If full GO approved: activate broader release plan.
- If not approved: continue guarded beta mode with a new blocker sprint.

Owners:
- All tracks

Acceptance Criteria:
- Final status published: Full GO or Hold.
- Next 14-day plan generated from decision outcome.

## P0 Blocker Board (Sprint-Critical)

| Blocker | Owner | Evidence Required | Status |
|---|---|---|---|
| Live cohort + top 3 UX closure | PD + QA + ENG | Cohort reports + closure proof | Open |
| Alert routing + latency operations | SRE + ENG | Alert tests + on-call proof + p95 dashboard | Open |
| Mobile internal distribution proof | MOB + QA | TestFlight + Play internal evidence | Open |
| Scripted load/soak evidence | ENG + QA + SRE | Run report + threshold outcome | Open |
| Privacy ops + legal trust closure | COMP + PD | Signed checklist + legal-approved wording | Open |

## P1 Blocker Board (Can Trail Full GO if Non-Critical)

| Blocker | Owner | Evidence Required | Status |
|---|---|---|---|
| MFA/passkey enablement | ENG + Security | Staging and beta non-501 validation | Open |
| Reset-password finalization | ENG | Verified recovery-session completion path | Open |
| Governance UI expansion | AI Platform + PD | Reviewer queue and approval UI | Open |

## Definition of Done for Full GO

- P0 blockers closed with evidence.
- No open Sev1 incidents.
- Core auth and onboarding pathways stable.
- Mobile internal distribution proven.
- Reliability alerts and rollback rehearsals proven.
- Compliance/Privacy sign-off complete.
- Final owner sign-off complete.
