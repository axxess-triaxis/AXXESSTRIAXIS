# A-79 Agentic Action Follow-through Roadmap and Checklist

Date: 2026-07-30  
Status: planned, not implemented  
Related: A-79, A-78

## Objective

Turn AI/agent outputs into executable workflows. AXXESS should not stop at "here is an insight." It should ask the user what to do next, confirm the chosen action, and move the user to the correct workspace or creation flow.

## Roadmap

### Sprint A79-1 -- Prompt Shell and AI Workspace Attachment

Goal: implement the reusable two-step prompt and attach it to AI Workspace answers.

Deliverables:

- `AgenticActionablesPrompt` component.
- action type definitions and routing map.
- first-step modal with 14 options.
- second-step modal with action-specific choices.
- first-name personalization.
- disabled states for unavailable integrations.
- AI Workspace attachment after non-empty answer.
- analytics/audit event for selected action.
- tests.

Exit criteria:

- user sees prompt after a real AI/RAG answer
- no prompt for empty/no-answer state
- task/meeting/project/stakeholder/analytics routing works
- unavailable actions are honest

### Sprint A79-2 -- Review Inbox and Workflow Creation Integration

Goal: attach the same prompt to AI Review Inbox outputs and use existing creation paths where safe.

Deliverables:

- AI Review Inbox integration.
- create/edit task routing.
- meeting create/reschedule routing or honest pending state.
- project/program routing.
- stakeholder matrix/note routing.
- "Integrate into next query" context carry-forward.
- tests.

Exit criteria:

- approved/reviewed AI output can be converted into a next action
- no duplicate/conflicting workflow buttons
- user confirmation happens before every state-changing action

### Sprint A79-3 -- External Integration Actions and Live Walkthrough

Goal: handle Notion, Sheets/Excel, Slides/PPT, dashboard generation, and live founder acceptance.

Deliverables:

- Notion action disabled/enabled based on credential readiness.
- sheets/slides/doc actions routed to available surface or honest pending state.
- analytics dashboard action routed to Analytics & Reports.
- live walkthrough checklist.
- remediation loop.
- final closeout.

Exit criteria:

- founder live walkthrough completed
- issues logged and remediated
- founder sign-off recorded
- A-79 eligible for closure

## Routing Matrix

| Option | Second step | Destination | Write allowed immediately? | Notes |
|---|---|---|---|---|
| Create/edit task | Create / Edit | `/tasks` | only after confirmation | Prefer existing task creation flow. |
| Meeting | Create / Cancel / Reschedule | `/meetings` | only after confirmation | If reschedule/cancel not built, honest pending state. |
| Reminder | Create / Edit | `/tasks` or reminder surface | only after confirmation | Do not invent reminder backend if absent. |
| Program | Create / Edit | `/projects` | only after confirmation | Use program path if present; otherwise project/program section. |
| Project | Create / Edit | `/projects` | only after confirmation | Use existing project creation. |
| Stakeholder matrix | Store / Note for now | `/stakeholders` | only after confirmation | Store as stakeholder note/matrix if supported. |
| Notion | Store / Note for now | Notion integration / pending | only if connected | Disabled if Notion credentials absent. |
| Analytics dashboard | Create / Edit | `/analytics` | only after confirmation | If dashboard builder absent, honest pending state. |
| Slides/PPT | Create / Edit | export/slides surface / pending | only after confirmation | No fake export. |
| Doc/Notion | Create / Edit | `/documents` or Notion / pending | only after confirmation | Choose based on integration readiness. |
| Sheets/Excel | Create / Edit | sheet/export surface / pending | only after confirmation | Disabled/pending if not built. |
| Next query | Yes / No | `/ai-workspace` | no record write | Carry structured context. |
| Other | free text + confirm | chosen by user | only after confirmation | Ask what they want. |
| Nothing | dismiss | none | no | Treat as clean close. |

## Master Checklist

| Item | Status | Notes |
|---|---|---|
| Reusable prompt component created | Not started | |
| First-step 14-option modal built | Not started | |
| Second-step confirmation modal built | Not started | |
| First-name personalization implemented | Not started | |
| Neutral fallback implemented | Not started | |
| Routing map created | Not started | |
| Disabled states for unavailable integrations | Not started | |
| AI Workspace integration | Not started | |
| AI Review Inbox integration | Not started | |
| Task route/action tested | Not started | |
| Meeting route/action tested | Not started | |
| Project/program route/action tested | Not started | |
| Stakeholder route/action tested | Not started | |
| Analytics route/action tested | Not started | |
| Notion/sheets/slides/doc pending states | Not started | |
| Integrate into next query tested | Not started | |
| Audit/analytics event logged | Not started | |
| Typecheck clean | Not started | |
| Lint clean | Not started | |
| Tests clean | Not started | |
| Build clean | Not started | |
| Deployed | Not started | |
| Founder walkthrough | Not started | |
| Issues logged | Not started | |
| Remediation completed | Not started | |
| Founder sign-off | Not started | |
| Closeout doc complete | Not started | |

