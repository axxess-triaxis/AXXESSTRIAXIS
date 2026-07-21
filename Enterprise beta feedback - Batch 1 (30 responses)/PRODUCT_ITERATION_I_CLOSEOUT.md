# Product Iteration I — Close-Out Report

**Covers:** the full run from `SWOT_Analysis_Batch_1.md` through Sprint 1 and Sprint 2 of
`SPRINT_ROADMAP_PRE_DEMO.md`, including the git-reconciliation incident that delayed Sprint 2's
arrival on `main`.
**Purpose:** a single, standalone record of everything shipped, verified, and still open in this
iteration, so Sprint 3 planning starts from ground truth rather than from what individual commit
messages or chat history claimed at the time.
**Status as of this document:** Sprint 1 (7/7) and Sprint 2 (7/7) merged to `main`. Sprint 3 (0/6)
not started.

---

## 1. Where this came from

`Enterprise_Beta_Feedback_Batch_1.md` (30 beta responses) was synthesized into
`SWOT_Analysis_Batch_1.md`, which was in turn used to derive **20 immediately-executable
actionables** (`PRE_DEMO_ACTIONABLES.md`) targeting customer ease, experience, retention, feedback,
and execution ahead of the next demo. Those 20 items were sequenced into a dependency-aware
3-sprint plan (`SPRINT_ROADMAP_PRE_DEMO.md`) and tracked via a tickable checklist
(`SPRINT_CHECKLIST_PRE_DEMO.md`). Every item traces to a specific report finding or SWOT
weakness/opportunity — none are speculative additions; see `PRE_DEMO_ACTIONABLES.md`'s closing
section for the full evidence map.

This document does not repeat that evidence in detail — it records what actually happened when the
plan was executed.

## 2. Sprint 1 — Stop the bleeding: onboarding friction and trust signals (7/7, merged)

| ID | Item | Shipped | Dedicated test coverage |
|---|---|---|---|
| A1 | Golden Path opt-in, not forced | ✅ | `enterpriseGoldenPath.test.ts`, `useGoldenPathDisplayMode.test.tsx`, `enterpriseComponents.test.tsx` |
| A2 | Blocked/locked steps explain themselves | ✅ | `enterpriseGoldenPath.test.ts` |
| A8 | Empty states with one CTA (Dashboard/Projects/Tasks) | ✅ | None dedicated — see gap note below |
| A5 | Loading/timeout/retry on long AI operations | ✅ | None dedicated — see gap note below |
| A19 | Reliability expectation-setter copy | ✅ | None dedicated — shipped with A5 |
| A20 | Role-appropriate default landing pages | ✅ | `routes.test.ts` |
| A12 | Feedback surfaced at workflow completion | ✅ | None dedicated — see gap note below |

**Honest gap, carried forward, not silently dropped:** A8/A5/A19/A12 touch
`DashboardSection.tsx`, `ProjectsSection.tsx`, `TasksSection.tsx`, `AIWorkspaceSection.tsx` — none
of these page components have unit-test coverage in this repo to begin with (this codebase relies
on Playwright e2e specs for heavy page components, not Vitest/RTL unit tests). Adding first-time
test infrastructure for four large page components was judged out of scope for "immediately
executable pre-demo" work. Verification for these four items is `typecheck` + `lint` (both clean)
+ full-suite regression (no breaks) + manual code review — real verification, but a different kind
than the other three items get. Full detail: `ITERATION_PROGRESS.md`, 2026-07-20 entries.

## 3. Sprint 2 — Value clarity, AI trust, and feedback instrumentation (7/7, merged)

| ID | Item | Shipped | Dedicated test coverage |
|---|---|---|---|
| A4 | AI citations + rationale under every answer | ✅ | `governedRag.test.ts`, `tenantRagWorkflow.test.ts` |
| A6 | Bulk/quick-approve in AI Review Inbox | ✅ | `reviewInbox.test.ts` |
| A9 | In-context 1-click micro-survey | ✅ | `useMicroSurveyPrompt.test.tsx` |
| A11 | Time-to-first-value / funnel analytics events | ✅ | `analytics.test.ts` (existing, re-verified) |
| A3 | Guided workspace with real seeded sample data | ✅ | `enterpriseOnboarding.test.ts` (shared with A7/A18) |
| A7 | 3 outcome-first onboarding paths | ✅ | `enterpriseOnboarding.test.ts` (shared with A3/A18) |
| A18 | Fewer required setup decisions before first AI use | ✅ | `enterpriseOnboarding.test.ts` (shared with A3/A7) |

**Honest gaps, carried forward, not silently dropped:**
- **No end-to-end browser verification of A3+A7+A18.** These three are interdependent by design
  (per the roadmap, they shipped together deliberately) and were verified via `typecheck`, `lint`,
  and unit tests of the pure onboarding-state logic only. The actual sequence — pick a path, finish
  onboarding, seed data, land on the right page with real seeded records visible — has never been
  walked through in a running app. This is the single largest open risk carried out of Sprint 2.
