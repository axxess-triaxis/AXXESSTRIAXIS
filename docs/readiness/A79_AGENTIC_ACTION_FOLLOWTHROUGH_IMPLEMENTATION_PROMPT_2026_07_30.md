# Claude Code Prompt -- A-79 Agentic Action Follow-through UX

You are working on **AXXESS TRIaxis** by **Triaxis Ventures Private Limited**.

Canonical workspace:

`C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS`

## Operating Model

Codex is product manager and prompt designer. Claude Code is engineer, coder, tester, and sprint executor. Sudipta Koushik Sarmah, Founder and Managing Director of Triaxis Ventures Private Limited, is the HITL authority.

Serve the HITL in this order:

1. CTO and CPO
2. CEO
3. CFO and Head of Fundraising
4. CMO and Head of Sales

## Sprint Name

**A-79: Agentic Action Follow-through UX**

## Planning Provenance

This sprint implements A-79 from `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` and the policy section in `docs/readiness/AGENTIC_INFRASTRUCTURE_PHASE1_POLICY_2026_07_30.md`.

Founder requirement:

Every agentic orchestration that produces a synthesis, insight, optimization recommendation, summary, or informational answer must immediately offer a next-action handoff instead of ending at passive text.

## Objective

Add a two-step action prompt after useful AI/agent outputs:

1. First pop-up: "What do you want me to do with this, {firstName}?"
2. Second action-specific confirmation pop-up.
3. Route or open the correct workspace/surface only after confirmation.

Do not auto-create records without user confirmation. Do not show fake enabled actions for unavailable integrations.

## Non-Negotiables

- Do not redesign the UI.
- Do not rewrite the AI Workspace or Agentic Infrastructure.
- Do not touch uncommitted agent MCP/approval/grant code unless required and safe.
- Do not create records without explicit user confirmation.
- Do not show unavailable integrations as working.
- Do not use demo/placeholder names for `{firstName}`.
- Do not mark A-79 `Yes` until founder live walkthrough and sign-off.

## Read First

