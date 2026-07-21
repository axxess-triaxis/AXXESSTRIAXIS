# Pre-Demo Actionables — 20 Items from the Batch 1 SWOT

**Source:** `SWOT_Analysis_Batch_1.md`, `Enterprise_Beta_Feedback_Batch_1.md`
**Purpose:** Immediately executable changes, scoped to ship before the next demo/release, that
improve customer ease, experience, retention, feedback quality, and execution at the customer end.
**Date:** 2026-07-20
**Status legend:** ✅ Implemented · 🔜 Planned (see `SPRINT_ROADMAP_PRE_DEMO.md` for sequencing)

Each item is tagged with the SWOT dimension(s) it primarily serves and an effort estimate
(S/M/L). Where a specific code location was identified during scoping, it's noted so
implementation can start without re-discovery.

---

## Tier 1 — Highest evidence, lowest effort

1. ✅ **Make Golden Path opt-in, not forced.** *(Ease, Experience — S)* Every non-promoter in the
   beta cited "unclear value" alongside "slow/unreliable" as blockers, and free-text feedback
   specifically flagged onboarding friction. The golden path (`src/services/workflows/
   enterpriseGoldenPath.ts`, rendered via `EnterpriseWorkflowJourney.tsx`) was always-on with no
   opt-out. **Implemented:** added `GoldenPathDisplayMode` ("guided" | "on-demand"), defaulting to
   on-demand (collapsed summary card), with a persisted per-user preference
   (`useGoldenPathDisplayMode.ts`) so high-discretion users can still opt into the full guided view.
2. ✅ **Explain "blocked" and "locked" states inline.** *(Ease — S)* The journey previously showed a
   bare "Blocked" badge with no next action. **Implemented:** added a `blockedReason` field
   populated for every blockable step (team provisioning, grounded question, workflow action), and
   a "Requires {role}" hint for role-locked steps, both rendered inline under the step title.
3. ✅ **Add a guided demo workspace with realistic seeded data.** *(Experience — M)* Directly
   targets the P0 "unclear value" blocker — lets a new user see value before uploading their own
   documents. **Implemented (with A7/A18, shipped together per the roadmap):** a new
   `/api/onboarding/seed-sample-data` route creates **real, persisted** records via the live
   `projectsRepository`/`tasksRepository`/`meetingsRepository`/document-ingestion path — not
   fabricated demo content. Every seeded record is tagged `sample-data` and titled with a
   `Sample:` prefix so it's identifiable and removable, but it's genuinely live: editable,
   deletable, and indistinguishable from the customer's own data to every other part of the app.
   Deliberately scoped to only the 3 modules with real repository backing (documents/AI,
   projects/tasks, meetings) — not Approvals/Stakeholders/Analytics, which
   `DEMO_DATA_LEAKAGE_AUDIT.md` confirmed have no live repository at all.