- **A9's second trigger point is unwired.** The micro-survey fires on the first completed AI review
  decision; the actionable also named "first completed golden-path step" as a trigger, and the hook
  supports it (`trigger="golden_path_step"` already exists as a value), but no call site was wired
  for it.
- **A6's "low-risk" definition is coarse** — purely `!humanReviewFlag`, inheriting whatever
  under/over-flagging exists further upstream in review generation.
- **A11's retention step ("second workflow completed within 7 days") is not instrumented** — that's
  a time-windowed aggregation that belongs in the analytics backend, not client-side code.
- Along the way, three additional demo-data leaks were found and fixed opportunistically (not part
  of the original 20 actionables, but directly relevant to the "zero dummy data" requirement raised
  mid-iteration) — see `DEMO_DATA_LEAKAGE_AUDIT.md` for the full three-round audit. Explicitly out
  of scope from that effort: Approvals, Stakeholders/CRM, and Analytics/OKRs have **no live
  repository at all** — hygiene fixes made this honest (gated behind demo mode) but did not and
  could not make those modules real. That remains a separate, multi-sprint initiative.

Full detail for every item: `ITERATION_PROGRESS.md`, 2026-07-20/2026-07-21 entries.

## 4. The git-reconciliation incident

This is the part of Product Iteration I that did not come from the feedback/roadmap process itself
— it's a process finding from actually shipping the work, and it's why Sprint 2's arrival on `main`
was delayed by roughly a day past when it was first reported complete.

**What happened:** PR #137 was merged while its source branch still had planned commits arriving.
The merge captured exactly one commit (`5ebf157`, implementing only A1/A2). Six further commits —
the rest of Sprint 1 (A8/A5/A19/A20/A12), the Golden Path rationale doc, the demo-data-leakage
fixes, and all of Sprint 2 — were pushed to the same branch afterward and had nowhere to land. For
about a day, `main` genuinely contained 2 of the 20 actionables while the status documents (written
and verified correctly on the branch they lived on) described Sprint 1 and Sprint 2 as fully shipped.
The documents were right about what had been *built and tested*; they were not right about what had
reached `main`.

**How it surfaced:** while preparing to plan Sprint 3, a fresh pull of `PRE_DEMO_ACTIONABLES.md`
from `origin/main` showed items 3-20 still unmarked, contradicting prior status reports.
`git merge-base --is-ancestor` and `git show --stat` on the merge commit confirmed the gap precisely
before any further status-document edits or Sprint 3 planning proceeded.

**How it was fixed:** the orphaned branch was rebased onto current `main` (which had, in the
interim, also gained an unrelated dependency-hygiene fix — see below) as
`reconcile/sprint1-tail-and-sprint2`. All 8 commits applied with zero conflicts. The full
verification suite (`typecheck`, `lint --max-warnings=0`, `test -- --run`, `build`) was re-run from
scratch against the rebased result, not assumed to still hold from the original run.

**Unrelated, separately-discovered problem fixed in the same window:** several `dependabot` PRs
(`typescript` → 7.0.2, `eslint` → 10.7.0, `react-resizable-panels` → 4.12.2) had each merged
individually and were never verified together, breaking `typecheck`/`lint`/`build` on `main`
entirely. Fixed in PR #138 by reverting both `typescript` and `eslint` to their last known-good,
mutually-compatible versions, plus `dependabot.yml` ignore rules so the same combination isn't
silently re-proposed. Full detail: `ITERATION_PROGRESS.md`'s 2026-07-21 entries (both the
reconciliation entry and the dependency-fix context inside it).

**What this incident does and doesn't change:**
- It does not change *what was built* — every item's implementation and test coverage is exactly
  what's described in sections 2-3 above.
- It does change *when it became real* — Sprint 1's remaining 5 items and all of Sprint 2 became
  live on `main` on 2026-07-21, not 2026-07-20 as originally reported.
- It is a **process gap, not a code gap**: nothing in this repo currently prevents a PR from being
  merged while commits are still arriving on its source branch. That's a workflow/communication
  matter (relevant here specifically because this repo is worked on by more than one
  person/agent at once), not something this document proposes a specific fix for — flagged so it's
  recognizable if it recurs, not silently absorbed.

## 5. Final verified state (this iteration, `reconcile/sprint1-tail-and-sprint2` → `main`)