- `docs/readiness/AGENTIC_INFRASTRUCTURE_PHASE1_POLICY_2026_07_30.md`
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`
- `src/features/ai-workspace/AIWorkspaceSection.tsx`
- `src/features/ai-workspace/AIReviewInboxPage.tsx`
- `src/components/forms/ConfirmDialog.tsx`
- `src/repositories/workflowActionRepositories.ts`
- `src/features/tasks/TasksSection.tsx`
- `src/features/meetings/MeetingsSection.tsx`
- `src/features/projects/ProjectsSection.tsx`
- `src/features/stakeholders/StakeholdersSection.tsx`
- `src/features/documents/DocumentsSection.tsx`
- `src/features/knowledge-hub/KnowledgeHubSection.tsx`
- `src/features/analytics/AnalyticsSection.tsx`
- existing tests for AI Workspace, Review Inbox, workflow repositories, routing, and analytics

If Claude's previous agentic changes are still uncommitted, stop and document the blocker before editing overlapping files.

## Required UX

### First Pop-up

Prompt:

`What do you want me to do with this, {firstName}?`

Options:

1. Create/edit task
2. Set up/modify/reschedule meeting
3. Create/edit reminder
4. Create/edit program
5. Create/edit project
6. Save stakeholder mapping matrix
7. Store insights in Notion
8. Make analytics dashboard
9. Create slides/PPT
10. Create doc/Notion
11. Create Sheets/Excel
12. Integrate into next query
13. Other -- free text
14. Nothing for now, thank you

`{firstName}` must come from the authenticated user's profile/session. If unavailable, use a neutral fallback such as `there`, never a demo persona.

### Second Pop-up

After the first selection, show an action-specific confirmation:

| First selection | Second-step options |
|---|---|
| Task | Create / Edit |
| Meeting | Create / Cancel / Reschedule |
| Reminder | Create / Edit |
| Program | Create / Edit |
| Project | Create / Edit |
| Stakeholder mapping | Store / Note for now |
| Notion insight | Store / Note for now |
| Analytics dashboard | Create / Edit |
| Slides/PPT | Create / Edit |
| Doc/Notion | Create / Edit |
| Sheets/Excel | Create / Edit |
| Integrate into next query | Yes / No |
| Other | Ask for instruction, then confirm |
| Nothing | Dismiss |

### Routing

After second-step confirmation:

| Action | Destination |
|---|---|
| Task | `/tasks` |
| Meeting | `/meetings` |
| Reminder | `/tasks` or honest pending state if no reminder surface exists |
| Program / Project | `/projects` |
| Stakeholder mapping | `/stakeholders` |
| Analytics dashboard | `/analytics` |
| Slides/PPT | export/slides surface if present, otherwise honest pending state |
| Doc / Notion | `/documents`, `/knowledge`, or Notion integration path depending on action |
| Sheets / Excel | spreadsheet/export surface if present, otherwise honest pending state |
| Integrate into next query | `/ai-workspace` with selected output carried as structured context |

## Implementation Guidance

Preferred new component:

`src/components/agentic/AgenticActionablesPrompt.tsx`

Supporting types:

`src/components/agentic/agenticActionTypes.ts`

Keep the component reusable. It should accept:

- source type: RAG answer, AI review, external agent result, recommendation
- output text / summary
- citations or source IDs if available
- user first name
- tenant/session metadata
- optional disabled-action reasons
- callback for chosen action

Use existing design patterns: compact modal, buttons, no large new design system.

## Where To Attach First

Phase A:

- AI Workspace after a governed answer with text.
- AI Review Inbox after a review is approved or after an AI output is displayed for decision.

Phase B / later:

- dashboard AI recommendations
- external MCP agent results
- analytics insight generation
- Knowledge Hub summaries

## Data and Audit Requirements

- Log the first action selected.
- Log the second confirmation selected.
- Log route/destination chosen.
- Log disabled action attempted, if attempted.
- Do not log sensitive document bodies.
- Include organization ID, user ID, role, module, source output type, and timestamp where available.

Use existing analytics/audit patterns where possible.

## Tests Required

Add tests for:

- first pop-up renders after a non-empty AI answer
- first name personalization uses real user first name
- neutral fallback is used when first name is absent
- all 14 options render
- second pop-up changes based on selected action
- Nothing dismisses without routing or write
- unavailable integration action is disabled with honest reason
- task action routes to `/tasks`
- meeting action routes to `/meetings`
- project/program action routes to `/projects`
- stakeholder action routes to `/stakeholders`
- analytics action routes to `/analytics`
- integrate-into-next-query keeps context in AI Workspace
- selected action is audit/analytics logged

## Verification

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Also run focused tests for:

- agentic prompt component
- AI Workspace
- AI Review Inbox
- routing
- analytics/audit event helpers

## Acceptance Rule

Do not close A-79 after code/test only.

Closure requires:

1. Claude/Codex marks code/test/responded.
2. Founder walks through live deployed product.
3. Issues are logged.
4. Claude/Codex remediates issues.
5. Founder re-checks and signs off.
6. Closeout doc records process, steps, evidence, decisions, and rationale.

## Required Closeout

Create:

`docs/readiness/A79_AGENTIC_ACTION_FOLLOWTHROUGH_CLOSEOUT_2026_07_30.md`

Include:

- objective
- files changed
- UX implemented
- routing map
- disabled/pending states
- tests added
- verification results
- deployment status
- live walkthrough status
- issues found
- remediation status
- founder sign-off status
- remaining risks

## Addendum (Founder-specified, 2026-07-31): Pre-Trigger Logic Gate

Founder-stated, captured verbatim in intent — not yet implemented, not yet verified. This
addendum governs **when** the first pop-up (`What do you want me to do with this, {firstName}?`)
fires, on top of the UX already specified above. Every AI/RAG response passes through this gate
before the pop-up is shown.

### Gate signals

Evaluate all of these on every AI/RAG response:

1. New information? Y/N
2. New stakeholder? Y/N
3. New context? Y/N
4. New task/meeting/project/program mention? Y/N
5. AI pushback severity, 1-5:
   - 1-2 -> does not count as a trigger (ignored)
   - 3-4 -> counts as a trigger; also requires HITL clearance
   - 5 -> counts as a trigger; also requires an explicit warning to HITL

### Gate outcome

- **None of 1-5 trigger** -> no pop-up at all.
- **Any one or more of 1-5 trigger** -> show the first pop-up immediately, per the UX already
  specified in this doc.
- **More than 2 of the 5 signals trigger** (i.e. 3, 4, or 5 of them) -> dismissing the pop-up
  without creating anything requires an **explicit HITL override** action, not a passive close.
- **All 5 signals trigger** -> HITL must compulsorily resolve the pop-up via one of exactly two
  explicit choices: "No action now, save context for later" or "No action required." A silent
  dismiss is not permitted in this case.

### Gate reliability controls

- The gate can misfire (false positives) repeatedly. The pop-up mechanism itself needs a user-level
  **On/Off toggle** so a HITL who finds it noisy can turn the whole gate off.
- For false negatives (gate decides no pop-up is needed, but the HITL wants one anyway), the
  existing always-available manual entry point stays -- but is renamed from **"Create Task from
  Answer"** to **"Create actionable from answer"** (broader scope than tasks alone: any of the 14
  action types from the first pop-up), and must work inline on the same screen without navigating
  away, exactly like the gated pop-up's own flow.

### Scope note

This gate is a pre-filter on *when* the existing two-pop-up UX fires; it does not change the
options, routing, or audit requirements already specified above -- those apply identically whether
the pop-up was triggered by the gate or opened manually via "Create actionable from answer."

## Git

After clean verification:

```bash
git commit -m "feat(agentic): add action follow-through prompt for AI outputs"
```

Push to the canonical branch. Do not force push.

