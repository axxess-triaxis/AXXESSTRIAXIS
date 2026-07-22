# Product Iteration I — Close-Out Report

**Covers:** the full run from `SWOT_Analysis_Batch_1.md` through all 3 sprints of
`SPRINT_ROADMAP_PRE_DEMO.md` (20 actionables total), including the git-reconciliation incident
that delayed Sprint 2's arrival on `main`.
**Purpose:** a single, standalone record of everything shipped, verified, and still open across
this iteration, so whatever comes next starts from ground truth rather than from what individual
commit messages or chat history claimed at the time.
**Status as of this document (corrected 2026-07-21 — see section 5's Phase 3 note):** Sprint 1
(7/7), Sprint 2 (7/7), and Sprint 3 (6/6, including A10/A16/A17 via PR #152) all merged to `main`.
**20/20 actionables merged to `main`.** This line previously read "17/20 merged, 3/20 pending
#152" after #152 had, in fact, already merged — left stale rather than re-verified.

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
on Playwright e2e specs for heavy page components, not Vitest/RTL unit tests). Verification for
these four items is `typecheck` + `lint` (both clean) + full-suite regression (no breaks) + manual
code review. Full detail: `ITERATION_PROGRESS.md`, 2026-07-20 entries.

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
- **No end-to-end browser verification of A3+A7+A18.** Still true as of this document — see
  section 6's Sprint 3 recap for why the local-environment attempt to close this gap didn't finish.
- **A9's second trigger point is unwired.** The micro-survey fires on the first completed AI review
  decision; the golden-path-step trigger the actionable also named is not wired to any call site.
- **A6's "low-risk" definition is coarse** — purely `!humanReviewFlag`.
- **A11's retention step ("second workflow completed within 7 days") is not instrumented.**
- Three additional demo-data leaks were found and fixed opportunistically — see
  `DEMO_DATA_LEAKAGE_AUDIT.md`. Approvals, Stakeholders/CRM, and Analytics/OKRs remain fully
  demo-gated with **no live repository at all** — a separate, multi-sprint initiative, not attempted
  here.

Full detail for every item: `ITERATION_PROGRESS.md`, 2026-07-20/2026-07-21 entries.

## 4. The git-reconciliation incident

This is the part of Product Iteration I that did not come from the feedback/roadmap process itself
— it's a process finding from actually shipping the work, and it's why Sprint 2's arrival on `main`
was delayed by roughly a day past when it was first reported complete.

**What happened:** PR #137 was merged while its source branch still had planned commits arriving.
The merge captured exactly one commit (`5ebf157`, implementing only A1/A2). Six further commits —
the rest of Sprint 1, the Golden Path rationale doc, the demo-data-leakage fixes, and all of
Sprint 2 — were pushed to the same branch afterward and had nowhere to land. For about a day,
`main` genuinely contained 2 of the 20 actionables while the status documents (written and
verified correctly on the branch they lived on) described Sprint 1 and Sprint 2 as fully shipped.

**How it was fixed:** the orphaned branch was rebased onto current `main` as
`reconcile/sprint1-tail-and-sprint2`. All 8 commits applied with zero conflicts. The full
verification suite was re-run from scratch against the rebased result, not assumed to still hold.

**Unrelated problem fixed in the same window:** several `dependabot` PRs (`typescript` → 7.0.2,
`eslint` → 10.7.0, `react-resizable-panels` → 4.12.2) had each merged individually and were never
verified together, breaking `typecheck`/`lint`/`build` on `main` entirely. Fixed in PR #138 by
reverting both `typescript` and `eslint` to their last known-good, mutually-compatible versions,
plus `dependabot.yml` ignore rules so the same combination isn't silently re-proposed.

**What this incident does and doesn't change:** it does not change *what was built* — every item's
implementation and test coverage is exactly what's described in sections 2-3. It does change *when
it became real*. It is a **process gap, not a code gap**, and — see section 6 below — **the
lesson from this incident directly shaped how Sprint 3 was executed**: every Sprint 3 PR was
pushed and verified as its own branch, and merge status was re-checked via `git log`/`gh pr list`
against `origin/main` directly before starting the next phase of work, rather than assumed from
memory of what had been "reported complete."

## 5. Sprint 3 — Visible integrations, retention signals, demo readiness (6/6 merged)

Planned 2026-07-21 (`SPRINT_ROADMAP_PRE_DEMO.md`, PR #148) as 4 phases, after Sprint 1+2 were
confirmed merged. Reordered A15 ahead of A13/A14 — see the roadmap's own rationale.

### Phase 0 — Integration & harmonization check (partially closed, not fully)

- **Live browser walkthrough of A3/A7/A18 — still not done.** Attempted via a local Supabase stack
  (`supabase start`), which surfaced and required fixing two real, pre-existing bugs before it
  could even boot (below) — but the actual walkthrough itself (pick a path → finish onboarding →
  confirm seeded records visible) was never carried out before Sprint 3 code work took priority.
  **This remains the single largest carried-forward gap from both Sprint 2 and Sprint 3.**
- **react-router 7→8 audit — done.** Confirmed via `grep` that `react-router` is never imported
  anywhere in `src/`; the version bump carries zero runtime risk.
- **Capacitor plugin/core version audit — done, found a real mismatch, not fixed.**
  `@capacitor/filesystem@8.1.2`, `@capacitor/haptics@8.0.2`, and `@capacitor/preferences@8.0.1`
  all declare `peerDependencies: { "@capacitor/core": ">=8.0.0" }`, but `@capacitor/core` (and
  `android`/`ios`) remain at `7.6.7` — outside the officially supported range. pnpm installed it
  anyway (peer warnings aren't hard blocks). **Not fixed in this iteration** — flagged to the user
  in chat, no PR filed. Only matters for the native mobile app, not the web beta.
- **Sprint 1+2 cross-check — done, no conflict found.** Traced how Golden Path's
  `knowledge-ingestion` step status (`statusForCount(metrics.ragReadyDocuments)`) relates to A3's
  seeded documents (via the same `ingestTenantDocument` path real uploads use) — no design conflict
  found by static reading. Not confirmed by an actual live walkthrough (see above).
- **Byproduct fixes, not originally scoped, found while pursuing the live walkthrough (PR #149,
  merged):** all 3 local dev seed files (`supabase/seeds/001-003`) were missing `tenant_id` on
  inserts to 7 tables, failing a NOT NULL constraint added by a later migration. More significantly:
  `public.record_enterprise_audit_log()` — the trigger firing on every insert/update to
  `projects`/`tasks`/`meetings`/`organizations` — had a `CASE` expression that unconditionally
  referenced `old.role`/`new.role` (meant only for its separate `users`-table trigger). Postgres
  must resolve every column reference across a `CASE`'s branches before executing any of them, so
  this failed **every write to those 4 tables**, unconditionally. Fixed via a new migration
  (`20260721130000_fix_enterprise_audit_log_trigger.sql`) rather than editing the historical one.
  **Not confirmed whether this second bug was ever live on the actual production/beta Supabase
  project** — no production credentials available to check; flagged, not assumed either way.

### Phase 1 — A15 (merged, PR #150)

Reordered ahead of A13/A14 after discovering `src/services/integrations/pluginRegistry.ts` listed
~20 integrations, every one flagged `demoConnector: true`, rendered as a full "generic catalogue"
in `/integrations` — exactly what the beta report said not to show, and missed by the earlier
three-round demo-data-leakage audit (which focused on tenant data, not this catalogue). Replaced
`demoConnector` with `pilotEnabled` (true only for connectors with real, working connect code) and
split `/integrations` into a "pilot" section and an honest "infrastructure-only, not yet
product-facing" list. The same fix also corrected `pluginRuntime.ts`'s `defaultStatus()`, which had
been reporting every unconfigured connector as `"available"` (implying a customer could use it) —
this fed real admin/platform-readiness logic, not just decorative UI.

### Phase 2 — A13 + A14 (merged, PR #151)

Extended the existing Gmail/Microsoft OAuth architecture (`connectorContract.ts`, `oauthProvider.ts`,
the shared `/api/connectors/oauth/start`+`callback` routes) to Slack and Calendly, rather than
building a parallel system. Writing a Slack token-exchange test surfaced a real bug: Slack returns
OAuth scopes **comma-separated**, but the shared exchange code only split on whitespace
(Google/Microsoft's format) — a successful Slack connection would have stored one comma-joined
string as its only granted scope, making `pluginRuntime.ts`'s `missingScopes` check never clear
even after full authorization. Fixed the split regex to handle both separators.

**Cost constraint applied mid-build:** told explicitly to skip any API requiring payment/subscription/
metering, zero-cost for 6-12 months. Slack's standard OAuth/Web API scopes are free on any
workspace tier — no concern. Calendly's Developer API requires a Standard-plan-or-higher account
for whoever connects it — not available on Calendly's free tier. Decision (explicit, not assumed):
keep Calendly, since the cost falls on the customer's own subscription choice, not on AXXESS — but
surface the caveat directly in the Settings UI (an amber notice on the Calendly connect card), not
just in this document.

**Honest gaps:** no live OAuth verification against real Slack/Calendly credentials (none available
in this environment); the OAuth callback still redirects to `/integrations` regardless of where the
flow started (pre-existing behavior, not introduced here) — connecting from Settings lands back on
`/integrations`, not `/settings`.

### Phase 3 — A10 + A16 + A17 (built, tested, PR'd — **PR #152 merged**)

- **A10 — post-demo satisfaction capture.** Triggered by turning Investor Preview off in Settings —
  the concrete, testable equivalent of "the natural end of a live demo session" in this product's
  actual UX. Found a real sequencing bug while wiring it up: the demo-mode-off toggle hard-navigates
  to `/dashboard` 250ms later, destroying any transient "show now" React state before it renders.
  Fixed with a two-step handoff (a pending flag written before navigation, consumed on the next
  page's mount).
- **A16 — "What's New" panel.** Shows once per release version (not once ever). Its 3 entries are a
  **manually-curated snapshot as of PR #152** citing real Sprint 1/2 work — nothing pulls them
  automatically from `ITERATION_PROGRESS.md`, so **they will silently go stale if not hand-updated
  each release.** Flagged explicitly as a structural gap, not a one-time content task.
- **A17 — completion celebration.** Fires on every workflow completion (unlike A9/A10/A16's
  once-per-scope prompts), wired into the same two completion points A9/A12 already use
  (`TasksSection.tsx` task completion, `AIReviewInboxPage.tsx`'s `decide()` — scoped to
  `decision === "approved"` specifically, since rejecting/escalating isn't a "completion").

**Correction (2026-07-21):** this section previously called PR #152 out as unmerged, applying
section 4's lesson to check `git log`/`origin/main` directly rather than assume. At the time that
check was run, `3d23ddc` (PR #152's merge commit) genuinely was not yet an ancestor of `main`. It
has since merged — confirmed via `git merge-base --is-ancestor 3d23ddc origin/main` against the
canonical GitHub history — and this document's claim was left stale for longer than it should have
been rather than re-verified each time it was read. All of Phase 1-3 (A13/A14/A15/A10/A16/A17) are
now confirmed merged ancestors of `main`. Separately and worth flagging: a `git remote rename`/
migration to a new GitLab origin later in this session pushed a local `main` branch that itself had
never been fast-forwarded past PR #124 — meaning the *GitLab* remote's `main` is currently missing
this entire Sprint 3 completion (and everything after PR #124), even though the original GitHub
history has it. That's a remote-sync gap, not a code-completeness gap — the work described in this
section is real and merged on GitHub; it just hasn't propagated to GitLab yet.

## 6. Final verified state (per PR, most recent first)

| PR | Scope | typecheck | lint | test | build |
|---|---|---|---|---|---|
| (open, this branch) | + 9/12 Postgres wrapper integrations wired, dual Mixpanel+PostHog analytics | clean | clean | 91 files / 270 tests | not re-run this pass (no build-affecting changes) |
| (open, this branch) | Live A3/A7/A18 walkthrough + 4 schema/auth bugs + demo-leak Round 4 | clean | clean | 91 files / 265 tests | not re-run this pass (SQL/auth/UI changes only) |
| #152 (merged) | A10 + A16 + A17 | clean | clean | 91 files / 261 tests | succeeds |
| #151 (merged) | A13 + A14 | clean | clean | 88 files / 253 tests | succeeds |
| #150 (merged) | A15 | clean | clean | 88 files / 249 tests | succeeds |
| #149 (merged) | Supabase seed/trigger fixes | n/a (SQL-only) | n/a | n/a | n/a |
| reconcile branch (merged, #146) | Sprint 1 tail + Sprint 2 | clean | clean | 88 files / 246 tests | succeeds |

Test counts increase monotonically across PRs because each branched from the previous PR's merged
tip (except #152, which branched directly from `main` after #151 merged, same as #150 did).

## 7. All 20 actionables — final status at this document's writing

| # | ID | Item | Status |
|---|---|---|---|
| 1 | A1 | Golden Path opt-in | ✅ merged |
| 2 | A2 | Blocked/locked steps explain themselves | ✅ merged |
| 3 | A3 | Guided workspace with real seeded data | ✅ merged; live e2e walkthrough done 2026-07-21 (unmerged branch, see below) |
| 4 | A4 | AI citations + rationale | ✅ merged |
| 5 | A5 | Loading/timeout/retry on AI ops | ✅ merged |
| 6 | A6 | Bulk/quick-approve in Review Inbox | ✅ merged |
| 7 | A7 | 3 outcome-first onboarding paths | ✅ merged; live e2e walkthrough done 2026-07-21 (unmerged branch, see below) |
| 8 | A8 | Empty states with one CTA | ✅ merged |
| 9 | A9 | In-context micro-survey | ✅ merged (1 of 2 triggers wired) |
| 10 | A10 | Post-demo satisfaction capture | ✅ merged (PR #152) |
| 11 | A11 | Funnel analytics events | ✅ merged |
| 12 | A12 | Feedback at workflow completion | ✅ merged |
| 13 | A13 | Slack quick-connect | ✅ merged (no live OAuth verification) |
| 14 | A14 | Calendly quick-connect | ✅ merged (no live OAuth verification; customer-side cost caveat) |
| 15 | A15 | Cap integrations surface to reality | ✅ merged |
| 16 | A16 | "What's New" panel | ✅ merged (PR #152; content will go stale without manual upkeep) |
| 17 | A17 | Completion celebration | ✅ merged (PR #152) |
| 18 | A18 | Fewer setup decisions before first AI use | ✅ merged; live e2e walkthrough done 2026-07-21 (unmerged branch, see below) |
| 19 | A19 | Reliability expectation-setter copy | ✅ merged |
| 20 | A20 | Role-appropriate default landing pages | ✅ merged |

**20/20 merged to `main` (GitHub). Corrected 2026-07-21 — this line previously read "17/20... pending
merge of #152" after #152 had, in fact, already merged; left stale rather than re-checked. See the
correction note under Phase 3 (section 5) for the same fix and the separate GitLab-sync caveat.**
Additionally, A3/A7/A18's live end-to-end browser walkthrough (the thing distinguishing "merged" from
"actually verified working," per this document's own section 4 lesson) is now done — see
`ITERATION_PROGRESS.md`'s 2026-07-21 "First genuine live browser walkthrough" entry — but sits on
branch `fix/live-tenant-onboarding-and-rag-walkthrough`, not yet merged to `main`, holding on git
instructions rather than a code gap.

## 8. Consolidated honest-gap register

1. ~~**No end-to-end browser verification of A3+A7+A18 (onboarding trio).**~~ **Closed 2026-07-21.**
   Carried from Sprint 2 through all of Sprint 3 without closing; finally done — see
   `ITERATION_PROGRESS.md`'s 2026-07-21 entry ("First genuine live browser walkthrough..."). The
   walkthrough surfaced and fixed 4 real bugs that had been silently blocking this exact flow (a
   fake org-id placeholder routing every new signup into a broken workspace, two Supabase
   permission-grant gaps, and a schema-level `tenant_id` NOT NULL default missing on 11 tables) plus
   4 more demo-data-leakage instances in `AIWorkspaceSection.tsx` (see gap #11 below and
   `DEMO_DATA_LEAKAGE_AUDIT.md`'s Round 4). This is exactly why this gap was flagged highest-priority
   — a live walkthrough is the only verification method that actually catches bugs like these; unit
   tests and code review across three prior sprints did not.
2. **A9's golden-path-step trigger unwired** (second of two named trigger points).
3. **A8/A5/A19/A12 lack dedicated unit tests** (structural gap in page-component testing generally).
4. **Approvals, Stakeholders/CRM, and Analytics/OKRs remain fully demo-gated with no live
   repository** — out of scope for hygiene work; a separate, multi-sprint initiative.
5. **Capacitor plugin/core version mismatch** (`filesystem`/`haptics`/`preferences` @8.x vs.
   `core`/`android`/`ios` @7.6.7) — found, not fixed. Mobile-app-only; doesn't affect the web beta.
6. **The git-reconciliation incident's root process gap has no structural fix** — nothing in this
   repo prevents a PR from being merged while its source branch still has commits arriving. Sprint 3
   avoided a repeat by checking merge status directly against `origin/main` before each phase,
   which is a practice, not a guardrail.
7. ~~**PR #152 (A10/A16/A17) is unmerged**~~ **Resolved — was already merged, this line was stale.**
   Confirmed 2026-07-21 via `git merge-base --is-ancestor 3d23ddc origin/main` against the canonical
   GitHub history. This document itself had been asserting the older, incorrect state for longer
   than it should have — a live-checked claim that was never re-verified after the underlying fact
   changed. See the correction note under section 5's Phase 3.
8. **WhatsNewPanel's content is a manually-curated, one-time snapshot** — no mechanism ties it to
   `ITERATION_PROGRESS.md`, so it will read as stale within a release or two if untouched.
9. **Calendly (A14) has a real cost caveat for the customer** — surfaced in the Settings UI, but
   worth remembering when planning any customer-facing rollout communication.
10. **Whether the audit-trigger bug fixed in PR #149 was ever live on the actual production/beta
    Supabase project is unconfirmed** — no production credentials available to check from this
    environment.
11. **Whether the `tenant_id` NOT NULL default gap (fixed 2026-07-21 for `organizations` and 10
    other tables) ever affected the real production/beta Supabase project is unconfirmed** — same
    caveat as gap #10, and arguably more likely to be live in production too, since (unlike the
    service_role/authenticated grants gap fixed alongside it, which is specific to a bare local
    Supabase CLI instance vs. Cloud's automatic bootstrapping) this is a schema/application-logic
    gap, not an environment-provisioning difference. See `ITERATION_PROGRESS.md`'s 2026-07-21 entry.
12. ~~**A fifth demo-data-leakage instance found, not fixed:**~~ **Resolved 2026-07-21 (deleted).**
    `src/features/knowledge/KnowledgeSection.tsx` was fully hardcoded illustrative content with
    zero demo-mode gating, distinct from the correctly-gated `KnowledgeHubSection.tsx` (a naming
    collision that let it slip past 3 prior audit rounds). Confirmed unreachable — never imported
    or routed anywhere — and confirmed via `git log --follow` to be superseded MVP-era scaffolding
    (predates `KnowledgeHubSection.tsx`, never developed further after it existed), so deleted
    rather than gated. See `DEMO_DATA_LEAKAGE_AUDIT.md`'s Round 4.
13. **GitLab's `main` is 53 commits behind the true GitHub `main`.** During a git-hosting migration
    (GitHub account suspended mid-session — `git fetch` returned "Your account is suspended"), the
    original `origin` remote was renamed to `github` and a new GitLab remote added as `origin`. The
    local `main` branch itself, however, had never been fast-forwarded past PR #124 (fetching updates
    a remote-tracking ref, not the local branch), so `git push -u origin --all` pushed that stale
    `main` to GitLab — missing PR #150, #151, #152, #153, and ~24 dependabot merges. Discovered
    2026-07-21 while re-verifying PR #152's merge status for this document. Not yet fixed: holding
    on git operations per current instruction, since a second agent (Codex) is concurrently
    committing Sprint 0-32 work to the same GitLab remote and a fast-forward should be coordinated,
    not done unilaterally mid-flight.

## 9. What remains before Product Iteration I can be called fully closed

1. ~~Merge PR #152 (or explicitly decide to hold it).~~ — **already merged**, this item was stale (gap #7).
2. ~~Do the actual live browser walkthrough of A3/A7/A18~~ — **done 2026-07-21**, see gap #1. Sits on
   branch `fix/live-tenant-onboarding-and-rag-walkthrough`, not yet merged to `main` — holding on
   git instructions, not a code gap.
3. Decide whether to address the Capacitor version mismatch (gap #5) before any native mobile
   release, or explicitly accept it as out of scope for the web beta.
4. Confirm (with production Supabase credentials) whether gaps #10 and #11 need remediation on the
   live project, separately from the local-dev fixes already made.
5. ~~Decide whether/when to remove or wire up the dead `KnowledgeSection.tsx` page~~ — **done**, deleted (gap #12).
6. Fast-forward GitLab's `main` to match the true GitHub history (gap #13) — coordinate with Codex
   first, since it's concurrently committing to the same GitLab remote.
7. Merge `fix/live-tenant-onboarding-and-rag-walkthrough` itself (item #2 above, plus 9/12 Postgres
   wrapper integrations and dual Mixpanel/PostHog analytics wiring built on top of it) once git
   operations are unblocked.

## 10. Possible scope for a next iteration ("Phase 2"), not started, not scoped in detail here

- Real Approvals/Stakeholders/CRM/Analytics repositories (gap #4) — the largest deferred item
  across the entire iteration, named repeatedly and consistently out of scope every time it
  surfaced.
- A mechanism to keep `WhatsNewPanel`'s content current automatically (gap #8), rather than manual
  per-release upkeep.
- Wiring A9's second trigger point (gap #2).
- Whatever the next round of beta feedback (a Batch 2 survey, presumably) surfaces as the next
  SWOT-derived priority list — this document's own section 1 process (feedback → SWOT →
  actionables → roadmap → checklist → close-out) is the template to repeat, not a one-time exercise.