4. ✅ **Add source citations + a one-line rationale under every AI output.** *(Experience,
   Execution — M)* P0 explainability gap; 40% of respondents flagged AI output quality.
   **Implemented:** added a genuine, retrieval-derived `rationale` field to `RagAnswer`
   (`governedRag.ts`, `tenantRagWorkflow.ts` — computed from actual matched sources, e.g.
   "Synthesized from 3 governed sources (top match: ..., 91% relevance)", and honestly reports "no
   source matched" when there are zero), rendered under the answer bubble in `AIWorkspaceSection.tsx`
   alongside the existing Sources Used panel. Tested in `governedRag.test.ts` and
   `tenantRagWorkflow.test.ts`.
5. ✅ **Add visible loading/progress + timeout-with-retry states on long AI operations.**
   *(Experience — S)* Doesn't fix backend latency, but stops "slow" from reading as "broken."
   **Implemented:** `AIWorkspaceSection.tsx`'s `askGovernedQuestion` now aborts after 20s via
   `AbortController`, shows an inline "Generating governed answer..." indicator while pending, and
   surfaces a distinct timeout message with a one-click Retry action (reusing the preserved input).
6. ✅ **Add a bulk/quick-approve action in the AI Review Inbox for low-risk items.** *(Ease,
   Execution — M)* P0 workflow friction; 35% flagged "too many steps or approvals."
   **Implemented:** `AIReviewInboxPage.tsx` now shows an "Approve all N low-risk items" bar when
   there are pending reviews with `humanReviewFlag: false` (no mandatory human review); each item
   is still approved via its own API call, so per-item audit logging is unchanged — bulk only
   removes the repeated clicking, not the audit trail. While implementing this, found and fixed
   two more demo-data leaks in the same files: `reviewInbox.ts`'s `listAiReviewInbox` showed
   fabricated review items whenever the real result was empty (not just when Supabase was
   unconfigured), and `AIReviewInboxPage.tsx` treated `NEXT_PUBLIC_AXXESS_AUTH_SHELL=true` (an
   auth-facade flag explicitly required in real beta deployments per `BETA_TESTING.md`) as
   equivalent to demo mode, injecting a fake pending review for every real beta customer with a
   clean inbox. Both fixed to use `isDemoModeEnabled()` correctly. See `DEMO_DATA_LEAKAGE_AUDIT.md`.
7. ✅ **Replace the single generic onboarding flow with 3 outcome-first paths.** *(Ease,
   Experience — M)* Knowledge/AI decision support, workflow+approvals, stakeholder/CRM — matches
   the original report's section 11 recommendation. **Implemented:** an optional "What do you
   want to try first?" step added to the existing onboarding flow (not a new wizard step —
   folded into the existing `start` screen to avoid adding friction) with 3 paths:
   *Knowledge & AI decision support*, *Workflow & task execution*, *Meetings & institutional
   coordination*. The third path was changed from "stakeholder/CRM" to "meetings/coordination"
   since Stakeholders/CRM has no live repository (see A3 note and
   `DEMO_DATA_LEAKAGE_AUDIT.md`) — routing a new user into a module that can't persist their
   choice would recreate the exact problem this whole effort just fixed. Each path routes into
   its seeded workspace (A3) and its most relevant page on completion.
8. ✅ **Add empty-states with one clear CTA on every major page.** *(Ease, Experience — S)*
   Dashboard/Projects/Tasks/Knowledge Hub currently go sparse for brand-new tenants. **Implemented:**
   `DashboardSection.tsx` (Project Health Monitor), `ProjectsSection.tsx`, and `TasksSection.tsx` now
   render the existing `EmptyState` component with a "Create your first..." CTA when there's no real
   data yet; Knowledge Hub already had this pattern.

## Tier 2 — Feedback loop

9. ✅ **Add an in-context 1-click micro-survey after the first completed AI review decision or
   golden-path step.** *(Feedback — M)* Closes the report's own flagged gap: no telemetry linkage
   between survey sentiment and actual usage. **Implemented:** `useMicroSurveyPrompt.ts`
   (localStorage-backed, shows at most once ever, mirrors the `useGoldenPathDisplayMode.ts`
   pattern) + `MicroSurveyPrompt.tsx` (1-5 one-click rating, dismissible), triggered on the first
   successful AI review decision in `AIReviewInboxPage.tsx`. Fires `micro_survey_shown` and
   `micro_survey_responded` analytics events with the score and trigger source. The golden-path-step
   trigger point is not yet wired — only the AI-review-decision trigger, since that's the surface
   touched this pass; tracked as a follow-up. Tested in `useMicroSurveyPrompt.test.tsx`.
10. 🔜 **Add a lightweight post-demo satisfaction capture**, distinct from the existing
    `BetaFeedbackButton`. *(Feedback — S)* A single question at the end of a live demo session.
