# A-79: Agentic Action Follow-through UX — Closeout (2026-07-31)

## Objective

Implement the founder's A-79 spec (`docs/readiness/A79_AGENTIC_ACTION_FOLLOWTHROUGH_IMPLEMENTATION_PROMPT_2026_07_30.md`,
plus this session's logic-gate addendum): every useful AI/RAG output offers an immediate two-step
action follow-through instead of ending at passive text, gated by a 5-signal heuristic that decides
when it auto-fires, with a manual fallback that always works regardless of the gate.

## Files Changed

**New:**
- `src/components/agentic/agenticActionTypes.ts` — 14 first-step options, per-action second-step
  option sets, routing table, honest-unavailable copy, gate/prompt/resolution types.
- `src/components/agentic/AgenticActionablesPrompt.tsx` — the two-step modal (extends
  `ConfirmDialog.tsx`'s chrome).
- `src/services/agentic/actionableGate.ts` — heuristic gate (`evaluateActionableGate`).
- `src/services/agentic/agenticDraftHandoff.ts` — sessionStorage draft write/read.
- `src/services/agentic/agenticGateToggle.ts` — localStorage on/off toggle.
- Tests: `AgenticActionablesPrompt.test.tsx`, `actionableGate.test.ts`,
  `agenticDraftHandoff.test.ts`, `agenticGateToggle.test.ts`,
  `src/features/tasks/TasksSection.agentic.test.tsx`.

**Modified:**
- `src/features/ai-workspace/AIWorkspaceSection.tsx` — dead `<a href="/tasks">Create task from
  answer</a>` replaced with a real "Create actionable from answer" button; gate evaluated after
  every successful governed answer; resolution handler wired.
- `src/features/ai-workspace/AIReviewInboxPage.tsx` — same prompt wired after a successful review
  approval.
- `src/services/analytics/types.ts` — 8 new `AnalyticsEventName` entries.
- `src/features/tasks/TasksSection.tsx`, `src/features/meetings/MeetingsSection.tsx`,
  `src/features/projects/ProjectsSection.tsx` — draft pre-fill on mount, dismissible banner.
- `src/features/stakeholders/StakeholdersSection.tsx` — "Save as note" draft card (not a
  pre-filled Contact form).
- `src/app/api/stakeholders/notes/route.ts` — new `POST` handler.
- `src/features/settings/SettingsSection.tsx` — new "Agentic action prompts" toggle panel.

## UX Implemented

Two-step pop-up: `What do you want me to do with this, {firstName}?` (14 options) → action-specific
second confirmation (Create/Edit, Create/Cancel/Reschedule, Store/Note for now, Yes/No, or a free-text
"Other"). `{firstName}` derived from the real authenticated user's `displayName`, falling back to the
neutral `"there"` — never a demo persona. "Nothing for now, thank you" dismisses immediately with no
write and no navigation.

## Logic Gate (Founder Addendum)

5 signals evaluated per answer (new information, new stakeholder, new context, new
task/meeting/project/program mention, AI-pushback severity 1-5) via **heuristics** — keyword/regex
matching plus existing RAG-response fields (citations, confidence, `humanReviewRequired`) — not a
dedicated LLM call, to avoid doubling AI spend/latency on every answer (explicit tradeoff, confirmed
with the founder this session). None trigger → no pop-up. Any trigger → pop-up fires. More than 2 of
5 → dismissing requires an explicit override (no passive close). All 5 → compulsory two-choice
resolution ("No action now, save context for later" / "No action required"), enforced in
`AgenticActionablesPrompt.tsx`. A user-level on/off toggle (Settings → Profile → "Agentic action
prompts", localStorage-backed like the existing Investor Preview toggle) lets a HITL silence a noisy
gate; the manual "Create actionable from answer" button is unaffected by the toggle either way.

## Routing Map

| Action | Destination | Notes |
|---|---|---|
| Task | `/tasks` | Draft pre-fills title/description on the existing New Task form |
| Reminder | `/tasks` | No dedicated Reminder type exists; opens as a Task tagged `reminder`, disclosed in the banner |
| Meeting | `/meetings` | Pre-fills title/agenda; date/time and attendees still need a real value |
| Program | `/projects` | No dedicated Program creation form exists; opens as a Project, disclosed in the banner |
| Project | `/projects` | Pre-fills name/description |
| Stakeholder mapping | `/stakeholders` | "Save as note" card, not a Contact — POSTs to the new notes route |
| Analytics dashboard | `/analytics` | Existing honest "not wired to live tenant data yet" `EmptyState` stands unchanged |
| Doc/Notion | `/documents` | Browse existing content; no real AI-driven doc creation exists |
| Integrate into next query | stays on `/ai-workspace` | Appends the current answer into the next question's input, no navigation |
| Notion insight, Slides/PPT, Sheets/Excel | none | Resolved entirely in-modal with an honest disabled reason |
| Other | none | Free text captured and logged, not automated |

## Disabled / Pending States

Notion insight, Slides/PPT, and Sheets/Excel show a visible (not tooltip-only) reason directly under
the option in the pop-up and never navigate or write — confirmed via direct code research that none
of these have a real creation flow anywhere in this codebase. Selecting one logs
`agentic_disabled_action_attempted` per the spec's audit requirement.

## Tests Added

23 new tests across the 4 new agentic modules (component + gate + draft handoff + toggle), all
passing. 1 new end-to-end test file (`TasksSection.agentic.test.tsx`, 3 tests) proves the draft
actually pre-fills a real section's real form. 1 new test added to the existing
`StakeholdersSection.test.tsx` for the "Save as note" flow. Meetings/Projects sections were not
given separate full-render test files this pass — the shared underlying mechanism
(`agenticDraftHandoff.ts`) is unit-tested directly and proven end-to-end once via Tasks; this is a
deliberate scope reduction, not an oversight, and is flagged here per this repo's evidence
discipline rather than silently omitted.

**Bug found and fixed while writing these tests** (not present before this pass, caught before
shipping): `readAndClearAgenticDraft` originally deleted the sessionStorage draft on any type
mismatch, which silently broke the `readAndClearAgenticDraft("task") ?? readAndClearAgenticDraft("reminder")`
and equivalent Project/Program fallback chains — a "reminder" draft would never actually reach the
Tasks form. Fixed at the source in `agenticDraftHandoff.ts`.

## Verification Results (exact commands, exact results)

- `pnpm run typecheck` — exit 0.
- `pnpm --dir apps/mobile run typecheck` — exit 0.
- `pnpm run lint` (`eslint . --max-warnings=0`) — exit 0.
- `pnpm run test` — **853/853 tests passed, 193/193 test files**.
- `pnpm run build` — exit 0.

## Deployment Status

**Not yet deployed.** Per standing repo discipline, awaiting explicit confirmation before push/deploy.

## Live Walkthrough Status

**Not yet performed — HITL-only, per this doc's own Acceptance Rule.** Cannot be self-certified.
Founder still needs to: exercise the gate live at each trigger threshold; confirm the manual
fallback works with the toggle off; confirm the Program→"opens as Project" and Reminder→"opens as
Task" caveats read as acceptable in practice; confirm routing/pre-fill/no-premature-write for each
destination in the live app.

## Issues Found / Remediation Status

- The `readAndClearAgenticDraft` type-mismatch deletion bug (above) — found and fixed within this
  same pass, before shipping.
- Two genuinely missing capabilities (dedicated Program creation form, dedicated Reminder entity)
  were confirmed via direct code research, not assumed — handled with explicit, disclosed
  workarounds (route to the nearest real equivalent, state the gap in the banner) rather than
  silently pretending they exist.

## Founder Sign-off Status

**Pending.** Per the spec's Acceptance Rule, A-79 cannot be marked `Yes` until the founder's live
walkthrough, any resulting remediation, and explicit sign-off are complete.

## Remaining Risks

- Heuristic gate signals will sometimes misjudge an answer (false positive or negative) — explicit,
  accepted tradeoff; the on/off toggle and always-available manual fallback are the intended
  mitigations, not a promise of perfect detection.
- Meetings/Projects sections lack dedicated full-render regression coverage for the pre-fill path
  (see Tests Added) — a reasonable fast-follow if this area sees frequent change.
- OpenRouter/other-provider severity thresholds (3-4 = HITL clearance, 5 = explicit warning) are a
  new, purpose-built 1-5 scale with no precedent elsewhere in this codebase — worth reconciling with
  the existing binary `criticality` (agent tools) and 4-level `priority` (approvals/tasks) vocabularies
  in a later pass if the founder wants one unified severity language across the product.