- `pnpm run typecheck` — clean
- `pnpm run lint --max-warnings=0` — clean
- `pnpm run test -- --run` — one run hit a transient worker-spawn timeout on
  `src/security/sprint28PilotReleaseRls.test.ts` (`[vitest-pool-runner]: Timeout waiting for worker
  to respond`), which failed the run's exit code even though the 87 files that did start reported
  244/244 passing. Re-ran the isolated file alone (2/2 passing in 5.6s, confirming it's not a code
  regression) and re-ran the full suite again for a clean result — see this branch's PR for the
  exact final count. Noting the flake here rather than silently discarding it: this environment's
  test runs have consistently shown very long `environment` setup phases (250-300s of a ~330-590s
  run), which is the likely source of worker-spawn contention under load, not anything introduced
  by this reconciliation.
- `pnpm run build` — succeeds, all routes compile

## 6. All 20 actionables — final status at Product Iteration I close

| # | ID | Item | Status |
|---|---|---|---|
| 1 | A1 | Golden Path opt-in | ✅ merged |
| 2 | A2 | Blocked/locked steps explain themselves | ✅ merged |
| 3 | A3 | Guided workspace with real seeded data | ✅ merged |
| 4 | A4 | AI citations + rationale | ✅ merged |
| 5 | A5 | Loading/timeout/retry on AI ops | ✅ merged |
| 6 | A6 | Bulk/quick-approve in Review Inbox | ✅ merged |
| 7 | A7 | 3 outcome-first onboarding paths | ✅ merged |
| 8 | A8 | Empty states with one CTA | ✅ merged |
| 9 | A9 | In-context micro-survey | ✅ merged (1 of 2 triggers wired) |
| 10 | A10 | Post-demo satisfaction capture | ⬜ Sprint 3 |
| 11 | A11 | Funnel analytics events | ✅ merged |
| 12 | A12 | Feedback at workflow completion | ✅ merged |
| 13 | A13 | Slack quick-connect | ⬜ Sprint 3 |
| 14 | A14 | Calendly quick-connect | ⬜ Sprint 3 |
| 15 | A15 | Cap integrations surface to 2 | ⬜ Sprint 3 |
| 16 | A16 | "What's New" panel | ⬜ Sprint 3 |
| 17 | A17 | Completion celebration | ⬜ Sprint 3 |
| 18 | A18 | Fewer setup decisions before first AI use | ✅ merged |
| 19 | A19 | Reliability expectation-setter copy | ✅ merged |
| 20 | A20 | Role-appropriate default landing pages | ✅ merged |

**14/20 merged to `main`. 6/20 (all of Sprint 3) not started.**

## 7. Consolidated honest-gap register (carried into Sprint 3 planning)

1. No end-to-end browser verification of A3+A7+A18 (onboarding trio) — highest-priority gap to
   close before or during Sprint 3, since Sprint 3's own A16 ("What's New" panel) and A17
   (completion celebration) build on the same completion-event surface.
2. A9's golden-path-step trigger unwired (second of two named trigger points).
3. A8/A5/A19/A12 lack dedicated unit tests (structural gap in this repo's page-component testing,
   not unique to these items).
4. Approvals, Stakeholders/CRM, and Analytics/OKRs remain fully demo-gated with no live repository —
   out of scope for hygiene work, tracked as a separate initiative.
5. `react-router` 7→8 and several Capacitor major-version bumps merged via dependabot around the
   same time as the typescript/eslint incompatibility (section 4) but pass typecheck/lint cleanly —
   **not yet audited for runtime behavior**, since major version bumps aren't guaranteed
   typecheck-safe (route config shape, hook signatures). This is the most relevant open item to the
   "integration and harmonization check" requested for Sprint 3 planning.
6. The process gap named in section 4 (a PR can be merged while its source branch still has commits
   arriving) has no structural fix yet.

## 8. Handoff to Sprint 3

Sprint 3 (`SPRINT_ROADMAP_PRE_DEMO.md`) covers A10, A13, A14, A15, A16, A17 — visible integrations,
retention signals, and demo readiness. Its own exit criteria already require Slack + Calendly to be
"demoable live, end to end, with a real (not mocked) test account," which this document doesn't
change or soften.

Given this close-out, Sprint 3 planning should explicitly include an **integration and harmonization
check** covering, at minimum:
- Gap 1 above (A3/A7/A18 live walkthrough) — since A16/A17 build on the same completion-event
  surface, doing this first de-risks both.
- Gap 5 above (`react-router`/Capacitor runtime audit) — before adding more integration surface
  area on top of dependencies that haven't been runtime-verified since their version bumps.
- A cross-check that Sprint 1 and Sprint 2 features don't conflict with each other now that both are
  actually live together on `main` for the first time (e.g., Golden Path's on-demand default
  interacting with the onboarding goal-routing from A7/A3).
- Confirmation that the git-reconciliation incident's root cause (section 4) doesn't recur during
  Sprint 3 — i.e., no PR gets merged until its author confirms all planned commits are pushed.