11. ✅ **Wire "time to first value" and "onboarding completion rate" events into the existing
    Mixpanel-ready analytics.** *(Feedback, Execution — M)* Analytics scaffolding already exists —
    mostly event-naming and instrumentation. **Implemented:** audited which of the report's
    section 13.2 funnel events were defined-but-never-fired. `sign_up_completed`,
    `organization_created`, and `onboarding_step_completed` were already wired; added the three
    that weren't: `rag_query_submitted` (first AI task, fired in `AIWorkspaceSection.tsx` on a
    successful governed answer), `ai_answer_reviewed` (first review, fired in
    `AIReviewInboxPage.tsx` on any recorded decision), and `workflow_action_completed` (task/
    workflow action created, fired in `TasksSection.tsx` when a task is marked complete,
    alongside the existing `task_status_changed`). Elapsed "time to first value" is derivable
    downstream from these events' timestamps relative to `sign_up_completed` — not computed
    client-side.
12. ✅ **Surface the existing `BetaFeedbackButton` at the end of each completed workflow**, not
    just persistently floating. *(Feedback — S)* Catch feedback at the moment of an actual outcome.
    **Implemented:** `TasksSection.tsx` now shows a one-time-per-session dismissible prompt
    ("Task completed! Got a moment to share feedback?") the first time a task is marked complete,
    opening the existing `BetaFeedbackModal` — the persistent floating button remains unchanged.

## Tier 3 — Convert integrations work into visible customer value

13. 🔜 **Ship a "Connect Slack" quick-connect in Settings** using the `slack_wrapper` already
    enabled (see `ITERATION_PROGRESS.md`, 2026-07-20 entry). *(Ease, Experience — M)*
14. 🔜 **Ship a "Connect Calendly" quick-connect** the same way. *(Ease, Experience — M)* Most
    directly evidenced by respondent free-text requests.
15. 🔜 **Cap the integrations surface to just these 2 for the next demo**, not all 12 wrappers.
    *(Execution — S)* Matches the report's own guidance: "2-3 integrations tied to pilot
    workflows, not a generic catalogue."

## Tier 4 — Retention and perceived momentum

16. 🔜 **Add a "What's New" panel at login.** *(Retention — S)* Even a 3-line changelog gives
    demo/pilot users a sense of active development between sessions.
17. 🔜 **Add a completion celebration/confirmation on finishing any workflow end-to-end.**
    *(Retention, Experience — S)* Reinforces the knowledge → AI → review → action → audit loop the
    SWOT identifies as the core differentiator.
18. ✅ **Reduce required setup decisions before first AI interaction.** *(Ease — M)* Let a solo
    evaluator ask a grounded question before inviting a team, where possible. **Implemented:**
    found that `provisionTenantForUser` (the onboarding backend) already treated department/
    workspace names as optional and skipped them cleanly when blank — the only thing forcing a
    user to fill them in was the frontend's `isOnboardingComplete()` check. Removed that
    artificial requirement; department/workspace name fields are now genuinely optional in the
    UI, matching what the backend always supported. This directly removes 2 of the required
    setup decisions before a user can reach their first AI interaction.

## Tier 5 — Execution-at-customer-end hygiene

19. ✅ **Add a visible reliability/expectation-setting indicator during AI generation.**
    *(Experience — S)* E.g. "usually takes ~8 seconds" — cheap perceived-reliability fix while real
    p50/p95 instrumentation (already P0 in the 30/60/90 plan) is in progress. **Implemented:**
    shipped together with A5 in `AIWorkspaceSection.tsx` ("usually takes 5-8 seconds" copy shown
    while a query is pending).
20. ✅ **Add role-appropriate default landing pages.** *(Ease — S)* An Employee currently can land
    on an Executive Dashboard mostly composed of locked actions. **Implemented:** added
    `defaultSectionForRole()` in `src/app/routing/routes.ts` and wired a one-time redirect in
    `App.tsx` so Employees landing on the generic post-login entry point route to Tasks & Workflow
    instead of the Dashboard; all other roles are unaffected.

---

## How this maps back to evidence

Every item above traces to a specific SWOT weakness/opportunity or a specific beta-feedback
percentage in `Enterprise_Beta_Feedback_Batch_1.md` / `SWOT_Analysis_Batch_1.md` — none are
speculative additions. See `SPRINT_ROADMAP_PRE_DEMO.md` for sequencing, dependencies, acceptance
criteria, and audit trail for all 20 items.
